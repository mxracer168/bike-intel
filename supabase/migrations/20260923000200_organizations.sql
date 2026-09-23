-- =============================================================================
-- Organizations, membership, agreements (consent) and locations.
--
-- Visibility:
--   organization            supplier rows: global | retailer rows: private
--   membership              private (the member and their organization)
--   organization_agreement  private, append-only
--   location                private
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organization
-- -----------------------------------------------------------------------------
create table public.organization (
  id                    uuid primary key default gen_random_uuid(),
  kind                  text not null check (kind in ('retailer', 'supplier')),
  name                  text not null,
  legal_name            text,
  -- Industry this organization belongs to; scopes industry intelligence and
  -- category taxonomy. Bicycle first, others later.
  industry              text not null default 'bicycle',
  default_country       public.country_code,
  website               text,
  primary_contact_name  text,
  primary_contact_email text,
  primary_contact_phone text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city          text,
  billing_region        text,
  billing_postal_code   text,
  billing_country       public.country_code,
  -- Supplier-controlled public page content (logo, description, pitch...).
  public_profile        jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Lets other tables require that a referenced organization is a specific kind.
  unique (id, kind)
);

create trigger organization_set_updated_at
  before update on public.organization
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- membership: Supabase Auth user <-> organization
-- -----------------------------------------------------------------------------
create table public.membership (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null default 'owner'
                  check (role in ('owner', 'admin', 'member')),
  status          text not null default 'active'
                  check (status in ('active', 'removed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index membership_user_idx on public.membership (user_id) where status = 'active';

create trigger membership_set_updated_at
  before update on public.membership
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tenant helper functions used by RLS policies.
-- SECURITY DEFINER so they can read membership without recursing through
-- membership's own RLS policy.
-- -----------------------------------------------------------------------------
create or replace function app.user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.membership m
  where m.user_id = app.current_user_id()
    and m.status = 'active'
$$;

create or replace function app.user_admin_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.membership m
  where m.user_id = app.current_user_id()
    and m.status = 'active'
    and m.role in ('owner', 'admin')
$$;

revoke all on function app.user_organization_ids() from public;
revoke all on function app.user_admin_organization_ids() from public;
grant execute on function app.user_organization_ids() to authenticated, service_role;
grant execute on function app.user_admin_organization_ids() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- organization_agreement: auditable, append-only record of each decision.
-- Platform terms and industry-intelligence contribution are separate
-- agreement types, even when presented together (shared presentation_id).
-- The current state is the latest row per (organization, agreement_type).
-- -----------------------------------------------------------------------------
create table public.organization_agreement (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organization (id) on delete cascade,
  agreement_type    text not null
                    check (agreement_type in ('platform_terms', 'industry_intelligence')),
  agreement_version text not null,
  decision          text not null check (decision in ('accepted', 'declined', 'withdrawn')),
  decided_by        uuid not null,  -- auth user id; kept even if the user is later deleted
  decided_at        timestamptz not null default now(),
  -- Groups decisions that were presented on the same screen/step.
  presentation_id   uuid,
  -- Where the decision happened (e.g. 'onboarding', 'settings').
  context           text,
  created_at        timestamptz not null default now()
);

create index organization_agreement_lookup_idx
  on public.organization_agreement (organization_id, agreement_type, decided_at desc);

create trigger organization_agreement_append_only
  before update on public.organization_agreement
  for each row execute function app.prevent_modification();

create trigger organization_agreement_no_user_delete
  before delete on public.organization_agreement
  for each row execute function app.prevent_user_delete();

create view public.organization_agreement_current
with (security_invoker = true) as
select distinct on (organization_id, agreement_type)
  organization_id,
  agreement_type,
  agreement_version,
  decision,
  decided_by,
  decided_at
from public.organization_agreement
order by organization_id, agreement_type, decided_at desc, created_at desc;

-- -----------------------------------------------------------------------------
-- location: stores, warehouses, offices and ship-to-only destinations.
-- -----------------------------------------------------------------------------
create table public.location (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  name            text not null,
  code            text,  -- retailer's own store number / short code
  location_type   text not null default 'store'
                  check (location_type in ('store', 'warehouse', 'office', 'ship_to')),
  sells           boolean not null default true,
  stocks          boolean not null default true,
  receives        boolean not null default true,
  address_line1   text,
  address_line2   text,
  city            text,
  region          text,  -- state / province
  postal_code     text,
  country         public.country_code not null,
  timezone        text not null check (app.is_valid_timezone(timezone)),
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id)
);

create index location_organization_idx on public.location (organization_id);

create trigger location_set_updated_at
  before update on public.location
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.organization enable row level security;
alter table public.membership enable row level security;
alter table public.organization_agreement enable row level security;
alter table public.location enable row level security;

-- Supplier organizations are public directory entries. Retailer organizations
-- are visible only to their own members. Creation happens server-side.
create policy organization_select on public.organization
  for select to authenticated
  using (kind = 'supplier' or id in (select app.user_organization_ids()));

create policy organization_update on public.organization
  for update to authenticated
  using (kind = 'retailer' and id in (select app.user_admin_organization_ids()))
  with check (kind = 'retailer' and id in (select app.user_admin_organization_ids()));

-- Members can see their own memberships and those of their organizations.
-- Membership changes happen server-side in V1.
create policy membership_select on public.membership
  for select to authenticated
  using (user_id = app.current_user_id()
         or organization_id in (select app.user_organization_ids()));

create policy organization_agreement_select on public.organization_agreement
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

-- Owners/admins record decisions as themselves.
create policy organization_agreement_insert on public.organization_agreement
  for insert to authenticated
  with check (organization_id in (select app.user_admin_organization_ids())
              and decided_by = app.current_user_id());

create policy location_select on public.location
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy location_insert on public.location
  for insert to authenticated
  with check (organization_id in (select app.user_admin_organization_ids()));

create policy location_update on public.location
  for update to authenticated
  using (organization_id in (select app.user_admin_organization_ids()))
  with check (organization_id in (select app.user_admin_organization_ids()));

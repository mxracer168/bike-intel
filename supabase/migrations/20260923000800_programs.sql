-- =============================================================================
-- Supplier programs (preseason / booking / promotional programs).
--
-- A program is OWNER-SCOPED:
--   * retailer-uploaded programs are owned by the retailer and private
--   * supplier-published programs are owned by the supplier and may be public
-- program_version, program_rule and program_eligibility inherit visibility
-- from their program.
--
-- program_link connects a retailer's private program to an official one. It
-- is retailer-private and points only from private -> official, so the
-- official program never reveals who uploaded a copy. Nothing is merged.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- program
-- -----------------------------------------------------------------------------
create table public.program (
  id                    uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organization (id) on delete cascade,
  supplier_market_id    uuid not null references public.supplier_market (id) deferrable initially deferred,
  name                  text not null,
  season_label          text,  -- e.g. 'Spring 2027'
  -- 'restricted' is visible only to its owner until audience rules exist.
  visibility            text not null default 'private'
                        check (visibility in ('private', 'public', 'restricted')),
  provenance            text not null
                        check (provenance in ('retailer_uploaded', 'supplier_uploaded', 'imported', 'system_generated')),
  external_program_code text,  -- supplier's own program identifier, when known
  status                text not null default 'active' check (status in ('active', 'archived')),
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, owner_organization_id)
);

create index program_owner_idx on public.program (owner_organization_id);
create index program_market_public_idx on public.program (supplier_market_id)
  where visibility = 'public' and status = 'active';

create trigger program_set_updated_at
  before update on public.program
  for each row execute function app.set_updated_at();

create trigger program_audit
  after insert or update or delete on public.program
  for each row execute function app.log_change('owner_organization_id');

-- -----------------------------------------------------------------------------
-- program_version: each interpretation/revision of a program.
-- 'draft' = AI-extracted or in progress, awaiting confirmation.
-- Once confirmed, content is frozen; changes require a new version.
-- -----------------------------------------------------------------------------
create table public.program_version (
  id                     uuid primary key default gen_random_uuid(),
  program_id             uuid not null references public.program (id) on delete cascade,
  version_number         integer not null check (version_number > 0),
  status                 text not null default 'draft'
                         check (status in ('draft', 'confirmed', 'superseded')),
  extraction_method      text not null
                         check (extraction_method in ('ai', 'manual', 'api', 'import')),
  extraction_confidence  public.confidence_score,
  source_document_id     uuid references public.document (id) on delete set null,
  source_import_batch_id uuid references public.import_batch (id) on delete set null,
  summary                text,
  order_window_start     date,  -- booking period
  order_window_end       date,
  ship_window_start      date,
  ship_window_end        date,
  -- Multiple ship dates, split shipments, immediate vs future delivery.
  delivery_options       jsonb not null default '[]'::jsonb,
  currency               public.currency_code,
  -- Normalized core structure that does not fit a column.
  core_terms             jsonb not null default '{}'::jsonb,
  -- Flexible AI-extracted terms we did not anticipate.
  additional_terms       jsonb not null default '{}'::jsonb,
  confirmed_by           uuid,
  confirmed_at           timestamptz,
  created_by             uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (program_id, version_number),
  check (status = 'draft' or confirmed_at is not null)
);

create trigger program_version_set_updated_at
  before update on public.program_version
  for each row execute function app.set_updated_at();

create trigger program_version_audit
  after insert or update or delete on public.program_version
  for each row execute function app.log_change();

-- Confirmed/superseded versions are frozen except for moving to 'superseded'.
create or replace function app.guard_program_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    if tg_op = 'DELETE' then
      -- Server-side cascades (e.g. deleting an organization) are allowed.
      if app.current_user_id() is not null then
        raise exception 'program_version % is %; it cannot be deleted', old.id, old.status;
      end if;
      return old;
    end if;
    if (to_jsonb(new) - array['status', 'updated_at'])
       is distinct from (to_jsonb(old) - array['status', 'updated_at'])
       or new.status not in ('confirmed', 'superseded')
       or (old.status = 'superseded' and new.status <> 'superseded') then
      raise exception 'program_version % is %; create a new version instead', old.id, old.status;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger program_version_guard
  before update or delete on public.program_version
  for each row execute function app.guard_program_version();

-- -----------------------------------------------------------------------------
-- program_rule: tiers, thresholds, requirements and benefits.
-- -----------------------------------------------------------------------------
create table public.program_rule (
  id                 uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_version (id) on delete cascade,
  sequence           integer not null default 0,
  rule_type          text not null
                     check (rule_type in ('tier', 'requirement', 'benefit', 'condition', 'other')),
  tier_label         text,
  threshold_type     text check (threshold_type in ('quantity', 'amount', 'category_mix', 'brand_mix', 'none', 'other')),
  threshold_value    numeric(20, 6),
  threshold_currency public.currency_code,
  benefit_type       text
                     check (benefit_type in ('percent_discount', 'amount_discount', 'special_price',
                                             'free_freight', 'payment_terms', 'free_goods', 'display',
                                             'marketing', 'other')),
  benefit_value      numeric(20, 6),
  benefit_details    jsonb not null default '{}'::jsonb,
  -- Original wording, preserved exactly.
  source_text        text,
  confidence         public.confidence_score,
  created_at         timestamptz not null default now()
);

create index program_rule_version_idx on public.program_rule (program_version_id, sequence);

-- -----------------------------------------------------------------------------
-- program_eligibility: what qualifies. 'unresolved' rows hold lines from the
-- source document that could not yet be matched to a product.
-- -----------------------------------------------------------------------------
create table public.program_eligibility (
  id                 uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_version (id) on delete cascade,
  program_rule_id    uuid references public.program_rule (id) on delete cascade,
  target_type        text not null
                     check (target_type in ('product', 'product_group', 'category', 'brand',
                                            'supplier_item', 'all', 'unresolved')),
  product_id         uuid references public.product (id) deferrable initially deferred,
  product_group_id   uuid references public.product_group (id) deferrable initially deferred,
  category_id        uuid references public.category (id) deferrable initially deferred,
  brand_id           uuid references public.brand (id) deferrable initially deferred,
  supplier_item_id   uuid references public.supplier_item (id) deferrable initially deferred,
  raw_description    text,
  raw_identifier     text,
  special_price      public.monetary_amount,
  currency           public.currency_code,
  minimum_quantity   public.quantity,
  source_text        text,
  match_confidence   public.confidence_score,
  created_at         timestamptz not null default now(),
  check (special_price is null or currency is not null),
  check (num_nonnulls(product_id, product_group_id, category_id, brand_id, supplier_item_id)
         = case when target_type in ('all', 'unresolved') then 0 else 1 end),
  check (target_type <> 'product' or product_id is not null),
  check (target_type <> 'product_group' or product_group_id is not null),
  check (target_type <> 'category' or category_id is not null),
  check (target_type <> 'brand' or brand_id is not null),
  check (target_type <> 'supplier_item' or supplier_item_id is not null)
);

create index program_eligibility_version_idx on public.program_eligibility (program_version_id);
create index program_eligibility_product_idx on public.program_eligibility (product_id) where product_id is not null;

-- Rules and eligibility can only change while their version is a draft.
create or replace function app.guard_program_version_children()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  version_ids uuid[];
begin
  version_ids := case tg_op
    when 'INSERT' then array[new.program_version_id]
    when 'DELETE' then array[old.program_version_id]
    else array[old.program_version_id, new.program_version_id]
  end;
  -- Server-side cascades (e.g. deleting an organization) are allowed.
  if tg_op = 'DELETE' and app.current_user_id() is null then
    return old;
  end if;
  if exists (select 1 from public.program_version v
             where v.id = any (version_ids) and v.status <> 'draft') then
    raise exception 'program version is not a draft; create a new version instead';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger program_rule_guard
  before insert or update or delete on public.program_rule
  for each row execute function app.guard_program_version_children();

create trigger program_eligibility_guard
  before insert or update or delete on public.program_eligibility
  for each row execute function app.guard_program_version_children();

-- -----------------------------------------------------------------------------
-- program_link: retailer's private program <-> official program.
-- -----------------------------------------------------------------------------
create table public.program_link (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null,
  private_program_id  uuid not null,
  official_program_id uuid not null references public.program (id) on delete cascade,
  status              text not null default 'suggested'
                      check (status in ('suggested', 'confirmed', 'rejected')),
  confidence          public.confidence_score,
  -- Why the programs look like the same program (structured facts only;
  -- never private document content).
  evidence            jsonb not null default '{}'::jsonb,
  decided_by          uuid,
  decided_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (private_program_id <> official_program_id),
  unique (private_program_id, official_program_id),
  -- The private program must be owned by the organization holding the link.
  foreign key (private_program_id, organization_id)
    references public.program (id, owner_organization_id) on delete cascade
);

create index program_link_organization_idx on public.program_link (organization_id);

create trigger program_link_set_updated_at
  before update on public.program_link
  for each row execute function app.set_updated_at();

create trigger program_link_audit
  after insert or update or delete on public.program_link
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.program enable row level security;
alter table public.program_version enable row level security;
alter table public.program_rule enable row level security;
alter table public.program_eligibility enable row level security;
alter table public.program_link enable row level security;

create policy program_select on public.program
  for select to authenticated
  using (owner_organization_id in (select app.user_organization_ids())
         or (visibility = 'public' and status = 'active'));

-- Retailers can only create and keep private programs. Publishing happens
-- server-side (and later through supplier accounts).
create policy program_insert on public.program
  for insert to authenticated
  with check (owner_organization_id in (select app.user_organization_ids())
              and visibility = 'private'
              and provenance = 'retailer_uploaded');

create policy program_update on public.program
  for update to authenticated
  using (owner_organization_id in (select app.user_organization_ids()))
  with check (owner_organization_id in (select app.user_organization_ids())
              and visibility = 'private');

-- Children: readable when the program is readable; writable only by the
-- program's owner (a public program is readable but not editable).
create policy program_version_select on public.program_version
  for select to authenticated
  using (exists (select 1 from public.program p where p.id = program_id));

create policy program_version_insert on public.program_version
  for insert to authenticated
  with check (exists (select 1 from public.program p
                      where p.id = program_id
                        and p.owner_organization_id in (select app.user_organization_ids()))
              and (source_document_id is null
                   or exists (select 1 from public.document d where d.id = source_document_id)));

create policy program_version_update on public.program_version
  for update to authenticated
  using (exists (select 1 from public.program p
                 where p.id = program_id
                   and p.owner_organization_id in (select app.user_organization_ids())))
  with check (exists (select 1 from public.program p
                      where p.id = program_id
                        and p.owner_organization_id in (select app.user_organization_ids())));

create policy program_rule_select on public.program_rule
  for select to authenticated
  using (exists (select 1 from public.program_version v where v.id = program_version_id));

create policy program_rule_write on public.program_rule
  for all to authenticated
  using (exists (select 1 from public.program_version v
                 join public.program p on p.id = v.program_id
                 where v.id = program_version_id
                   and p.owner_organization_id in (select app.user_organization_ids())))
  with check (exists (select 1 from public.program_version v
                      join public.program p on p.id = v.program_id
                      where v.id = program_version_id
                        and p.owner_organization_id in (select app.user_organization_ids())));

create policy program_eligibility_select on public.program_eligibility
  for select to authenticated
  using (exists (select 1 from public.program_version v where v.id = program_version_id));

create policy program_eligibility_write on public.program_eligibility
  for all to authenticated
  using (exists (select 1 from public.program_version v
                 join public.program p on p.id = v.program_id
                 where v.id = program_version_id
                   and p.owner_organization_id in (select app.user_organization_ids())))
  with check (exists (select 1 from public.program_version v
                      join public.program p on p.id = v.program_id
                      where v.id = program_version_id
                        and p.owner_organization_id in (select app.user_organization_ids())));

create policy program_link_select on public.program_link
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy program_link_insert on public.program_link
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and exists (select 1 from public.program p where p.id = official_program_id));

create policy program_link_update on public.program_link
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids()));

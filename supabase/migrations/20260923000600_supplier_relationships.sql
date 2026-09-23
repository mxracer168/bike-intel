-- =============================================================================
-- Retailer <-> supplier market relationships, terms and cached supplier data.
--
-- Visibility: RELATIONSHIP-SPECIFIC. In V1 only members of the retailer in
-- the relationship can read these rows. Suppliers see nothing unless a future
-- explicit retailer-consent mechanism grants it.
--
-- Rule: supplier-controlled data may be cached here for analysis, but
-- transactional values are revalidated live as close to submission as the
-- integration allows (recorded on purchase_order_line).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- supplier_relationship
-- -----------------------------------------------------------------------------
create table public.supplier_relationship (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null,
  retailer_kind      text not null default 'retailer' check (retailer_kind = 'retailer'),
  supplier_market_id uuid not null references public.supplier_market (id) deferrable initially deferred,
  -- Self-asserted in V1 ('claimed'); verification comes later.
  status             text not null default 'claimed'
                     check (status in ('claimed', 'verified', 'inactive', 'suspended')),
  -- Explicit retailer preference: a weighting signal, never a hard restriction.
  preference         text not null default 'neutral'
                     check (preference in ('preferred', 'neutral', 'avoid')),
  preference_notes   text,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  foreign key (organization_id, retailer_kind)
    references public.organization (id, kind) on delete cascade,
  unique (organization_id, supplier_market_id),
  unique (id, organization_id)
);

create trigger supplier_relationship_set_updated_at
  before update on public.supplier_relationship
  for each row execute function app.set_updated_at();

create trigger supplier_relationship_audit
  after insert or update or delete on public.supplier_relationship
  for each row execute function app.log_change('organization_id');

-- Only the server may mark a relationship verified or suspended.
create or replace function app.guard_supplier_relationship_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.current_user_id() is not null
     and new.status in ('verified', 'suspended')
     and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end) then
    raise exception 'relationship status % can only be set by the platform', new.status;
  end if;
  return new;
end;
$$;

create trigger supplier_relationship_guard_status
  before insert or update on public.supplier_relationship
  for each row execute function app.guard_supplier_relationship_status();

-- -----------------------------------------------------------------------------
-- supplier_terms: time-aware terms. Relationship-level by default; a
-- location_id makes it a location-specific override.
-- -----------------------------------------------------------------------------
create table public.supplier_terms (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null,
  supplier_relationship_id uuid not null,
  location_id              uuid,
  term_type                text not null
                           check (term_type in ('free_freight_threshold', 'payment_terms',
                                                'early_payment_discount', 'volume_discount',
                                                'customer_pricing', 'shipping_preference',
                                                'program_eligibility', 'negotiated_benefit', 'other')),
  description              text,
  -- Structured detail for the term (e.g. {"net_days": 60} or tier tables).
  value                    jsonb not null default '{}'::jsonb,
  -- Convenience for the common single-amount terms (e.g. freight threshold).
  amount                   public.monetary_amount,
  currency                 public.currency_code,
  valid_from               date,
  valid_to                 date,
  source_type              text not null default 'retailer_stated'
                           check (source_type in ('retailer_stated', 'supplier_api', 'document',
                                                  'system_inferred', 'imported')),
  document_id              uuid references public.document (id) on delete set null,
  import_batch_id          uuid references public.import_batch (id) on delete set null,
  status                   text not null default 'active'
                           check (status in ('active', 'superseded', 'archived')),
  created_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  check (amount is null or currency is not null),
  foreign key (supplier_relationship_id, organization_id)
    references public.supplier_relationship (id, organization_id) on delete cascade,
  foreign key (location_id, organization_id)
    references public.location (id, organization_id) on delete cascade
);

create index supplier_terms_relationship_idx
  on public.supplier_terms (supplier_relationship_id, term_type) where status = 'active';

create trigger supplier_terms_set_updated_at
  before update on public.supplier_terms
  for each row execute function app.set_updated_at();

create trigger supplier_terms_audit
  after insert or update or delete on public.supplier_terms
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- supplier_offer_observation: cached price and/or availability for one
-- supplier item, as seen through this retailer's relationship.
--
--   supplier_warehouse_id null  -> aggregate / not warehouse-specific
--   supplier_warehouse_id set   -> that warehouse's availability
--   unit_cost                   -> per supplier ordering unit (see supplier_item)
--
-- Retention follows the connection's observation_retention:
--   history     -> append a row per observation
--   latest_only -> keep only the newest row per (relationship, item, warehouse)
--   transient   -> rows carry expires_at and are purged after it
-- -----------------------------------------------------------------------------
create table public.supplier_offer_observation (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null,
  supplier_relationship_id uuid not null,
  supplier_item_id         uuid not null references public.supplier_item (id) on delete cascade,
  supplier_warehouse_id    uuid references public.supplier_warehouse (id) on delete cascade,
  unit_cost                public.monetary_amount,
  currency                 public.currency_code,
  price_type               text check (price_type in ('customer', 'list', 'promotional', 'program')),
  available_quantity       public.quantity,
  availability_status      text
                           check (availability_status in ('in_stock', 'limited', 'out_of_stock',
                                                          'backorder', 'discontinued', 'unknown')),
  expected_available_date  date,
  lead_time_days           integer check (lead_time_days >= 0),
  observed_at              timestamptz not null,
  expires_at               timestamptz,
  import_batch_id          uuid references public.import_batch (id) on delete set null,
  created_at               timestamptz not null default now(),
  check (unit_cost is null or currency is not null),
  foreign key (supplier_relationship_id, organization_id)
    references public.supplier_relationship (id, organization_id) on delete cascade
);

create index supplier_offer_observation_latest_idx
  on public.supplier_offer_observation (supplier_relationship_id, supplier_item_id, supplier_warehouse_id, observed_at desc);
create index supplier_offer_observation_expiry_idx
  on public.supplier_offer_observation (expires_at) where expires_at is not null;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.supplier_relationship enable row level security;
alter table public.supplier_terms enable row level security;
alter table public.supplier_offer_observation enable row level security;

create policy supplier_relationship_select on public.supplier_relationship
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy supplier_relationship_insert on public.supplier_relationship
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids()) and status = 'claimed');

create policy supplier_relationship_update on public.supplier_relationship
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids()));

create policy supplier_terms_select on public.supplier_terms
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy supplier_terms_insert on public.supplier_terms
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids()));

create policy supplier_terms_update on public.supplier_terms
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids()));

-- Observations are written only by server-side sync jobs.
create policy supplier_offer_observation_select on public.supplier_offer_observation
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

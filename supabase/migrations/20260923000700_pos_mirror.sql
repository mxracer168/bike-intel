-- =============================================================================
-- POS mirror: sales lines and change-based inventory history.
-- The retailer's POS is authoritative for this data; these tables are
-- written only by server-side sync jobs.
--
-- Visibility: RETAILER-PRIVATE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sale_line: one POS sale or return line. Sales stay attached to the
-- retailer_item that generated them; canonical product is reached via
-- product_match, never copied here.
-- -----------------------------------------------------------------------------
create table public.sale_line (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organization (id) on delete cascade,
  location_id      uuid not null,
  retailer_item_id uuid,  -- null for POS lines with no item record (misc. charges)
  connection_id    uuid not null,
  import_batch_id  uuid references public.import_batch (id) on delete set null,
  external_sale_id text,
  external_line_id text not null,
  sold_at          timestamptz not null,
  -- The sale date in the location's own timezone (used for seasonality).
  business_date    date not null,
  -- In POS selling units; negative for returns.
  quantity         public.quantity not null,
  unit_price       public.monetary_amount,
  extended_price   public.monetary_amount,
  discount_amount  public.monetary_amount,
  unit_cost        public.monetary_amount,
  currency         public.currency_code not null,
  is_special_order boolean,  -- null = POS did not say
  description_raw  text,
  attributes       jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (connection_id, external_line_id),
  foreign key (location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred,
  foreign key (retailer_item_id, organization_id)
    references public.retailer_item (id, organization_id) deferrable initially deferred,
  foreign key (connection_id, organization_id)
    references public.connection (id, organization_id) deferrable initially deferred
);

create index sale_line_item_date_idx on public.sale_line (retailer_item_id, business_date);
create index sale_line_location_date_idx on public.sale_line (location_id, business_date);
create index sale_line_organization_date_idx on public.sale_line (organization_id, business_date);

create trigger sale_line_set_updated_at
  before update on public.sale_line
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- inventory_history: one row per period during which on-hand quantity was
-- constant for an item at a location. A new row is written only when the
-- quantity changes; valid_to null = current.
--
-- last_confirmed_at is advanced each time a sync sees the same quantity, so
-- "unchanged and confirmed" is distinguishable from "not observed". Location-
-- level observation windows are recorded in sync_coverage.
-- -----------------------------------------------------------------------------
create table public.inventory_history (
  id                             uuid primary key default gen_random_uuid(),
  organization_id                uuid not null references public.organization (id) on delete cascade,
  location_id                    uuid not null,
  retailer_item_id               uuid not null,
  quantity_on_hand               public.quantity not null,
  valid_from                     timestamptz not null,
  valid_to                       timestamptz,
  -- Local business dates at the location, for daily analysis.
  valid_from_business_date       date not null,
  valid_to_business_date         date,
  last_confirmed_at              timestamptz not null,
  import_batch_id                uuid references public.import_batch (id) on delete set null,
  last_confirmed_import_batch_id uuid references public.import_batch (id) on delete set null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  check (last_confirmed_at >= valid_from),
  foreign key (location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred,
  foreign key (retailer_item_id, organization_id)
    references public.retailer_item (id, organization_id) deferrable initially deferred,
  -- Periods for the same item at the same location can never overlap.
  exclude using gist (
    location_id with =,
    retailer_item_id with =,
    tstzrange(valid_from, valid_to) with &&
  )
);

create unique index inventory_history_current_idx
  on public.inventory_history (location_id, retailer_item_id) where valid_to is null;
create index inventory_history_organization_idx on public.inventory_history (organization_id);

create trigger inventory_history_set_updated_at
  before update on public.inventory_history
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security: read-only for members; server-side writes only.
-- -----------------------------------------------------------------------------
alter table public.sale_line enable row level security;
alter table public.inventory_history enable row level security;

create policy sale_line_select on public.sale_line
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy inventory_history_select on public.inventory_history
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

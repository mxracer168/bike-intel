-- =============================================================================
-- Canonical catalog and product matching.
--
-- Three kinds of product records are kept separate on purpose:
--   product         our canonical sellable variant (internal identity)
--   supplier_item   exactly what a supplier catalog says
--   retailer_item   exactly what a retailer's POS says
-- product_match links supplier/retailer items to canonical products.
-- A wrong match is corrected by changing the match; source records and the
-- sales/supplier data attached to them are never rewritten.
--
-- Visibility:
--   product               global; a provisional product created from a
--                         retailer's POS item stays private to that retailer
--                         (origin_organization_id) until confirmed
--   product_identifier    follows its product
--   supplier_item         global (catalog facts only; NO wholesale price)
--   retailer_item         retailer-private
--   product_match         global for supplier items, private for retailer items
--   product_relationship  global (visible when both products are visible)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- product: canonical sellable variant.
-- -----------------------------------------------------------------------------
create table public.product (
  id                     uuid primary key default gen_random_uuid(),
  product_group_id       uuid references public.product_group (id) on delete set null,
  brand_id               uuid references public.brand (id) on delete set null,
  category_id            uuid references public.category (id) on delete set null,
  name                   text not null,
  model_year             smallint,
  -- Variant and industry-specific attributes (size, color, wheel size...).
  attributes             jsonb not null default '{}'::jsonb,
  status                 text not null default 'provisional'
                         check (status in ('provisional', 'confirmed', 'merged')),
  merged_into_product_id uuid references public.product (id) deferrable initially deferred,
  -- Set when the product was created from a retailer's private POS data;
  -- the product is then visible only to that retailer until confirmed from
  -- a non-private source (at which point this is cleared).
  origin_organization_id uuid references public.organization (id) on delete cascade,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check ((status = 'merged') = (merged_into_product_id is not null)),
  check (merged_into_product_id is distinct from id)
);

create index product_group_idx on public.product (product_group_id);
create index product_brand_idx on public.product (brand_id);
create index product_origin_idx on public.product (origin_organization_id)
  where origin_organization_id is not null;

create trigger product_set_updated_at
  before update on public.product
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_identifier: strong matching identifiers. Not primary keys, and not
-- forced unique: real-world data contains reused and conflicting codes.
-- -----------------------------------------------------------------------------
create table public.product_identifier (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.product (id) on delete cascade,
  identifier_type text not null check (identifier_type in ('upc', 'ean', 'gtin', 'mpn')),
  value           text not null,  -- normalized (digits only for UPC/EAN/GTIN)
  brand_id        uuid references public.brand (id) on delete set null,  -- scopes MPNs
  source          text not null default 'import'
                  check (source in ('supplier_item', 'retailer_item', 'manual', 'import')),
  created_at      timestamptz not null default now(),
  unique (product_id, identifier_type, value)
);

create index product_identifier_value_idx on public.product_identifier (identifier_type, value);

-- -----------------------------------------------------------------------------
-- supplier_item: one entry in one supplier market's catalog.
--
-- Units of measure:
--   uom_raw                 exactly as supplied ('ea', 'b/12', 'PR', ...)
--   unit_type               normalized ordering unit
--   pack_quantity           canonical product units in ONE supplier ordering unit
--   order_multiple          must order in multiples of this many ordering units
--   minimum_order_quantity  in ordering units
-- -----------------------------------------------------------------------------
create table public.supplier_item (
  id                       uuid primary key default gen_random_uuid(),
  supplier_market_id       uuid not null references public.supplier_market (id) on delete cascade,
  supplier_sku             text not null,
  supplier_part_number     text,
  manufacturer_part_number text,
  upc                      text,
  ean                      text,
  brand_name_raw           text,
  brand_id                 uuid references public.brand (id) on delete set null,
  description              text,
  category_raw             text,
  uom_raw                  text,
  unit_type                text not null default 'each'
                           check (unit_type in ('each', 'pair', 'set', 'pack', 'box', 'case', 'bag',
                                                'roll', 'length', 'weight', 'volume', 'other')),
  pack_quantity            public.quantity not null default 1 check (pack_quantity > 0),
  order_multiple           public.quantity not null default 1 check (order_multiple > 0),
  minimum_order_quantity   public.quantity check (minimum_order_quantity > 0),
  uom_normalization        text not null default 'assumed'
                           check (uom_normalization in ('supplied', 'parsed', 'assumed', 'needs_review')),
  msrp                     public.monetary_amount,
  msrp_currency            public.currency_code,
  attributes               jsonb not null default '{}'::jsonb,
  status                   text not null default 'active'
                           check (status in ('active', 'discontinued', 'inactive')),
  import_batch_id          uuid references public.import_batch (id) on delete set null,
  first_seen_at            timestamptz not null default now(),
  last_seen_at             timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (supplier_market_id, supplier_sku),
  check (msrp is null or msrp_currency is not null)
);

create index supplier_item_upc_idx on public.supplier_item (upc) where upc is not null;
create index supplier_item_ean_idx on public.supplier_item (ean) where ean is not null;
create index supplier_item_mpn_idx on public.supplier_item (manufacturer_part_number)
  where manufacturer_part_number is not null;

create trigger supplier_item_set_updated_at
  before update on public.supplier_item
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- retailer_item: one item record in a retailer's POS, exactly as the POS has it.
-- Includes non-product items (labor, gift cards...) so sales history is complete.
--
-- Units of measure:
--   selling_uom_raw         exactly as the POS has it (often empty)
--   selling_unit_type       normalized selling unit (default 'each')
--   units_per_selling_unit  canonical product units in ONE POS selling unit
-- -----------------------------------------------------------------------------
create table public.retailer_item (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organization (id) on delete cascade,
  connection_id            uuid not null,
  external_id              text not null,  -- the POS's own item id
  sku                      text,
  upc                      text,
  ean                      text,
  manufacturer_part_number text,
  brand_name_raw           text,
  description              text,
  pos_category_raw         text,
  -- POS default vendor for the item; a useful supplier-preference signal.
  vendor_name_raw          text,
  vendor_sku_raw           text,
  selling_uom_raw          text,
  selling_unit_type        text not null default 'each'
                           check (selling_unit_type in ('each', 'pair', 'set', 'pack', 'box', 'case', 'bag',
                                                        'roll', 'length', 'weight', 'volume', 'other')),
  units_per_selling_unit   public.quantity not null default 1 check (units_per_selling_unit > 0),
  default_cost             public.monetary_amount,
  default_price            public.monetary_amount,
  currency                 public.currency_code,
  item_kind                text not null default 'unknown'
                           check (item_kind in ('product', 'service', 'non_inventory', 'gift_card', 'other', 'unknown')),
  -- Does the retailer intend to keep this on the shelf? Needed later to judge
  -- recommendations fairly (special orders, intentionally non-stocked items).
  stocking_intent          text not null default 'unknown'
                           check (stocking_intent in ('stocked', 'not_stocked', 'special_order_only', 'unknown')),
  stocking_intent_source   text check (stocking_intent_source in ('pos', 'retailer', 'system')),
  status                   text not null default 'active' check (status in ('active', 'archived')),
  import_batch_id          uuid references public.import_batch (id) on delete set null,
  first_seen_at            timestamptz not null default now(),
  last_seen_at             timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (connection_id, external_id),
  unique (id, organization_id),
  -- Disconnecting a POS must never delete item or sales history.
  foreign key (connection_id, organization_id)
    references public.connection (id, organization_id) deferrable initially deferred,
  check ((default_cost is null and default_price is null) or currency is not null)
);

create index retailer_item_organization_idx on public.retailer_item (organization_id);
create index retailer_item_upc_idx on public.retailer_item (upc) where upc is not null;

create trigger retailer_item_set_updated_at
  before update on public.retailer_item
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_match: supplier_item or retailer_item -> canonical product.
-- Matches are never edited into a different product; a correction marks the
-- old row 'superseded' or 'rejected' and adds a new row, so history remains.
-- 'candidate' rows are ambiguous matches awaiting confirmation.
-- -----------------------------------------------------------------------------
create table public.product_match (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organization (id) on delete cascade,
  retailer_item_id uuid,
  supplier_item_id uuid references public.supplier_item (id) on delete cascade,
  product_id       uuid not null references public.product (id) on delete cascade,
  status           text not null default 'active'
                   check (status in ('candidate', 'active', 'rejected', 'superseded')),
  confidence       public.confidence_score not null,
  method           text not null
                   check (method in ('identifier', 'attributes', 'manual', 'merge', 'import', 'other')),
  -- Why the records were considered the same product (signals, price sanity check...).
  evidence         jsonb not null default '{}'::jsonb,
  decided_by_type  text not null default 'system'
                   check (decided_by_type in ('system', 'user', 'platform_admin')),
  decided_by       uuid,
  decided_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (num_nonnulls(retailer_item_id, supplier_item_id) = 1),
  check ((retailer_item_id is null) = (organization_id is null)),
  foreign key (retailer_item_id, organization_id)
    references public.retailer_item (id, organization_id) on delete cascade
);

create unique index product_match_one_active_retailer_item_idx
  on public.product_match (retailer_item_id) where status = 'active' and retailer_item_id is not null;
create unique index product_match_one_active_supplier_item_idx
  on public.product_match (supplier_item_id) where status = 'active' and supplier_item_id is not null;
create index product_match_product_idx on public.product_match (product_id) where status = 'active';
create index product_match_candidates_idx on public.product_match (organization_id)
  where status = 'candidate';

create trigger product_match_set_updated_at
  before update on public.product_match
  for each row execute function app.set_updated_at();

-- Match rows keep their own history (superseded/rejected rows stay), so only
-- updates are audited; bulk inserts during imports would bloat the log.
create trigger product_match_audit
  after update or delete on public.product_match
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- product_relationship: lineage and comparability. Historical sales are never
-- moved; analysis may use these links to borrow predecessor history.
-- -----------------------------------------------------------------------------
create table public.product_relationship (
  id                uuid primary key default gen_random_uuid(),
  from_product_id   uuid not null references public.product (id) on delete cascade,
  to_product_id     uuid not null references public.product (id) on delete cascade,
  relationship_type text not null
                    check (relationship_type in ('successor', 'replaced_by', 'closest_equivalent', 'comparable')),
  -- supplier_declared carries more weight than community or inferred links.
  source_type       text not null
                    check (source_type in ('supplier_declared', 'platform_curated', 'system_inferred', 'community')),
  country           public.country_code,  -- null = applies in every market
  confidence        public.confidence_score,
  evidence          jsonb not null default '{}'::jsonb,
  status            text not null default 'active' check (status in ('active', 'retired')),
  effective_from    date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (from_product_id <> to_product_id),
  unique nulls not distinct (from_product_id, to_product_id, relationship_type, source_type, country)
);

create index product_relationship_to_idx on public.product_relationship (to_product_id);

create trigger product_relationship_set_updated_at
  before update on public.product_relationship
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.product enable row level security;
alter table public.product_identifier enable row level security;
alter table public.supplier_item enable row level security;
alter table public.retailer_item enable row level security;
alter table public.product_match enable row level security;
alter table public.product_relationship enable row level security;

create policy product_select on public.product
  for select to authenticated
  using (origin_organization_id is null
         or origin_organization_id in (select app.user_organization_ids()));

-- Child rows inherit the parent's visibility: the subquery is itself
-- filtered by product's RLS policy.
create policy product_identifier_select on public.product_identifier
  for select to authenticated
  using (exists (select 1 from public.product p where p.id = product_id));

create policy supplier_item_select on public.supplier_item
  for select to authenticated using (true);

-- Retailer items mirror the POS and are written server-side. Members may
-- only adjust the retailer-owned stocking intent (enforced below).
create policy retailer_item_select on public.retailer_item
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy retailer_item_update on public.retailer_item
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids()));

revoke update on public.retailer_item from authenticated;
grant update (stocking_intent, stocking_intent_source) on public.retailer_item to authenticated;

create policy product_match_select on public.product_match
  for select to authenticated
  using (organization_id is null
         or organization_id in (select app.user_organization_ids()));

-- Retailers confirm, reject or create matches for their own items only, and
-- only against products they can see.
create policy product_match_insert on public.product_match
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and decided_by_type = 'user'
              and decided_by = app.current_user_id()
              and exists (select 1 from public.product p where p.id = product_id));

create policy product_match_update on public.product_match
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and exists (select 1 from public.product p where p.id = product_id));

-- A match's target product never changes; users may only change its status.
revoke update on public.product_match from authenticated;
grant update (status, decided_by_type, decided_by, decided_at) on public.product_match to authenticated;

create policy product_relationship_select on public.product_relationship
  for select to authenticated
  using (exists (select 1 from public.product p where p.id = from_product_id)
         and exists (select 1 from public.product p where p.id = to_product_id));

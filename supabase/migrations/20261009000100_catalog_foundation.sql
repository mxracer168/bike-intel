-- =============================================================================
-- Catalog foundation (docs/catalog.md: D1-D8, G1-G5). NOT APPLIED TO LIVE
-- until approved; applied here only by local tests and CI.
--
--   * Product -> Variant: product_group becomes product (the model / family),
--     product becomes product_variant. Every Variant belongs to a Product.
--     Category and brand belong to the Product.
--   * Columns that meant the variant become variant_id; Product-level
--     references are added where a need, context or eligibility can be about
--     a whole model.
--   * Recommendation scope (G1): product_id always, variant_id optional,
--     parent_line_id for a system allocation of a Product-level need.
--   * Identifiers: open-ended types, attach to a Product or a Variant, keep
--     their source and rights.
--   * Source rights (D4/D5): a connection's catalog data is restricted to its
--     organization unless marked platform-usable; restricted rows carry
--     restricted_to_organization_id and RLS hides them from everyone else.
--   * Attribute definitions and their inherited application to categories
--     (G3); provenance (catalog_assertion), media, verified distinctions.
--   * Lineage (D8): direct successor / functional replacement / substitute,
--     between Products or between Variants.
--
-- Normalized meaning and source representation are kept apart: attribute
-- values hold the normalized value and the designation shown for this item;
-- what each source said stays in catalog_assertion.
--
-- Precondition: the catalog tables hold no rows (checked below). The
-- migration stops rather than reinterpret existing data.
-- =============================================================================

do $$
begin
  if exists (select 1 from public.product) or exists (select 1 from public.product_group) then
    raise exception 'catalog_foundation expects empty product / product_group tables';
  end if;
  if exists (select 1 from public.recommendation_line) then
    raise exception 'catalog_foundation expects no recommendation lines (product_id becomes required)';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Renames (D1)
-- -----------------------------------------------------------------------------
alter table public.product rename to product_variant;
alter table public.product_group rename to product;

alter index public.product_group_idx rename to product_variant_product_idx;
alter index public.product_origin_idx rename to product_variant_origin_idx;
alter trigger product_set_updated_at on public.product_variant rename to product_variant_set_updated_at;
alter trigger product_group_set_updated_at on public.product rename to product_set_updated_at;

-- Variant: belongs to a Product (D2); category and brand live on the Product.
alter table public.product_variant rename column product_group_id to product_id;
alter table public.product_variant rename column merged_into_product_id to merged_into_variant_id;
alter table public.product_variant drop column category_id;
alter table public.product_variant drop column brand_id;  -- drops product_brand_idx with it
alter index public.product_group_brand_idx rename to product_brand_idx;
alter table public.product_variant
  alter column product_id set not null,
  add constraint product_variant_id_product_unique unique (id, product_id);

-- The Product's foreign key to its variants' old parent was "on delete set
-- null"; a Variant can no longer lose its Product.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.product_variant'::regclass and contype = 'f'
              and pg_get_constraintdef(oid) like 'FOREIGN KEY (product_id)%'
  loop
    execute format('alter table public.product_variant drop constraint %I', c.conname);
  end loop;
end;
$$;
alter table public.product_variant
  add constraint product_variant_product_fk
    foreign key (product_id) references public.product (id) on delete cascade;

-- Product: like a Variant, private to a retailer while it rests only on that
-- retailer's restricted data; can be marked a duplicate of another Product.
alter table public.product
  add column status                 text not null default 'provisional'
                                    check (status in ('provisional', 'confirmed', 'merged')),
  add column merged_into_product_id uuid references public.product (id) deferrable initially deferred,
  add column origin_organization_id uuid references public.organization (id) on delete cascade,
  add constraint product_merged_check check ((status = 'merged') = (merged_into_product_id is not null)),
  add constraint product_merged_self_check check (merged_into_product_id is distinct from id);
create index product_category_idx on public.product (category_id);
create index product_origin_idx on public.product (origin_organization_id)
  where origin_organization_id is not null;

drop policy product_group_select on public.product;
create policy product_select on public.product
  for select to authenticated
  using (origin_organization_id is null
         or origin_organization_id in (select app.user_organization_ids()));

-- A Variant is visible only when its Product is too.
drop policy product_select on public.product_variant;
create policy product_variant_select on public.product_variant
  for select to authenticated
  using ((origin_organization_id is null
          or origin_organization_id in (select app.user_organization_ids()))
         and exists (select 1 from public.product p where p.id = product_id));

-- -----------------------------------------------------------------------------
-- Source rights (D4): per connection, restricted until our rights are known.
-- -----------------------------------------------------------------------------
alter table public.connection
  add column catalog_rights       text not null default 'restricted'
                                  check (catalog_rights in ('restricted', 'platform')),
  -- Why these rights apply (agreement, license, pending review...).
  add column catalog_rights_basis text;

-- Retailer members can't widen a connection's rights; only the platform can.
create or replace function app.guard_connection_catalog_rights()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.current_user_id() is not null
     and new.catalog_rights = 'platform'
     and new.catalog_rights is distinct from (case when tg_op = 'UPDATE' then old.catalog_rights end) then
    raise exception 'catalog rights can only be widened by the platform';
  end if;
  return new;
end;
$$;

create trigger connection_catalog_rights_guard
  before insert or update on public.connection
  for each row execute function app.guard_connection_catalog_rights();

-- -----------------------------------------------------------------------------
-- Supplier offers: restricted to the organization whose connection supplied
-- them, unless that source is platform-usable.
-- -----------------------------------------------------------------------------
alter table public.supplier_item
  add column restricted_to_organization_id uuid references public.organization (id) on delete cascade,
  add column source_connection_id          uuid,
  add constraint supplier_item_source_connection_fk
    foreign key (source_connection_id, restricted_to_organization_id)
    references public.connection (id, organization_id) on delete set null (source_connection_id);

do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.supplier_item'::regclass and contype = 'u'
              and pg_get_constraintdef(oid) = 'UNIQUE (supplier_market_id, supplier_sku)'
  loop
    execute format('alter table public.supplier_item drop constraint %I', c.conname);
  end loop;
end;
$$;
-- A platform record and retailer-restricted records of one SKU may coexist.
alter table public.supplier_item
  add constraint supplier_item_sku_scope_unique
    unique nulls not distinct (supplier_market_id, supplier_sku, restricted_to_organization_id);
create index supplier_item_restricted_idx on public.supplier_item (restricted_to_organization_id)
  where restricted_to_organization_id is not null;

drop policy supplier_item_select on public.supplier_item;
create policy supplier_item_select on public.supplier_item
  for select to authenticated
  using (restricted_to_organization_id is null
         or restricted_to_organization_id in (select app.user_organization_ids()));

-- -----------------------------------------------------------------------------
-- Identifiers: open-ended types, Product or Variant, sourced, rights-scoped.
-- -----------------------------------------------------------------------------
create table public.identifier_type (
  code        text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);
insert into public.identifier_type (code, label, description) values
  ('upc', 'UPC', 'GS1 UPC-A, 12 digits'),
  ('ean', 'EAN', 'GS1 EAN-13'),
  ('gtin', 'GTIN', 'GS1 GTIN-14 or normalized GTIN'),
  ('mpn', 'Manufacturer part number', 'Scoped by brand');

alter table public.identifier_type enable row level security;
create policy identifier_type_select on public.identifier_type
  for select to authenticated using (true);

alter table public.product_identifier rename column product_id to variant_id;
alter table public.product_identifier alter column variant_id drop not null;

do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.product_identifier'::regclass
              and contype in ('c', 'u')
              and (pg_get_constraintdef(oid) like '%identifier_type%'
                   or pg_get_constraintdef(oid) like '%source%')
  loop
    execute format('alter table public.product_identifier drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.product_identifier
  add column product_id                    uuid references public.product (id) on delete cascade,
  add column source_supplier_item_id       uuid references public.supplier_item (id) on delete set null,
  add column source_retailer_item_id       uuid,
  add column import_batch_id               uuid references public.import_batch (id) on delete set null,
  add column restricted_to_organization_id uuid references public.organization (id) on delete cascade,
  add constraint product_identifier_type_fk
    foreign key (identifier_type) references public.identifier_type (code),
  add constraint product_identifier_source_check
    check (source in ('supplier_item', 'retailer_item', 'manufacturer', 'manual', 'import')),
  add constraint product_identifier_subject_check
    check (num_nonnulls(product_id, variant_id) = 1),
  add constraint product_identifier_retailer_source_fk
    foreign key (source_retailer_item_id, restricted_to_organization_id)
    references public.retailer_item (id, organization_id) on delete cascade,
  -- An identifier read from a retailer's POS item is that retailer's alone.
  add constraint product_identifier_retailer_restricted_check
    check (source_retailer_item_id is null or restricted_to_organization_id is not null),
  add constraint product_identifier_unique
    unique nulls not distinct (product_id, variant_id, identifier_type, value, restricted_to_organization_id);

drop policy product_identifier_select on public.product_identifier;
create policy product_identifier_select on public.product_identifier
  for select to authenticated
  using ((restricted_to_organization_id is null
          or restricted_to_organization_id in (select app.user_organization_ids()))
         and (exists (select 1 from public.product_variant v where v.id = variant_id)
              or exists (select 1 from public.product p where p.id = product_id)));

-- -----------------------------------------------------------------------------
-- Matches: an offer -> Variant match built from restricted data is restricted
-- too (resolution inherits the restriction).
-- -----------------------------------------------------------------------------
alter table public.product_match rename column product_id to variant_id;
alter index public.product_match_product_idx rename to product_match_variant_idx;

do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.product_match'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%retailer_item_id IS NULL%organization_id IS NULL%'
  loop
    execute format('alter table public.product_match drop constraint %I', c.conname);
  end loop;
end;
$$;
alter table public.product_match
  add constraint product_match_retailer_item_org_check
    check (retailer_item_id is null or organization_id is not null);

drop policy product_match_insert on public.product_match;
drop policy product_match_update on public.product_match;
create policy product_match_insert on public.product_match
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and retailer_item_id is not null
              and decided_by_type = 'user'
              and decided_by = app.current_user_id()
              and exists (select 1 from public.product_variant v where v.id = variant_id));
create policy product_match_update on public.product_match
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()) and retailer_item_id is not null)
  with check (organization_id in (select app.user_organization_ids())
              and exists (select 1 from public.product_variant v where v.id = variant_id));

-- -----------------------------------------------------------------------------
-- Lineage (D8): three types, between Products or between Variants.
-- -----------------------------------------------------------------------------
alter table public.product_relationship rename column from_product_id to from_variant_id;
alter table public.product_relationship rename column to_product_id to to_variant_id;
alter index public.product_relationship_to_idx rename to product_relationship_to_variant_idx;

do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.product_relationship'::regclass
              and contype in ('c', 'u')
              and (pg_get_constraintdef(oid) like '%relationship_type%'
                   or pg_get_constraintdef(oid) like '%from_variant_id%')
  loop
    execute format('alter table public.product_relationship drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.product_relationship
  alter column from_variant_id drop not null,
  alter column to_variant_id drop not null,
  add column from_product_id uuid references public.product (id) on delete cascade,
  add column to_product_id   uuid references public.product (id) on delete cascade,
  add constraint product_relationship_type_check
    check (relationship_type in ('direct_successor', 'functional_replacement', 'substitute')),
  -- Both ends are Variants, or both are Products.
  add constraint product_relationship_level_check
    check ((num_nonnulls(from_variant_id, to_variant_id) = 2 and num_nonnulls(from_product_id, to_product_id) = 0)
        or (num_nonnulls(from_variant_id, to_variant_id) = 0 and num_nonnulls(from_product_id, to_product_id) = 2)),
  add constraint product_relationship_self_check
    check (from_variant_id is distinct from to_variant_id or from_variant_id is null),
  add constraint product_relationship_product_self_check
    check (from_product_id is distinct from to_product_id or from_product_id is null),
  add constraint product_relationship_unique
    unique nulls not distinct (from_variant_id, to_variant_id, from_product_id, to_product_id,
                               relationship_type, source_type, country);
create index product_relationship_to_product_idx on public.product_relationship (to_product_id)
  where to_product_id is not null;

drop policy product_relationship_select on public.product_relationship;
create policy product_relationship_select on public.product_relationship
  for select to authenticated
  using ((from_variant_id is not null
          and exists (select 1 from public.product_variant v where v.id = from_variant_id)
          and exists (select 1 from public.product_variant v where v.id = to_variant_id))
      or (from_product_id is not null
          and exists (select 1 from public.product p where p.id = from_product_id)
          and exists (select 1 from public.product p where p.id = to_product_id)));

-- -----------------------------------------------------------------------------
-- Recommendation scope (G1). Lines stay immutable; nothing ties a system
-- allocation's sum to its parent, and order lines keep the retailer's own
-- quantities, so recommendation, allocation and decision stay comparable.
-- -----------------------------------------------------------------------------
alter table public.recommendation_line rename column product_id to variant_id;
alter index public.recommendation_line_product_idx rename to recommendation_line_variant_idx;
alter table public.recommendation_line
  add column product_id     uuid not null references public.product (id) deferrable initially deferred,
  add column parent_line_id uuid,
  add constraint recommendation_line_variant_of_product_fk
    foreign key (variant_id, product_id) references public.product_variant (id, product_id)
    deferrable initially deferred,
  add constraint recommendation_line_parent_fk
    foreign key (parent_line_id, organization_id)
    references public.recommendation_line (id, organization_id) deferrable initially deferred,
  -- An allocation line names its Variant.
  add constraint recommendation_line_allocation_check
    check (parent_line_id is null or variant_id is not null),
  -- A need with no supplier is in canonical units.
  add constraint recommendation_line_canonical_units_check
    check (supplier_item_id is not null or units_per_order_unit = 1);
create index recommendation_line_product_idx on public.recommendation_line (product_id);
create index recommendation_line_parent_idx on public.recommendation_line (parent_line_id)
  where parent_line_id is not null;

-- Orders buy Variants.
alter table public.purchase_order_line rename column product_id to variant_id;
drop policy purchase_order_line_insert on public.purchase_order_line;
drop policy purchase_order_line_update on public.purchase_order_line;
create policy purchase_order_line_insert on public.purchase_order_line
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and (variant_id is null
                   or exists (select 1 from public.product_variant v where v.id = variant_id)));
create policy purchase_order_line_update on public.purchase_order_line
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and (variant_id is null
                   or exists (select 1 from public.product_variant v where v.id = variant_id)));

-- The order-line guard compared product_id; it now compares the Variant.
create or replace function app.purchase_order_line_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_origin text;
  order_status text;
  rec_quantity numeric;
  rec_units    numeric;
begin
  if tg_op = 'DELETE' then
    if app.current_user_id() is not null then
      raise exception 'purchase order lines are never deleted; set quantity to 0 instead';
    end if;
    return old;
  end if;

  select po.origin, po.status into order_origin, order_status
    from public.purchase_order po
   where po.id = new.purchase_order_id;

  if tg_op = 'INSERT' then
    if order_origin = 'platform' and order_status <> 'draft' then
      raise exception 'lines can only be added to a draft purchase order';
    end if;
    if new.recommendation_line_id is null then
      new.recommended_quantity := null;
    else
      -- A Variant (or allocation) line's quantity is this line's
      -- recommendation. A Product-level need's total isn't: it is compared
      -- with the sum of the lines that came from it (G1).
      select case when rl.variant_id is not null then rl.recommended_quantity end, rl.units_per_order_unit
        into rec_quantity, rec_units
        from public.recommendation_line rl
       where rl.id = new.recommendation_line_id;
      new.recommended_quantity := rec_quantity;
      new.units_per_order_unit := rec_units;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.purchase_order_id is distinct from old.purchase_order_id
     or new.recommended_quantity is distinct from old.recommended_quantity
     or (new.recommendation_line_id is distinct from old.recommendation_line_id
         and new.recommendation_line_id is not null) then
    raise exception 'purchase order line origin fields cannot change';
  end if;

  if order_origin = 'platform' and order_status <> 'draft'
     and (new.quantity, new.unit_cost, new.currency, new.variant_id, new.supplier_item_id,
          new.retailer_item_id, new.for_location_id, new.ship_to_location_id,
          new.requested_ship_date, new.units_per_order_unit, new.description)
         is distinct from
         (old.quantity, old.unit_cost, old.currency, old.variant_id, old.supplier_item_id,
          old.retailer_item_id, old.for_location_id, old.ship_to_location_id,
          old.requested_ship_date, old.units_per_order_unit, old.description) then
    raise exception 'purchase order is %; return it to draft before editing lines', order_status;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Program eligibility: a Product (model) or a Variant.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.program_eligibility where target_type in ('product', 'product_group')) then
    raise exception 'catalog_foundation expects no product-targeted program eligibility rows';
  end if;
end;
$$;

do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.program_eligibility'::regclass and contype = 'c'
              and (pg_get_constraintdef(oid) like '%target_type%')
  loop
    execute format('alter table public.program_eligibility drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.program_eligibility rename column product_id to variant_id;
alter table public.program_eligibility rename column product_group_id to product_id;
alter index public.program_eligibility_product_idx rename to program_eligibility_variant_idx;
alter table public.program_eligibility
  add constraint program_eligibility_target_type_check
    check (target_type in ('variant', 'product', 'category', 'brand', 'supplier_item', 'all', 'unresolved')),
  add constraint program_eligibility_target_check
    check (num_nonnulls(variant_id, product_id, category_id, brand_id, supplier_item_id)
           = case when target_type in ('all', 'unresolved') then 0 else 1 end),
  add constraint program_eligibility_variant_check check (target_type <> 'variant' or variant_id is not null),
  add constraint program_eligibility_product_check check (target_type <> 'product' or product_id is not null),
  add constraint program_eligibility_category_check check (target_type <> 'category' or category_id is not null),
  add constraint program_eligibility_brand_check check (target_type <> 'brand' or brand_id is not null),
  add constraint program_eligibility_supplier_item_check
    check (target_type <> 'supplier_item' or supplier_item_id is not null);

-- -----------------------------------------------------------------------------
-- Context and questions about a product: a whole Product, optionally one Variant.
-- -----------------------------------------------------------------------------
alter table public.context_item rename column product_id to variant_id;
alter table public.context_item
  add column product_id uuid references public.product (id) on delete cascade;
alter table public.context_item
  drop constraint context_item_scope_reference_check,
  drop constraint context_item_product_scope_check,
  add constraint context_item_scope_reference_check
    check (num_nonnulls(location_id, supplier_relationship_id, category_id, product_id, program_id,
                        recommendation_id, purchase_order_id)
           = case when scope_type = 'organization' then 0 else 1 end),
  add constraint context_item_product_scope_check
    check (scope_type <> 'product' or product_id is not null),
  add constraint context_item_variant_scope_check
    check (variant_id is null or scope_type = 'product'),
  add constraint context_item_variant_of_product_fk
    foreign key (variant_id, product_id) references public.product_variant (id, product_id);

drop policy context_item_insert on public.context_item;
drop policy context_item_update on public.context_item;
create policy context_item_insert on public.context_item
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and source_type = 'retailer_stated'
              and (program_id is null
                   or exists (select 1 from public.program p where p.id = program_id))
              and (product_id is null
                   or exists (select 1 from public.product p where p.id = product_id)));
create policy context_item_update on public.context_item
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and (program_id is null
                   or exists (select 1 from public.program p where p.id = program_id))
              and (product_id is null
                   or exists (select 1 from public.product p where p.id = product_id)));

alter table public.intelligence_question rename column product_id to variant_id;
alter table public.intelligence_question
  add column product_id uuid references public.product (id) on delete cascade;
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.intelligence_question'::regclass and contype = 'c'
              and (pg_get_constraintdef(oid) like '%num_nonnulls%'
                   or pg_get_constraintdef(oid) like '%''product''::text) OR (variant_id%')
  loop
    execute format('alter table public.intelligence_question drop constraint %I', c.conname);
  end loop;
end;
$$;
alter table public.intelligence_question
  add constraint intelligence_question_scope_reference_check
    check (num_nonnulls(location_id, supplier_relationship_id, category_id, product_id, purchase_order_id)
           = case when scope_type = 'organization' then 0 else 1 end),
  add constraint intelligence_question_product_scope_check
    check (scope_type <> 'product' or product_id is not null),
  add constraint intelligence_question_variant_scope_check
    check (variant_id is null or scope_type = 'product'),
  add constraint intelligence_question_variant_of_product_fk
    foreign key (variant_id, product_id) references public.product_variant (id, product_id);

-- -----------------------------------------------------------------------------
-- Attributes (G3): what an attribute is, and where it applies.
-- -----------------------------------------------------------------------------
create table public.attribute_definition (
  id          uuid primary key default gen_random_uuid(),
  industry    text not null,
  key         text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label       text not null,
  data_type   text not null check (data_type in ('text', 'number', 'integer', 'boolean', 'enum')),
  -- Unit of the normalized value (mm, ml, iso_bsd...); null when unitless.
  unit        text,
  -- For enums: allowed normalized values with their default labels,
  -- e.g. [{"value": "presta", "label": "Presta"}]. Labels are defaults only:
  -- an item keeps the designation it is sold under.
  allowed_values jsonb not null default '[]'::jsonb,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (industry, key)
);

create trigger attribute_definition_set_updated_at
  before update on public.attribute_definition
  for each row execute function app.set_updated_at();

-- Applies to its category and every descendant; a descendant's own row
-- overrides what it inherits. facet_priority is guidance for discovery, not
-- a fixed order.
create table public.category_attribute (
  id                      uuid primary key default gen_random_uuid(),
  category_id             uuid not null references public.category (id) on delete cascade,
  attribute_definition_id uuid not null references public.attribute_definition (id) on delete cascade,
  applies                 boolean not null default true,  -- false hides an inherited attribute here
  filterable              boolean not null default true,
  variant_axis            boolean not null default false,
  facet_priority          smallint not null default 50 check (facet_priority between 0 and 100),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (category_id, attribute_definition_id)
);

create trigger category_attribute_set_updated_at
  before update on public.category_attribute
  for each row execute function app.set_updated_at();

alter table public.attribute_definition enable row level security;
alter table public.category_attribute enable row level security;
create policy attribute_definition_select on public.attribute_definition
  for select to authenticated using (true);
create policy category_attribute_select on public.category_attribute
  for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Provenance: what each source said, and which statement is canonical.
-- -----------------------------------------------------------------------------
create table public.catalog_assertion (
  id                            uuid primary key default gen_random_uuid(),
  product_id                    uuid references public.product (id) on delete cascade,
  variant_id                    uuid references public.product_variant (id) on delete cascade,
  -- 'name', 'brand', 'description', 'category', or 'attribute:<key>'.
  field                         text not null check (field ~ '^(name|brand|description|category|attribute:[a-z][a-z0-9_]*)$'),
  -- As the source said it, and our normalized reading of it.
  source_value                  jsonb not null,
  normalized_value              jsonb,
  source_kind                   text not null
                                check (source_kind in ('supplier_item', 'retailer_item', 'manufacturer', 'steward', 'import')),
  source_supplier_item_id       uuid references public.supplier_item (id) on delete cascade,
  source_retailer_item_id       uuid,
  import_batch_id               uuid references public.import_batch (id) on delete set null,
  restricted_to_organization_id uuid references public.organization (id) on delete cascade,
  observed_at                   timestamptz not null default now(),
  -- The canonical statement for this field, who chose it and how sure.
  is_canonical                  boolean not null default false,
  chosen_by_type                text check (chosen_by_type in ('system', 'platform_admin')),
  chosen_at                     timestamptz,
  confidence                    public.confidence_score,
  created_at                    timestamptz not null default now(),
  check (num_nonnulls(product_id, variant_id) = 1),
  check (source_kind <> 'supplier_item' or source_supplier_item_id is not null),
  check (source_kind <> 'retailer_item' or source_retailer_item_id is not null),
  check (source_retailer_item_id is null or restricted_to_organization_id is not null),
  check (not is_canonical or (chosen_by_type is not null and chosen_at is not null)),
  foreign key (source_retailer_item_id, restricted_to_organization_id)
    references public.retailer_item (id, organization_id) on delete cascade
);

create unique index catalog_assertion_one_canonical_idx
  on public.catalog_assertion (coalesce(product_id, variant_id), field) where is_canonical;
create index catalog_assertion_subject_idx on public.catalog_assertion (product_id, variant_id, field);

-- A canonical statement may not be more restricted than what it describes:
-- a shared Product or Variant takes canonical values only from
-- platform-usable sources.
create or replace function app.guard_catalog_assertion_canonical()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  subject_org uuid;
begin
  if not new.is_canonical or new.restricted_to_organization_id is null then
    return new;
  end if;
  if new.product_id is not null then
    select origin_organization_id into subject_org from public.product where id = new.product_id;
  else
    select origin_organization_id into subject_org from public.product_variant where id = new.variant_id;
  end if;
  if subject_org is distinct from new.restricted_to_organization_id then
    raise exception 'a restricted source cannot set a canonical value on a shared or other retailer''s item';
  end if;
  return new;
end;
$$;

create trigger catalog_assertion_canonical_guard
  before insert or update on public.catalog_assertion
  for each row execute function app.guard_catalog_assertion_canonical();

alter table public.catalog_assertion enable row level security;
create policy catalog_assertion_select on public.catalog_assertion
  for select to authenticated
  using ((restricted_to_organization_id is null
          or restricted_to_organization_id in (select app.user_organization_ids()))
         and (exists (select 1 from public.product p where p.id = product_id)
              or exists (select 1 from public.product_variant v where v.id = variant_id)));

-- -----------------------------------------------------------------------------
-- Media: images and documents, with their source and rights.
-- -----------------------------------------------------------------------------
create table public.product_media (
  id                            uuid primary key default gen_random_uuid(),
  product_id                    uuid references public.product (id) on delete cascade,
  variant_id                    uuid references public.product_variant (id) on delete cascade,
  media_type                    text not null default 'image' check (media_type in ('image', 'document', 'video')),
  url                           text,
  storage_path                  text,
  alt_text                      text,
  sort_order                    integer not null default 0,
  source_kind                   text not null
                                check (source_kind in ('supplier_item', 'manufacturer', 'steward', 'import')),
  source_supplier_item_id       uuid references public.supplier_item (id) on delete cascade,
  restricted_to_organization_id uuid references public.organization (id) on delete cascade,
  created_at                    timestamptz not null default now(),
  check (num_nonnulls(product_id, variant_id) = 1),
  check (num_nonnulls(url, storage_path) = 1)
);
create index product_media_subject_idx on public.product_media (product_id, variant_id, sort_order);

alter table public.product_media enable row level security;
create policy product_media_select on public.product_media
  for select to authenticated
  using ((restricted_to_organization_id is null
          or restricted_to_organization_id in (select app.user_organization_ids()))
         and (exists (select 1 from public.product p where p.id = product_id)
              or exists (select 1 from public.product_variant v where v.id = variant_id)));

-- -----------------------------------------------------------------------------
-- Verified "not the same": never propose this pairing again.
-- -----------------------------------------------------------------------------
create table public.catalog_distinction (
  id                            uuid primary key default gen_random_uuid(),
  left_product_id               uuid references public.product (id) on delete cascade,
  right_product_id              uuid references public.product (id) on delete cascade,
  left_variant_id               uuid references public.product_variant (id) on delete cascade,
  right_variant_id              uuid references public.product_variant (id) on delete cascade,
  reason                        text,
  decided_by_type               text not null check (decided_by_type in ('system', 'user', 'platform_admin')),
  decided_by                    uuid,
  restricted_to_organization_id uuid references public.organization (id) on delete cascade,
  created_at                    timestamptz not null default now(),
  check ((num_nonnulls(left_product_id, right_product_id) = 2 and num_nonnulls(left_variant_id, right_variant_id) = 0)
      or (num_nonnulls(left_product_id, right_product_id) = 0 and num_nonnulls(left_variant_id, right_variant_id) = 2)),
  -- Stored once per pair, smaller id first.
  check (left_product_id < right_product_id or left_product_id is null),
  check (left_variant_id < right_variant_id or left_variant_id is null),
  unique nulls not distinct (left_product_id, right_product_id, left_variant_id, right_variant_id,
                             restricted_to_organization_id)
);

alter table public.catalog_distinction enable row level security;
create policy catalog_distinction_select on public.catalog_distinction
  for select to authenticated
  using (restricted_to_organization_id is null
         or restricted_to_organization_id in (select app.user_organization_ids()));

-- Catalog content is written server-side (imports, matching, stewardship).
revoke insert, update, delete on public.identifier_type, public.attribute_definition,
  public.category_attribute, public.catalog_assertion, public.product_media,
  public.catalog_distinction from authenticated;

-- -----------------------------------------------------------------------------
-- Tidy: foreign keys named after a column that was renamed take the new name.
-- -----------------------------------------------------------------------------
do $$
declare
  c record;
  target text;
begin
  for c in
    select con.conname, rel.relname, att.attname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace and ns.nspname = 'public'
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
     where con.contype = 'f' and array_length(con.conkey, 1) = 1
       and (con.conname like '%product_id_fkey%' or con.conname like '%product_group_id_fkey%')
     order by (att.attname like '%variant%') desc
  loop
    target := c.relname || '_' || c.attname || '_fkey';
    if c.conname <> target
       and not exists (select 1 from pg_constraint x
                        where x.conrelid = ('public.' || c.relname)::regclass and x.conname = target) then
      execute format('alter table public.%I rename constraint %I to %I', c.relname, c.conname, target);
    end if;
  end loop;
end;
$$;

-- =============================================================================
-- Supplier directory and shared reference data.
--
-- Visibility: all tables here are GLOBAL (readable by any signed-in user,
-- written only server-side). None of them contain retailer-specific or
-- supplier-confidential data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- supplier_market: a supplier company's operation in one country
-- (e.g. HLC US, HLC Canada).
-- -----------------------------------------------------------------------------
create table public.supplier_market (
  id                       uuid primary key default gen_random_uuid(),
  supplier_organization_id uuid not null,
  supplier_kind            text not null default 'supplier' check (supplier_kind = 'supplier'),
  name                     text not null,  -- display name, e.g. 'HLC Canada'
  country                  public.country_code not null,
  currency                 public.currency_code not null,
  status                   text not null default 'active' check (status in ('active', 'inactive')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  foreign key (supplier_organization_id, supplier_kind)
    references public.organization (id, kind) on delete cascade,
  unique (supplier_organization_id, country)
);

create trigger supplier_market_set_updated_at
  before update on public.supplier_market
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- supplier_warehouse: optional fulfillment locations for suppliers that
-- expose warehouse-level inventory. Never required.
-- -----------------------------------------------------------------------------
create table public.supplier_warehouse (
  id                 uuid primary key default gen_random_uuid(),
  supplier_market_id uuid not null references public.supplier_market (id) on delete cascade,
  code               text not null,  -- supplier's own warehouse code
  name               text,
  region             text,
  postal_code        text,
  country            public.country_code,
  status             text not null default 'active' check (status in ('active', 'inactive')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (supplier_market_id, code)
);

create trigger supplier_warehouse_set_updated_at
  before update on public.supplier_warehouse
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- brand: separate from supplier. A brand may be owned by a supplier company
-- (Trek) or sold by many distributors (Shimano via HLC, QBP...).
-- -----------------------------------------------------------------------------
create table public.brand (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  owner_organization_id uuid references public.organization (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index brand_name_unique_idx on public.brand (lower(name));

create trigger brand_set_updated_at
  before update on public.brand
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- category: our own taxonomy, per industry.
-- -----------------------------------------------------------------------------
create table public.category (
  id         uuid primary key default gen_random_uuid(),
  industry   text not null default 'bicycle',
  parent_id  uuid references public.category (id) deferrable initially deferred,
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (industry, parent_id, slug)
);

create trigger category_set_updated_at
  before update on public.category
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_group: ties variants of one model / model year together
-- (sizes, colors). Optional for any product.
-- -----------------------------------------------------------------------------
create table public.product_group (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid references public.brand (id) on delete set null,
  category_id uuid references public.category (id) on delete set null,
  name        text not null,
  model_year  smallint,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index product_group_brand_idx on public.product_group (brand_id);

create trigger product_group_set_updated_at
  before update on public.product_group
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security: read-only for signed-in users; writes are server-side.
-- -----------------------------------------------------------------------------
alter table public.supplier_market enable row level security;
alter table public.supplier_warehouse enable row level security;
alter table public.brand enable row level security;
alter table public.category enable row level security;
alter table public.product_group enable row level security;

create policy supplier_market_select on public.supplier_market
  for select to authenticated using (true);
create policy supplier_warehouse_select on public.supplier_warehouse
  for select to authenticated using (true);
create policy brand_select on public.brand
  for select to authenticated using (true);
create policy category_select on public.category
  for select to authenticated using (true);
create policy product_group_select on public.product_group
  for select to authenticated using (true);

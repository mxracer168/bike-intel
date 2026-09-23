-- =============================================================================
-- Integrations, provenance and audit.
--
-- Visibility (all OWNER-SCOPED: private to the owning organization, which is
-- a retailer today and may be a supplier later):
--   connection      external system connection + retention policy
--   document        uploaded files (bytes live in Supabase Storage)
--   import_batch    every pull/upload; raw payload pointer + retention state
--   sync_coverage   what each sync fully observed (distinguishes "unchanged"
--                   from "not observed")
--   change_log      who changed what, when; append-only
-- =============================================================================

-- -----------------------------------------------------------------------------
-- connection
-- -----------------------------------------------------------------------------
create table public.connection (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organization (id) on delete cascade,
  connection_type             text not null check (connection_type in ('pos', 'supplier')),
  -- Connector implementation, e.g. 'lightspeed_r_series', 'lightspeed_x_series', 'hlc'.
  provider                    text not null,
  method                      text not null check (method in ('api', 'file', 'manual')),
  supplier_market_id          uuid references public.supplier_market (id) deferrable initially deferred,
  -- What this connection can do: 'items', 'sales', 'inventory', 'purchase_orders',
  -- 'catalog', 'pricing', 'availability', 'ordering', 'order_status', ...
  capabilities                text[] not null default '{}',
  status                      text not null default 'pending'
                              check (status in ('pending', 'active', 'error', 'disconnected')),
  display_name                text,
  external_account_id         text,  -- account identifier in the external system
  -- Pointer to the secret in Supabase Vault. Credentials never live in this table.
  credentials_secret_id       uuid,
  -- How long raw API payloads may be kept, per the provider's terms.
  -- Defaults to transient (7 days) until the provider's terms are confirmed.
  raw_payload_retention       public.retention_mode not null default 'transient',
  raw_payload_retention_hours integer default 168 check (raw_payload_retention_hours > 0),
  -- How cached, normalized supplier observations (price/availability) may be kept.
  observation_retention       public.retention_mode not null default 'latest_only',
  observation_retention_hours integer check (observation_retention_hours > 0),
  -- Why these retention settings apply (agreement name/version, pending review...).
  retention_basis             text,
  last_synced_at              timestamptz,
  last_error                  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (id, organization_id),
  check (connection_type <> 'supplier' or supplier_market_id is not null),
  check (raw_payload_retention <> 'transient' or raw_payload_retention_hours is not null),
  check (observation_retention <> 'transient' or observation_retention_hours is not null)
);

create index connection_organization_idx on public.connection (organization_id);

create trigger connection_set_updated_at
  before update on public.connection
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- document: uploaded PDFs, spreadsheets, images, photographs.
-- Kept until deleted unless retain_until says otherwise.
-- -----------------------------------------------------------------------------
create table public.document (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  storage_bucket  text not null default 'documents',
  storage_path    text not null,
  file_name       text not null,
  mime_type       text,
  size_bytes      bigint check (size_bytes >= 0),
  content_sha256  text,  -- exact-duplicate detection within the owner's uploads
  document_type   text not null default 'other'
                  check (document_type in ('supplier_program', 'price_list', 'catalog', 'terms', 'other')),
  uploaded_by     uuid,
  uploaded_at     timestamptz not null default now(),
  retain_until    timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  unique (id, organization_id)
);

create index document_organization_idx on public.document (organization_id);

create trigger document_set_updated_at
  before update on public.document
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- import_batch: one row per API pull, file upload or manual import.
-- Normalized rows point here via import_batch_id and keep that link even
-- after the raw payload is purged under the retention policy.
-- organization_id is null only for platform-owned imports (server-only).
-- -----------------------------------------------------------------------------
create table public.import_batch (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid references public.organization (id) on delete cascade,
  connection_id      uuid,
  document_id        uuid,
  source_type        text not null
                     check (source_type in ('api_pull', 'file_upload', 'manual_entry', 'webhook')),
  data_type          text not null
                     check (data_type in ('items', 'sales', 'inventory', 'purchase_orders',
                                          'catalog', 'pricing', 'availability', 'program', 'other')),
  status             text not null default 'received'
                     check (status in ('received', 'processing', 'completed', 'partial', 'failed')),
  requested_from     timestamptz,
  requested_to       timestamptz,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  record_counts      jsonb not null default '{}'::jsonb,
  error_summary      text,
  -- Raw payload location in Supabase Storage (private bucket). Null when the
  -- provider does not permit storing it at all.
  raw_storage_bucket text,
  raw_storage_path   text,
  raw_content_sha256 text,
  raw_size_bytes     bigint check (raw_size_bytes >= 0),
  raw_retention      public.retention_mode,
  raw_expires_at     timestamptz,
  raw_purged_at      timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (connection_id, organization_id)
    references public.connection (id, organization_id) on delete set null (connection_id),
  foreign key (document_id, organization_id)
    references public.document (id, organization_id) on delete set null (document_id)
);

create index import_batch_organization_idx on public.import_batch (organization_id, started_at desc);
create index import_batch_raw_expiry_idx on public.import_batch (raw_expires_at)
  where raw_purged_at is null and raw_expires_at is not null;

-- -----------------------------------------------------------------------------
-- sync_coverage: "between covered_from and covered_to we have complete
-- knowledge of <data_type> at <location>". Without this, a gap in inventory
-- history is ambiguous: unchanged, or simply not observed?
-- location_id null = every location the sync covers.
-- -----------------------------------------------------------------------------
create table public.sync_coverage (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  connection_id   uuid not null,
  import_batch_id uuid not null,
  data_type       text not null check (data_type in ('items', 'sales', 'inventory', 'purchase_orders')),
  location_id     uuid,
  coverage_type   text not null check (coverage_type in ('full_snapshot', 'incremental')),
  covered_from    timestamptz not null,
  covered_to      timestamptz not null,
  completeness    text not null default 'complete'
                  check (completeness in ('complete', 'partial', 'failed')),
  notes           text,
  created_at      timestamptz not null default now(),
  check (covered_from <= covered_to),
  foreign key (connection_id, organization_id)
    references public.connection (id, organization_id) deferrable initially deferred,
  foreign key (import_batch_id, organization_id)
    references public.import_batch (id, organization_id) deferrable initially deferred,
  foreign key (location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred
);

create index sync_coverage_lookup_idx
  on public.sync_coverage (organization_id, data_type, location_id, covered_to desc);

-- -----------------------------------------------------------------------------
-- change_log: generic audit trail, written only by the app.log_change()
-- trigger. Updates are blocked for everyone. Deletes are only possible
-- server-side (e.g. honoring a data-deletion request).
-- -----------------------------------------------------------------------------
create table public.change_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,  -- no FK: the audit trail outlives the rows it describes
  table_name      text not null,
  row_id          uuid not null,
  action          text not null check (action in ('insert', 'update', 'delete')),
  -- insert/delete: full row. update: {column: {old, new}} for changed columns.
  changes         jsonb not null,
  actor_user_id   uuid,
  actor_type      text not null check (actor_type in ('user', 'system')),
  -- Optional reason, set by the application with:
  --   set local app.change_reason = '...';
  reason          text,
  changed_at      timestamptz not null default now()
);

create index change_log_row_idx on public.change_log (table_name, row_id, changed_at);
create index change_log_organization_idx on public.change_log (organization_id, changed_at desc);

create trigger change_log_no_update
  before update on public.change_log
  for each row execute function app.prevent_modification();

-- Attach with: execute function app.log_change('<organization column name>')
-- (omit the argument when the table has no organization column).
create or replace function app.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_column text := tg_argv[0];
  new_row    jsonb;
  old_row    jsonb;
  row_data   jsonb;
  diff       jsonb;
  actor      uuid := app.current_user_id();
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
  else
    row_data := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    new_row := to_jsonb(new);
    old_row := to_jsonb(old);
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('old', old_row -> n.key, 'new', n.value)),
                    '{}'::jsonb)
      into diff
      from jsonb_each(new_row) n
     where n.key <> 'updated_at'
       and n.value is distinct from old_row -> n.key;
    if diff = '{}'::jsonb then
      return null;
    end if;
  else
    diff := row_data;
  end if;

  insert into public.change_log
    (organization_id, table_name, row_id, action, changes, actor_user_id, actor_type, reason)
  values (
    case when org_column is not null then (row_data ->> org_column)::uuid end,
    tg_table_name,
    (row_data ->> 'id')::uuid,
    lower(tg_op),
    diff,
    actor,
    case when actor is null then 'system' else 'user' end,
    nullif(current_setting('app.change_reason', true), '')
  );
  return null;
end;
$$;

-- Audit tables created in earlier migrations.
create trigger organization_audit
  after insert or update or delete on public.organization
  for each row execute function app.log_change('id');
create trigger membership_audit
  after insert or update or delete on public.membership
  for each row execute function app.log_change('organization_id');
create trigger location_audit
  after insert or update or delete on public.location
  for each row execute function app.log_change('organization_id');
create trigger connection_audit
  after insert or update or delete on public.connection
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.connection enable row level security;
alter table public.document enable row level security;
alter table public.import_batch enable row level security;
alter table public.sync_coverage enable row level security;
alter table public.change_log enable row level security;

-- Connections are created/updated server-side (OAuth, credential handling).
create policy connection_select on public.connection
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy document_select on public.document
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy document_insert on public.document
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and uploaded_by = app.current_user_id());

create policy document_update on public.document
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids()));

create policy import_batch_select on public.import_batch
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy sync_coverage_select on public.sync_coverage
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy change_log_select on public.change_log
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

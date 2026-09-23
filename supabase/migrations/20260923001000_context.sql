-- =============================================================================
-- Retailer context: "What we know about your business".
--
-- Visibility: RETAILER-PRIVATE.
--
-- Every item has:
--   scope     what it applies to (organization, a location, a supplier
--             relationship, a program, a recommendation or a purchase order)
--   lifespan  evergreen (until changed) or temporary (expires/archives)
--   source    stated by the retailer, inferred by the system, or imported
-- Structured organization facts (name, addresses, locations) live in their
-- own tables; context holds beliefs and circumstances that shape buying.
-- =============================================================================

create table public.context_item (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organization (id) on delete cascade,
  scope_type               text not null
                           check (scope_type in ('organization', 'location', 'supplier_relationship',
                                                 'program', 'recommendation', 'purchase_order')),
  location_id              uuid,
  supplier_relationship_id uuid,
  program_id               uuid references public.program (id) on delete cascade,
  recommendation_id        uuid,
  purchase_order_id        uuid,
  lifespan                 text not null check (lifespan in ('evergreen', 'temporary')),
  -- Free-form grouping, e.g. 'growth_priority', 'supplier_preference',
  -- 'risk_tolerance', 'seasonality', 'local_market', 'weather', 'event'.
  category                 text,
  -- The belief in plain language, as shown back to the retailer.
  statement                text not null,
  structured_data          jsonb not null default '{}'::jsonb,
  source_type              text not null
                           check (source_type in ('retailer_stated', 'system_inferred', 'imported')),
  confidence               public.confidence_score,  -- mainly for inferred items
  -- Where it came from (conversation/message ids, document id...).
  source_reference         jsonb not null default '{}'::jsonb,
  valid_from               timestamptz not null default now(),
  expires_at               timestamptz,
  status                   text not null default 'active'
                           check (status in ('active', 'expired', 'archived', 'rejected', 'superseded')),
  superseded_by_id         uuid references public.context_item (id) on delete set null,
  -- When the retailer affirmed an inferred item.
  retailer_confirmed_at    timestamptz,
  created_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (expires_at is null or expires_at > valid_from),
  check (num_nonnulls(location_id, supplier_relationship_id, program_id, recommendation_id, purchase_order_id)
         = case when scope_type = 'organization' then 0 else 1 end),
  check (scope_type <> 'location' or location_id is not null),
  check (scope_type <> 'supplier_relationship' or supplier_relationship_id is not null),
  check (scope_type <> 'program' or program_id is not null),
  check (scope_type <> 'recommendation' or recommendation_id is not null),
  check (scope_type <> 'purchase_order' or purchase_order_id is not null),
  foreign key (location_id, organization_id)
    references public.location (id, organization_id) on delete cascade,
  foreign key (supplier_relationship_id, organization_id)
    references public.supplier_relationship (id, organization_id) on delete cascade,
  foreign key (recommendation_id, organization_id)
    references public.recommendation (id, organization_id) on delete cascade,
  foreign key (purchase_order_id, organization_id)
    references public.purchase_order (id, organization_id) on delete cascade
);

create index context_item_active_idx
  on public.context_item (organization_id, scope_type) where status = 'active';
create index context_item_expiry_idx
  on public.context_item (expires_at) where status = 'active' and expires_at is not null;

create trigger context_item_set_updated_at
  before update on public.context_item
  for each row execute function app.set_updated_at();

create trigger context_item_audit
  after insert or update or delete on public.context_item
  for each row execute function app.log_change('organization_id');

alter table public.context_item enable row level security;

create policy context_item_select on public.context_item
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

-- Retailers add what they state; inferred items are written server-side.
-- A program-scoped item must reference a program the retailer can see.
create policy context_item_insert on public.context_item
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and source_type = 'retailer_stated'
              and (program_id is null
                   or exists (select 1 from public.program p where p.id = program_id)));

create policy context_item_update on public.context_item
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and (program_id is null
                   or exists (select 1 from public.program p where p.id = program_id)));

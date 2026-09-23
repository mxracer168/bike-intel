-- =============================================================================
-- Recommendations and purchase orders.
--
-- Visibility: RETAILER-PRIVATE.
--
-- Four truths are preserved separately:
--   1. What the system recommended  -> recommendation_line (never edited)
--   2. What the buyer changed       -> change_log entries on purchase_order_line
--   3. What the buyer approved      -> purchase_order_line.approved_* (captured
--                                      automatically at approval)
--   4. What was actually submitted  -> purchase_order_line.submitted_* (captured
--                                      at submission, after live revalidation)
--
-- Quantities on recommendation and order lines are in ORDERING units (the
-- supplier's unit when a supplier item is known). units_per_order_unit
-- converts to canonical product units, frozen at the time of the decision.
--
-- The triggers in this file protect those records; they do not make buying
-- decisions. Recommendation logic lives in application code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- recommendation: the system's original output. Only its status changes.
--
-- Status:
--   open        actionable now
--   acted_on    the retailer acted (e.g. created an order from it)
--   dismissed   the retailer explicitly declined it
--   expired     the opportunity itself stopped being valid
--   unaddressed actionable_until passed with no retailer action
-- -----------------------------------------------------------------------------
create table public.recommendation (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organization (id) on delete cascade,
  recommendation_type      text not null check (recommendation_type in ('replenishment', 'preseason')),
  supplier_market_id       uuid references public.supplier_market (id) deferrable initially deferred,
  supplier_relationship_id uuid,
  program_version_id       uuid references public.program_version (id) deferrable initially deferred,
  status                   text not null default 'open'
                           check (status in ('open', 'acted_on', 'dismissed', 'expired', 'unaddressed')),
  status_changed_at        timestamptz,
  status_changed_by        uuid,
  status_reason            text,
  generated_at             timestamptz not null default now(),
  -- End of the meaningful action window; varies by recommendation.
  actionable_until         timestamptz,
  -- Which version of our recommendation logic produced this.
  method_version           text not null,
  -- Frozen inputs: context items used, weights of retailer vs industry
  -- signals, parameters. Enough to explain the recommendation later.
  inputs                   jsonb not null default '{}'::jsonb,
  summary                  text,
  currency                 public.currency_code,
  created_at               timestamptz not null default now(),
  unique (id, organization_id),
  check (actionable_until is null or actionable_until > generated_at),
  foreign key (supplier_relationship_id, organization_id)
    references public.supplier_relationship (id, organization_id) deferrable initially deferred
);

create index recommendation_organization_idx
  on public.recommendation (organization_id, status, generated_at desc);
create index recommendation_actionable_idx
  on public.recommendation (actionable_until) where status = 'open';

create trigger recommendation_audit
  after update on public.recommendation
  for each row execute function app.log_change('organization_id');

create or replace function app.guard_recommendation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['status', 'status_changed_at', 'status_changed_by', 'status_reason'])
     is distinct from
     (to_jsonb(old) - array['status', 'status_changed_at', 'status_changed_by', 'status_reason']) then
    raise exception 'recommendation % is immutable; only its status may change', old.id;
  end if;
  if new.status is distinct from old.status then
    if old.status <> 'open' then
      raise exception 'recommendation % is already %', old.id, old.status;
    end if;
    new.status_changed_at := now();
    new.status_changed_by := app.current_user_id();
  end if;
  return new;
end;
$$;

create trigger recommendation_guard
  before update on public.recommendation
  for each row execute function app.guard_recommendation();

-- -----------------------------------------------------------------------------
-- recommendation_line: fully immutable once written.
-- -----------------------------------------------------------------------------
create table public.recommendation_line (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null,
  recommendation_id          uuid not null,
  line_number                integer not null,
  product_id                 uuid references public.product (id) deferrable initially deferred,
  retailer_item_id           uuid,
  supplier_item_id           uuid references public.supplier_item (id) deferrable initially deferred,
  -- Where demand is; where the goods should ship.
  for_location_id            uuid not null,
  ship_to_location_id        uuid,
  recommended_quantity       public.quantity not null check (recommended_quantity >= 0),
  units_per_order_unit       public.quantity not null default 1 check (units_per_order_unit > 0),
  requested_ship_date        date,
  -- What the system believed at the time (needed to judge outcomes later).
  forecast_demand            public.quantity,  -- canonical units over the coverage period
  coverage_start             date,
  coverage_end               date,
  on_hand_at_generation      public.quantity,
  on_order_at_generation     public.quantity,
  assumed_unit_cost          public.monetary_amount,  -- per ordering unit
  currency                   public.currency_code,
  assumed_availability       text,
  assumed_available_quantity public.quantity,
  assumptions_observed_at    timestamptz,
  -- Plain reference (no FK): the observation may later be purged under the
  -- supplier's retention policy; the assumed_* values above remain.
  assumption_observation_id  uuid,
  reason_code                text,
  explanation                text,  -- plain-language "why"
  evidence                   jsonb not null default '{}'::jsonb,
  created_at                 timestamptz not null default now(),
  unique (recommendation_id, line_number),
  unique (id, organization_id),
  check (coverage_end is null or coverage_start is null or coverage_end >= coverage_start),
  check (assumed_unit_cost is null or currency is not null),
  foreign key (recommendation_id, organization_id)
    references public.recommendation (id, organization_id) on delete cascade,
  foreign key (retailer_item_id, organization_id)
    references public.retailer_item (id, organization_id) deferrable initially deferred,
  foreign key (for_location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred,
  foreign key (ship_to_location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred
);

create index recommendation_line_product_idx on public.recommendation_line (product_id);

create trigger recommendation_line_immutable
  before update on public.recommendation_line
  for each row execute function app.prevent_modification();

-- -----------------------------------------------------------------------------
-- purchase_order
--
-- origin 'platform': built here; lifecycle draft -> approved -> submitted,
--                    or draft -> discarded. approved -> draft reopens it.
-- origin 'pos':      mirrored from the retailer's POS; always 'submitted'.
-- After submission, fulfillment belongs to the supplier/POS; anything they
-- report back is mirrored into the external_* fields.
-- -----------------------------------------------------------------------------
create table public.purchase_order (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organization (id) on delete cascade,
  origin                   text not null default 'platform' check (origin in ('platform', 'pos')),
  status                   text not null default 'draft'
                           check (status in ('draft', 'approved', 'submitted', 'discarded')),
  supplier_market_id       uuid references public.supplier_market (id) deferrable initially deferred,
  supplier_relationship_id uuid,
  vendor_name_raw          text,  -- POS vendor name when not yet mapped to a supplier market
  program_version_id       uuid references public.program_version (id) deferrable initially deferred,
  recommendation_id        uuid,
  ship_to_location_id      uuid,  -- default for lines
  currency                 public.currency_code,
  reference_number         text,
  notes                    text,
  -- Lifecycle stamps (set by trigger, not by the client).
  approved_at              timestamptz,
  approved_by              uuid,
  submitted_at             timestamptz,
  submitted_by             uuid,
  submission_method        text
                           check (submission_method in ('supplier_api', 'email', 'export',
                                                        'entered_in_pos', 'other')),
  submission_reference     text,
  discarded_at             timestamptz,
  discarded_by             uuid,
  discard_reason           text,
  -- Mirrored from the POS / supplier when available.
  connection_id            uuid,
  import_batch_id          uuid references public.import_batch (id) on delete set null,
  external_id              text,
  external_number          text,
  external_status          text,
  external_status_at       timestamptz,
  external_data            jsonb not null default '{}'::jsonb,
  created_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (id, organization_id),
  unique (connection_id, external_id),
  check (origin = 'platform' or status = 'submitted'),
  check (origin = 'pos' or status not in ('approved', 'submitted') or approved_at is not null),
  check (origin = 'pos' or status <> 'submitted' or (submitted_at is not null and submission_method is not null)),
  check (status <> 'discarded' or discarded_at is not null),
  foreign key (supplier_relationship_id, organization_id)
    references public.supplier_relationship (id, organization_id) deferrable initially deferred,
  foreign key (recommendation_id, organization_id)
    references public.recommendation (id, organization_id) on delete set null (recommendation_id),
  foreign key (ship_to_location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred,
  foreign key (connection_id, organization_id)
    references public.connection (id, organization_id) on delete set null (connection_id)
);

create index purchase_order_organization_idx
  on public.purchase_order (organization_id, status, created_at desc);

create trigger purchase_order_set_updated_at
  before update on public.purchase_order
  for each row execute function app.set_updated_at();

create trigger purchase_order_audit
  after insert or update or delete on public.purchase_order
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- purchase_order_line
-- -----------------------------------------------------------------------------
create table public.purchase_order_line (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null,
  purchase_order_id      uuid not null,
  line_number            integer not null,
  -- Null when the buyer added the line themselves.
  recommendation_line_id uuid,
  product_id             uuid references public.product (id) deferrable initially deferred,
  supplier_item_id       uuid references public.supplier_item (id) deferrable initially deferred,
  retailer_item_id       uuid,
  description            text,
  for_location_id        uuid,
  ship_to_location_id    uuid,
  requested_ship_date    date,
  units_per_order_unit   public.quantity not null default 1 check (units_per_order_unit > 0),
  -- Truth 1 (copied from the recommendation line at creation; never edited).
  recommended_quantity   public.quantity,
  -- Working values while drafting. Lines are never deleted: set quantity to 0.
  quantity               public.quantity not null default 0 check (quantity >= 0),
  unit_cost              public.monetary_amount,
  currency               public.currency_code,
  -- Truth 3: captured automatically at approval.
  approved_quantity      public.quantity,
  approved_unit_cost     public.monetary_amount,
  -- Truth 4: captured at submission (after live revalidation when possible).
  submitted_quantity     public.quantity,
  submitted_unit_cost    public.monetary_amount,
  -- Final live check against the supplier before submission.
  validation_status      text not null default 'not_checked'
                         check (validation_status in ('not_checked', 'valid', 'changed', 'unavailable', 'failed')),
  validated_at           timestamptz,
  validation_details     jsonb not null default '{}'::jsonb,
  -- Mirrored after submission when the POS/supplier reports it.
  external_line_id       text,
  received_quantity      public.quantity,
  last_received_at       timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (purchase_order_id, line_number),
  check (unit_cost is null or currency is not null),
  foreign key (purchase_order_id, organization_id)
    references public.purchase_order (id, organization_id) on delete cascade,
  foreign key (recommendation_line_id, organization_id)
    references public.recommendation_line (id, organization_id) on delete set null (recommendation_line_id),
  foreign key (retailer_item_id, organization_id)
    references public.retailer_item (id, organization_id) deferrable initially deferred,
  foreign key (for_location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred,
  foreign key (ship_to_location_id, organization_id)
    references public.location (id, organization_id) deferrable initially deferred
);

create index purchase_order_line_order_idx on public.purchase_order_line (purchase_order_id);
create index purchase_order_line_recommendation_idx
  on public.purchase_order_line (recommendation_line_id) where recommendation_line_id is not null;

create trigger purchase_order_line_set_updated_at
  before update on public.purchase_order_line
  for each row execute function app.set_updated_at();

create trigger purchase_order_line_audit
  after insert or update or delete on public.purchase_order_line
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- Lifecycle integrity
-- -----------------------------------------------------------------------------

-- Header: allowed transitions + lifecycle stamps.
create or replace function app.purchase_order_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := app.current_user_id();
begin
  if new.origin is distinct from old.origin then
    raise exception 'purchase_order origin cannot change';
  end if;
  if new.status is not distinct from old.status or new.origin = 'pos' then
    return new;
  end if;

  if (old.status, new.status) not in (('draft', 'approved'), ('draft', 'discarded'),
                                      ('approved', 'draft'), ('approved', 'submitted')) then
    raise exception 'purchase_order cannot move from % to %', old.status, new.status;
  end if;

  if new.status = 'approved' then
    new.approved_at := now();
    new.approved_by := actor;
  elsif new.status = 'draft' then
    new.approved_at := null;
    new.approved_by := null;
  elsif new.status = 'submitted' then
    new.submitted_at := now();
    new.submitted_by := actor;
  elsif new.status = 'discarded' then
    new.discarded_at := now();
    new.discarded_by := actor;
  end if;
  return new;
end;
$$;

create trigger purchase_order_lifecycle
  before update on public.purchase_order
  for each row execute function app.purchase_order_before_update();

-- Header: capture approved / submitted values onto lines.
-- SECURITY DEFINER because clients are not granted direct write access to
-- the approved_* / submitted_* columns.
create or replace function app.purchase_order_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origin <> 'platform' or new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'approved' then
    update public.purchase_order_line
       set approved_quantity  = quantity,
           approved_unit_cost = unit_cost
     where purchase_order_id = new.id;
  elsif new.status = 'draft' then
    update public.purchase_order_line
       set approved_quantity  = null,
           approved_unit_cost = null
     where purchase_order_id = new.id;
  elsif new.status = 'submitted' then
    update public.purchase_order_line
       set submitted_quantity  = coalesce(submitted_quantity, approved_quantity),
           submitted_unit_cost = coalesce(submitted_unit_cost, approved_unit_cost)
     where purchase_order_id = new.id;
  end if;
  return null;
end;
$$;

create trigger purchase_order_capture_milestones
  after update on public.purchase_order
  for each row execute function app.purchase_order_after_update();

-- Lines: working values only change while the order is a draft; lines are
-- never deleted by users; recommended_quantity always comes from the
-- recommendation line.
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
      select rl.recommended_quantity, rl.units_per_order_unit into rec_quantity, rec_units
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
     and (new.quantity, new.unit_cost, new.currency, new.product_id, new.supplier_item_id,
          new.retailer_item_id, new.for_location_id, new.ship_to_location_id,
          new.requested_ship_date, new.units_per_order_unit, new.description)
         is distinct from
         (old.quantity, old.unit_cost, old.currency, old.product_id, old.supplier_item_id,
          old.retailer_item_id, old.for_location_id, old.ship_to_location_id,
          old.requested_ship_date, old.units_per_order_unit, old.description) then
    raise exception 'purchase order is %; return it to draft before editing lines', order_status;
  end if;
  return new;
end;
$$;

create trigger purchase_order_line_guard
  before insert or update or delete on public.purchase_order_line
  for each row execute function app.purchase_order_line_guard();

-- -----------------------------------------------------------------------------
-- Row-level security and column privileges
-- -----------------------------------------------------------------------------
alter table public.recommendation enable row level security;
alter table public.recommendation_line enable row level security;
alter table public.purchase_order enable row level security;
alter table public.purchase_order_line enable row level security;

-- Recommendations are generated server-side. Members may only change status.
create policy recommendation_select on public.recommendation
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy recommendation_update on public.recommendation
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids()));

revoke update on public.recommendation from authenticated;
grant update (status, status_reason) on public.recommendation to authenticated;

create policy recommendation_line_select on public.recommendation_line
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

-- Purchase orders: members create and work platform orders; POS orders are
-- mirrored server-side.
create policy purchase_order_select on public.purchase_order
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy purchase_order_insert on public.purchase_order
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and origin = 'platform'
              and status = 'draft'
              and created_by = app.current_user_id()
              and (program_version_id is null
                   or exists (select 1 from public.program_version v where v.id = program_version_id)));

create policy purchase_order_update on public.purchase_order
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()) and origin = 'platform')
  with check (organization_id in (select app.user_organization_ids()) and origin = 'platform');

revoke insert, update on public.purchase_order from authenticated;
grant insert (id, organization_id, origin, status, supplier_market_id, supplier_relationship_id,
              program_version_id, recommendation_id, ship_to_location_id, currency,
              reference_number, notes, created_by)
  on public.purchase_order to authenticated;
grant update (status, supplier_market_id, supplier_relationship_id, program_version_id,
              ship_to_location_id, currency, reference_number, notes,
              submission_method, submission_reference, discard_reason)
  on public.purchase_order to authenticated;

create policy purchase_order_line_select on public.purchase_order_line
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy purchase_order_line_insert on public.purchase_order_line
  for insert to authenticated
  with check (organization_id in (select app.user_organization_ids())
              and (product_id is null
                   or exists (select 1 from public.product p where p.id = product_id)));

create policy purchase_order_line_update on public.purchase_order_line
  for update to authenticated
  using (organization_id in (select app.user_organization_ids()))
  with check (organization_id in (select app.user_organization_ids())
              and (product_id is null
                   or exists (select 1 from public.product p where p.id = product_id)));

revoke insert, update on public.purchase_order_line from authenticated;
grant insert (id, organization_id, purchase_order_id, line_number, recommendation_line_id, product_id,
              supplier_item_id, retailer_item_id, description, for_location_id,
              ship_to_location_id, requested_ship_date, units_per_order_unit, quantity,
              unit_cost, currency)
  on public.purchase_order_line to authenticated;
grant update (product_id, supplier_item_id, retailer_item_id, description, for_location_id,
              ship_to_location_id, requested_ship_date, units_per_order_unit, quantity,
              unit_cost, currency)
  on public.purchase_order_line to authenticated;

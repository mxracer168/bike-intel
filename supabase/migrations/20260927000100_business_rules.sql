-- =============================================================================
-- Business rules: decisions the retailer has made about their business that
-- the system must respect until the retailer changes them ("We do not sell
-- road bikes."). See docs/business-rules.md.
--
-- Visibility: RETAILER-PRIVATE.
--
-- Kept apart from context_item on purpose. Context holds beliefs of every
-- kind (stated, inferred, imported; ongoing, seasonal, temporary) and is
-- written by the system as well as by any member. A business rule is the
-- highest-authority knowledge the retailer gives us, so:
--
--   * Organization-level only. The organization is the scope; location,
--     supplier, category and product rules will get their own deliberately
--     designed scope model later.
--   * HUMAN AUTHORITY ONLY. Every insert and update must come from a signed-in
--     user, acting through their own session (the `authenticated` role), who
--     is an active owner or admin of the organization. The database records
--     that user as the author. The service role, server-side jobs, AI agents
--     and anything else without a user session cannot create, edit or stop a
--     rule, even though some of them bypass row-level security. A future AI
--     suggestion ("Add this as a business rule?") must live somewhere else and
--     become a rule only when an owner or admin confirms it themselves.
--   * Lifecycle: active -> stopped. Stopping is final (the retailer adds the
--     rule again to bring it back) and keeps the row. Rows are never deleted
--     through the product; only removing the whole organization (a data
--     deletion request) cascades to them.
--   * History: change_log records every insert and every change with the
--     previous and new values (so the previous wording), the acting user and
--     the time.
-- =============================================================================

create table public.business_rule (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  -- The rule in the retailer's own words.
  statement       text not null check (char_length(btrim(statement)) between 1 and 500),
  status          text not null default 'active' check (status in ('active', 'stopped')),
  -- Set by the database from the acting user, never by the caller.
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_by      uuid not null,
  updated_at      timestamptz not null default now(),
  stopped_by      uuid,
  stopped_at      timestamptz,
  check ((status = 'stopped') = (stopped_at is not null)),
  check ((stopped_at is null) = (stopped_by is null))
);

create index business_rule_active_idx
  on public.business_rule (organization_id, created_at) where status = 'active';

-- -----------------------------------------------------------------------------
-- The human-authority boundary.
--
-- Deliberately NOT security definer: current_user must be the caller's own
-- role. Requests made with a user's session run as `authenticated`; the
-- service role runs as `service_role` and server-side code as the database
-- owner, so neither can pass by setting a user id in the request claims.
-- Membership is checked through app.user_admin_organization_ids(), which
-- reads the membership table on the caller's behalf.
-- -----------------------------------------------------------------------------
create or replace function app.business_rule_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := app.current_user_id();
begin
  if tg_op = 'DELETE' then
    -- Only a cascade from deleting the whole organization (trigger depth > 1).
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'Business rules cannot be deleted; stop the rule instead'
      using errcode = '42501';
  end if;

  if current_user <> 'authenticated' or actor is null then
    raise exception 'Business rules can only be changed by a signed-in owner or admin'
      using errcode = '42501';
  end if;

  if not exists (select 1 from app.user_admin_organization_ids() o where o = new.organization_id) then
    raise exception 'Only owners and admins can change business rules'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'active' then
      raise exception 'A new business rule starts active';
    end if;
    new.created_by := actor;
    new.created_at := now();
    new.updated_by := actor;
    new.updated_at := now();
    new.stopped_by := null;
    new.stopped_at := null;
    return new;
  end if;

  -- UPDATE
  if old.status = 'stopped' then
    raise exception 'A stopped business rule cannot be changed; add it again instead';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'A business rule cannot move to another organization';
  end if;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := actor;
  new.updated_at := now();
  if new.status = 'stopped' then
    new.stopped_by := actor;
    new.stopped_at := now();
  else
    new.stopped_by := null;
    new.stopped_at := null;
  end if;
  return new;
end;
$$;

create trigger business_rule_guard
  before insert or update or delete on public.business_rule
  for each row execute function app.business_rule_guard();

create trigger business_rule_audit
  after insert or update or delete on public.business_rule
  for each row execute function app.log_change('organization_id');

-- -----------------------------------------------------------------------------
-- Row-level security: members read; owners and admins write; nobody deletes.
-- -----------------------------------------------------------------------------
alter table public.business_rule enable row level security;

create policy business_rule_select on public.business_rule
  for select to authenticated
  using (organization_id in (select app.user_organization_ids()));

create policy business_rule_insert on public.business_rule
  for insert to authenticated
  with check (organization_id in (select app.user_admin_organization_ids()));

create policy business_rule_update on public.business_rule
  for update to authenticated
  using (organization_id in (select app.user_admin_organization_ids()))
  with check (organization_id in (select app.user_admin_organization_ids()));

-- TRUNCATE would skip the row triggers above: nobody may use it.
create or replace function app.business_rule_no_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Business rules cannot be truncated' using errcode = '42501';
end;
$$;

create trigger business_rule_no_truncate
  before truncate on public.business_rule
  for each statement execute function app.business_rule_no_truncate();

-- Only the wording and the status are ever changed by a user.
revoke all on public.business_rule from anon, authenticated;
grant select on public.business_rule to authenticated;
grant insert (organization_id, statement) on public.business_rule to authenticated;
grant update (statement, status) on public.business_rule to authenticated;

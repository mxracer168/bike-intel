-- =============================================================================
-- Foundation: shared types, helper schema, generic triggers.
--
-- Conventions used by every later migration:
--   * Primary keys are UUIDs (gen_random_uuid(), built into PostgreSQL 13+).
--   * Timestamps are timestamptz (stored in UTC). Local business dates are
--     stored separately as plain `date` columns where analysis needs them.
--   * Money is always an amount (monetary_amount) plus a currency_code.
--   * Quantities use the `quantity` type so fractional units are possible.
--   * Status-like columns are text + CHECK rather than Postgres enums, because
--     CHECK constraints are easy to change later; enums are not.
--   * Row-level security is enabled on every table in the migration that
--     creates it.
--   * Supabase-specific calls (auth.uid(), storage.*) are isolated in the
--     `app` helper functions and the storage migration, so the rest of the
--     schema is plain PostgreSQL.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- Helper schema. Not exposed through the Supabase Data API.
create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Shared value types
-- -----------------------------------------------------------------------------

-- Six decimal places so per-unit costs derived from pack pricing do not lose
-- precision. The UI may round for display; storage never does.
create domain public.monetary_amount as numeric(20, 6);

create domain public.currency_code as char(3)
  check (value ~ '^[A-Z]{3}$');

create domain public.country_code as char(2)
  check (value ~ '^[A-Z]{2}$');

-- Quantities are not assumed to be whole numbers (cable by the foot,
-- grease by the ounce, fractional pack math).
create domain public.quantity as numeric(18, 4);

create domain public.confidence_score as numeric(5, 4)
  check (value >= 0 and value <= 1);

create domain public.retention_mode as text
  check (value in ('history', 'latest_only', 'transient'));

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

-- The single place the schema depends on Supabase Auth. Replacing Supabase
-- means reimplementing this one function.
create or replace function app.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select auth.uid()
$$;

create or replace function app.is_valid_timezone(tz text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform timezone(tz, '2000-01-01 00:00:00+00'::timestamptz);
  return true;
exception when others then
  return false;
end;
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Blocks UPDATE and DELETE on append-only tables, for every role.
create or replace function app.prevent_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only; % is not allowed', tg_table_name, tg_op;
end;
$$;

-- Blocks DELETE by end users while allowing server-side deletes (e.g. a
-- cascade when a retailer's data is deleted on request).
create or replace function app.prevent_user_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.current_user_id() is not null then
    raise exception '% rows cannot be deleted', tg_table_name;
  end if;
  return old;
end;
$$;

grant execute on all functions in schema app to authenticated, service_role;

-- =============================================================================
-- Access hardening (defense in depth on top of row-level security).
--
--   * Signed-out visitors (anon) get no table access at all. Public supplier
--     pages for signed-out visitors can be granted deliberately later.
--   * Signed-in users cannot TRUNCATE (which bypasses RLS) or create
--     triggers/references on our tables.
--   * The same applies to tables created by future migrations.
-- =============================================================================

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;

-- Safety net: fail the migration if any public table lacks row-level security.
do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ') into missing
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity;
  if missing is not null then
    raise exception 'row-level security is not enabled on: %', missing;
  end if;
end;
$$;

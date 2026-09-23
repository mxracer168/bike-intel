-- =============================================================================
-- Tenant-isolation and integrity tests. Run by supabase/tests/local/run.sh
-- against a throwaway database. Any failed expectation aborts the run.
-- =============================================================================

\pset tuples_only on
\pset format unaligned

-- ---------------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------------
create schema t;
grant usage on schema t to anon, authenticated, service_role;

create function t.expect_error(stmt text, label text)
returns void language plpgsql as $$
declare
  failed boolean := false;
begin
  begin
    execute stmt;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL (expected an error): %', label;
  end if;
  raise notice 'ok  %', label;
end;
$$;

create function t.expect_count(stmt text, expected bigint, label text)
returns void language plpgsql as $$
declare
  actual bigint;
begin
  execute 'select count(*) from (' || stmt || ') q' into actual;
  if actual is distinct from expected then
    raise exception 'FAIL %: expected % rows, got %', label, expected, actual;
  end if;
  raise notice 'ok  %', label;
end;
$$;

create function t.expect_affected(stmt text, expected bigint, label text)
returns void language plpgsql as $$
declare
  actual bigint;
begin
  execute stmt;
  get diagnostics actual = row_count;
  if actual is distinct from expected then
    raise exception 'FAIL %: expected % rows affected, got %', label, expected, actual;
  end if;
  raise notice 'ok  %', label;
end;
$$;

create function t.expect_equal(actual text, expected text, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok  %', label;
end;
$$;

grant execute on all functions in schema t to anon, authenticated, service_role;

\set as_a 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-0000000000a1"}'', false) \\g /dev/null'
\set as_b 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-0000000000b1"}'', false) \\g /dev/null'
\set as_server 'reset role; select set_config(''request.jwt.claims'', '''', false) \\g /dev/null'
\set as_anon 'set role anon; select set_config(''request.jwt.claims'', '''', false) \\g /dev/null'

-- ---------------------------------------------------------------------------
-- Fixture data (written server-side)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.com');

insert into public.organization (id, kind, name, default_country) values
  ('10000000-0000-0000-0000-0000000000a1', 'retailer', 'Retailer A', 'US'),
  ('10000000-0000-0000-0000-0000000000b1', 'retailer', 'Retailer B', 'US'),
  ('10000000-0000-0000-0000-000000000c01', 'supplier', 'HLC', null);

insert into public.membership (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner');

insert into public.supplier_market (id, supplier_organization_id, name, country, currency) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000c01', 'HLC US', 'US', 'USD'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000c01', 'HLC Canada', 'CA', 'CAD');

insert into public.supplier_warehouse (id, supplier_market_id, code, name) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'WEST', 'West DC');

insert into public.location (id, organization_id, name, location_type, sells, country, timezone) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'A Main St', 'store', true, 'US', 'America/Denver'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'A Warehouse', 'warehouse', false, 'US', 'America/Denver'),
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'B Store', 'store', true, 'US', 'America/New_York');

insert into public.connection (id, organization_id, connection_type, provider, method, capabilities) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'pos', 'lightspeed_r_series', 'api', '{items,sales,inventory}'),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'pos', 'lightspeed_x_series', 'api', '{items,sales,inventory}');
insert into public.connection (id, organization_id, connection_type, provider, method, supplier_market_id,
                               raw_payload_retention, raw_payload_retention_hours, observation_retention)
values ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'supplier', 'hlc', 'api',
        '20000000-0000-0000-0000-000000000001', 'transient', 24, 'latest_only');

insert into public.import_batch (id, organization_id, connection_id, source_type, data_type, status) values
  ('45000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1',
   '40000000-0000-0000-0000-0000000000a1', 'api_pull', 'inventory', 'completed');

insert into public.brand (id, name) values ('55000000-0000-0000-0000-000000000001', 'Shimano');

insert into public.product (id, brand_id, name, status) values
  ('70000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', 'CN-M8100 12s chain', 'confirmed');
-- Provisional product built from Retailer A's private POS data.
insert into public.product (id, name, status, origin_organization_id) values
  ('70000000-0000-0000-0000-0000000000a1', 'Custom build for a customer', 'provisional', '10000000-0000-0000-0000-0000000000a1');
insert into public.product_identifier (product_id, identifier_type, value) values
  ('70000000-0000-0000-0000-000000000001', 'upc', '689228000001'),
  ('70000000-0000-0000-0000-0000000000a1', 'upc', '000000000999');

insert into public.supplier_item (id, supplier_market_id, supplier_sku, uom_raw, unit_type, pack_quantity,
                                  order_multiple, uom_normalization, upc) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'SH-CN8100', 'b/12', 'box', 12, 1, 'parsed', '689228000001');

insert into public.retailer_item (id, organization_id, connection_id, external_id, description, upc, item_kind) values
  ('50000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 'LS-1', 'Shimano 12s chain', '689228000001', 'product'),
  ('50000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', 'X-1', 'Chain', '689228000001', 'product');

insert into public.product_match (supplier_item_id, product_id, confidence, method) values
  ('60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 0.99, 'identifier');
insert into public.product_match (organization_id, retailer_item_id, product_id, confidence, method) values
  ('10000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-000000000001', 0.98, 'identifier'),
  ('10000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-0000000000b1', '70000000-0000-0000-0000-000000000001', 0.98, 'identifier');

insert into public.sale_line (organization_id, location_id, retailer_item_id, connection_id, external_line_id,
                              sold_at, business_date, quantity, unit_price, currency) values
  ('10000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1',
   '40000000-0000-0000-0000-0000000000a1', 'L1', '2026-09-20 03:30:00+00', '2026-09-19', 1, 64.99, 'USD'),
  ('10000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-0000000000b1',
   '40000000-0000-0000-0000-0000000000b1', 'L1', '2026-09-20 15:00:00+00', '2026-09-20', 2, 59.99, 'USD');

insert into public.inventory_history (organization_id, location_id, retailer_item_id, quantity_on_hand,
                                      valid_from, valid_to, valid_from_business_date, valid_to_business_date,
                                      last_confirmed_at, import_batch_id) values
  ('10000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1',
   3, '2026-09-01 00:00+00', '2026-09-20 03:30+00', '2026-08-31', '2026-09-19', '2026-09-19 12:00+00', '45000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1',
   2, '2026-09-20 03:30+00', null, '2026-09-19', null, '2026-09-23 12:00+00', '45000000-0000-0000-0000-0000000000a1');

insert into public.sync_coverage (organization_id, connection_id, import_batch_id, data_type, location_id,
                                  coverage_type, covered_from, covered_to) values
  ('10000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '45000000-0000-0000-0000-0000000000a1',
   'inventory', '30000000-0000-0000-0000-0000000000a1', 'incremental', '2026-09-01 00:00+00', '2026-09-23 12:00+00');

insert into public.supplier_relationship (id, organization_id, supplier_market_id, status, preference) values
  ('80000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000001', 'verified', 'neutral');

-- Official, public HLC program.
insert into public.program (id, owner_organization_id, supplier_market_id, name, season_label, visibility, provenance) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000c01', '20000000-0000-0000-0000-000000000001',
   'HLC Spring 2027 Booking', 'Spring 2027', 'public', 'supplier_uploaded');
insert into public.program_version (id, program_id, version_number, status, extraction_method, confirmed_at) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'confirmed', 'manual', now());

-- ===========================================================================
-- 1. Organizations, membership, locations
-- ===========================================================================
:as_a
select t.expect_count('select * from public.organization', 2, 'A sees its own org + supplier directory');
select t.expect_count('select * from public.organization where kind = ''retailer''', 1, 'A cannot see Retailer B');
select t.expect_count('select * from public.membership', 1, 'A sees only its own membership');
select t.expect_count('select * from public.location', 2, 'A sees only its own locations');
select t.expect_error($$insert into public.location (organization_id, name, country, timezone)
                        values ('10000000-0000-0000-0000-0000000000b1', 'Sneaky', 'US', 'UTC')$$,
                      'A cannot create a location for B');
select t.expect_error($$insert into public.location (organization_id, name, country, timezone)
                        values ('10000000-0000-0000-0000-0000000000a1', 'Bad TZ', 'US', 'Mars/Olympus')$$,
                      'invalid timezone rejected');
select t.expect_error($$update public.organization set kind = 'supplier' where id = '10000000-0000-0000-0000-0000000000a1'$$,
                      'A cannot turn itself into a supplier');
select t.expect_affected($$update public.organization set name = 'Renamed' where id = '10000000-0000-0000-0000-000000000c01'$$,
                      0, 'A cannot edit the supplier directory');

-- ===========================================================================
-- 2. Consent: separate, auditable, append-only
-- ===========================================================================
insert into public.organization_agreement (organization_id, agreement_type, agreement_version, decision, decided_by, presentation_id)
values ('10000000-0000-0000-0000-0000000000a1', 'platform_terms', '2026-09', 'accepted', '00000000-0000-0000-0000-0000000000a1', '99999999-0000-0000-0000-000000000001'),
       ('10000000-0000-0000-0000-0000000000a1', 'industry_intelligence', '2026-09', 'declined', '00000000-0000-0000-0000-0000000000a1', '99999999-0000-0000-0000-000000000001');
insert into public.organization_agreement (organization_id, agreement_type, agreement_version, decision, decided_by)
values ('10000000-0000-0000-0000-0000000000a1', 'industry_intelligence', '2026-09', 'accepted', '00000000-0000-0000-0000-0000000000a1');
select t.expect_equal(
  (select decision from public.organization_agreement_current
    where organization_id = '10000000-0000-0000-0000-0000000000a1' and agreement_type = 'industry_intelligence'),
  'accepted', 'latest industry-intelligence decision is current');
select t.expect_count('select * from public.organization_agreement', 3, 'full consent history retained');
select t.expect_affected($$update public.organization_agreement set decision = 'withdrawn'$$, 0, 'users cannot edit consent history');
:as_server
select t.expect_error($$update public.organization_agreement set decision = 'withdrawn'$$, 'consent history is append-only even server-side');
:as_a
select t.expect_error($$insert into public.organization_agreement (organization_id, agreement_type, agreement_version, decision, decided_by)
                        values ('10000000-0000-0000-0000-0000000000a1', 'platform_terms', 'x', 'accepted', '00000000-0000-0000-0000-0000000000b1')$$,
                      'A cannot record consent on behalf of another user');
:as_b
select t.expect_count('select * from public.organization_agreement', 0, 'B cannot see A''s consent');

-- ===========================================================================
-- 3. Catalog visibility and matching
-- ===========================================================================
:as_a
select t.expect_count('select * from public.product', 2, 'A sees global product + its own provisional product');
select t.expect_count('select * from public.product_identifier', 2, 'A sees identifiers of visible products');
select t.expect_count('select * from public.supplier_item', 1, 'supplier catalog is global');
select t.expect_count('select * from public.retailer_item', 1, 'A sees only its POS items');
select t.expect_count('select * from public.product_match', 2, 'A sees supplier-item match + its own item match');
select t.expect_count('select * from public.sale_line', 1, 'A sees only its own sales');
select t.expect_count('select * from public.inventory_history', 2, 'A sees its inventory history');
select t.expect_error($$update public.retailer_item set description = 'edited' where id = '50000000-0000-0000-0000-0000000000a1'$$,
                      'POS-mirrored item fields are read-only for users');
update public.retailer_item set stocking_intent = 'special_order_only', stocking_intent_source = 'retailer'
 where id = '50000000-0000-0000-0000-0000000000a1';
select t.expect_equal((select stocking_intent from public.retailer_item where id = '50000000-0000-0000-0000-0000000000a1'),
                      'special_order_only', 'retailer can set stocking intent');
select t.expect_error($$update public.product_match set product_id = '70000000-0000-0000-0000-0000000000a1'
                        where retailer_item_id = '50000000-0000-0000-0000-0000000000a1'$$,
                      'a match can never be re-pointed to a different product');
update public.product_match set status = 'rejected', decided_by_type = 'user',
       decided_by = '00000000-0000-0000-0000-0000000000a1', decided_at = now()
 where retailer_item_id = '50000000-0000-0000-0000-0000000000a1';
select t.expect_count($$select * from public.change_log where table_name = 'product_match'$$, 1, 'match correction is audited');
:as_b
select t.expect_count('select * from public.product', 1, 'B cannot see A''s provisional product');
select t.expect_count('select * from public.product_identifier', 1, 'B cannot see identifiers of A''s provisional product');
select t.expect_error($$insert into public.product_match (organization_id, retailer_item_id, product_id, confidence, method, decided_by_type, decided_by)
                        values ('10000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-0000000000b1',
                                '70000000-0000-0000-0000-0000000000a1', 1, 'manual', 'user', '00000000-0000-0000-0000-0000000000b1')$$,
                      'B cannot match to a product it cannot see');
select t.expect_error($$insert into public.product_match (organization_id, retailer_item_id, product_id, confidence, method, decided_by_type, decided_by)
                        values ('10000000-0000-0000-0000-0000000000b1', '50000000-0000-0000-0000-0000000000a1',
                                '70000000-0000-0000-0000-000000000001', 1, 'manual', 'user', '00000000-0000-0000-0000-0000000000b1')$$,
                      'B cannot match A''s retailer item');

-- ===========================================================================
-- 4. Relationships, terms, cached supplier data
-- ===========================================================================
:as_a
select t.expect_count('select * from public.supplier_relationship', 0, 'A cannot see B''s relationship');
select t.expect_error($$insert into public.supplier_relationship (organization_id, supplier_market_id, status)
                        values ('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'verified')$$,
                      'A cannot self-verify a relationship');
insert into public.supplier_relationship (id, organization_id, supplier_market_id, preference, created_by)
values ('80000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1',
        '20000000-0000-0000-0000-000000000001', 'preferred', '00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$update public.supplier_relationship set status = 'verified' where id = '80000000-0000-0000-0000-0000000000a1'$$,
                      'A cannot promote claimed -> verified');
insert into public.supplier_terms (organization_id, supplier_relationship_id, location_id, term_type, amount, currency, valid_from)
values ('10000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000a1',
        '30000000-0000-0000-0000-0000000000a2', 'free_freight_threshold', 250, 'USD', '2026-01-01');
select t.expect_error($$insert into public.supplier_terms (organization_id, supplier_relationship_id, location_id, term_type)
                        values ('10000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000a1',
                                '30000000-0000-0000-0000-0000000000b1', 'other')$$,
                      'terms cannot reference another tenant''s location');
:as_server
insert into public.supplier_offer_observation (organization_id, supplier_relationship_id, supplier_item_id, supplier_warehouse_id,
                                               unit_cost, currency, price_type, available_quantity, availability_status, observed_at)
values ('10000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-000000000001',
        null, 311.88, 'USD', 'customer', 40, 'in_stock', now()),
       ('10000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-000000000001',
        '21000000-0000-0000-0000-000000000001', null, null, null, 12, 'in_stock', now());
:as_a
select t.expect_count('select * from public.supplier_offer_observation', 2, 'A sees its aggregate + warehouse observations');
:as_b
select t.expect_count('select * from public.supplier_offer_observation', 0, 'B cannot see A''s supplier pricing');
select t.expect_count('select * from public.supplier_terms', 0, 'B cannot see A''s terms');

-- ===========================================================================
-- 4b. Retention: raw payloads vs normalized supplier observations
--     Raw payload retention and observation retention are independent.
--     Purging a raw payload must never delete or alter normalized
--     observations. Cleanup jobs are not built yet; this checks the schema.
-- ===========================================================================
:as_server

-- (1) An observation created from an API batch whose raw payload is transient.
insert into public.import_batch (id, organization_id, connection_id, source_type, data_type, status,
                                 raw_storage_bucket, raw_storage_path, raw_retention, raw_expires_at)
values ('46000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1',
        '40000000-0000-0000-0000-0000000000a2', 'api_pull', 'pricing', 'completed',
        'raw-imports', '10000000-0000-0000-0000-0000000000a1/hlc/pricing-001.json', 'transient',
        now() - interval '1 hour');
insert into storage.objects (bucket_id, name)
values ('raw-imports', '10000000-0000-0000-0000-0000000000a1/hlc/pricing-001.json');
insert into public.supplier_offer_observation
  (id, organization_id, supplier_relationship_id, supplier_item_id, supplier_warehouse_id, unit_cost, currency,
   price_type, available_quantity, availability_status, lead_time_days, observed_at, import_batch_id)
values ('47000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1',
        '80000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-000000000001',
        '21000000-0000-0000-0000-000000000001', 305.25, 'USD', 'customer', 18, 'in_stock', 2,
        '2026-09-22 14:05:00+00', '46000000-0000-0000-0000-0000000000a1');
select t.expect_equal(
  (select import_batch_id::text from public.supplier_offer_observation where id = '47000000-0000-0000-0000-0000000000a1'),
  '46000000-0000-0000-0000-0000000000a1', 'retention: observation created from an API batch');

create table t.observation_snapshot as
  select to_jsonb(o) as row_data from public.supplier_offer_observation o
   where id = '47000000-0000-0000-0000-0000000000a1';

-- (2) Purge the expired raw payload the way the future cleanup job will:
--     delete the stored file, then mark the batch as purged.
delete from storage.objects
 where bucket_id = 'raw-imports' and name = '10000000-0000-0000-0000-0000000000a1/hlc/pricing-001.json';
update public.import_batch
   set raw_purged_at = now(), raw_storage_path = null
 where id = '46000000-0000-0000-0000-0000000000a1' and raw_expires_at < now();
select t.expect_count($$select * from public.import_batch
                         where id = '46000000-0000-0000-0000-0000000000a1'
                           and raw_purged_at is not null and raw_storage_path is null$$,
                      1, 'retention: raw payload marked purged per its policy');
select t.expect_count($$select * from storage.objects where bucket_id = 'raw-imports'
                         and name = '10000000-0000-0000-0000-0000000000a1/hlc/pricing-001.json'$$,
                      0, 'retention: raw payload file removed');

-- (3) + (4) The observation is untouched: same row, same values, same observed_at.
select t.expect_equal(
  (select (to_jsonb(o) = s.row_data)::text
     from public.supplier_offer_observation o, t.observation_snapshot s
    where o.id = '47000000-0000-0000-0000-0000000000a1'),
  'true', 'retention: purging raw payload leaves the observation byte-for-byte unchanged');
select t.expect_equal(
  (select unit_cost::text || ' ' || currency || ' | ' || available_quantity::text || ' ' || availability_status
          || ' | ' || supplier_warehouse_id::text || ' | ' || (observed_at at time zone 'UTC')::text
     from public.supplier_offer_observation where id = '47000000-0000-0000-0000-0000000000a1'),
  '305.250000 USD | 18.0000 in_stock | 21000000-0000-0000-0000-000000000001 | 2026-09-22 14:05:00',
  'retention: normalized values and observed_at retained');

-- (5) Provenance: the batch record survives the purge, so the observation
--     still traces to its connection and that connection's retention policy.
select t.expect_equal(
  (select c.provider || ' / raw=' || c.raw_payload_retention || ' / obs=' || c.observation_retention
          || ' / purged=' || (b.raw_purged_at is not null)::text
     from public.supplier_offer_observation o
     join public.import_batch b on b.id = o.import_batch_id
     join public.connection c on c.id = b.connection_id
    where o.id = '47000000-0000-0000-0000-0000000000a1'),
  'hlc / raw=transient / obs=latest_only / purged=true',
  'retention: provenance traces observation -> batch -> connection after purge');
:as_a
select t.expect_count($$select * from public.supplier_offer_observation where id = '47000000-0000-0000-0000-0000000000a1'$$,
                      1, 'retention: retailer still sees the observation after purge');
:as_server
-- Even if a batch record were removed entirely, the observation survives
-- (the link is cleared, the observation is not deleted).
insert into public.import_batch (id, organization_id, connection_id, source_type, data_type, status)
values ('46000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1',
        '40000000-0000-0000-0000-0000000000a2', 'api_pull', 'pricing', 'completed');
insert into public.supplier_offer_observation
  (id, organization_id, supplier_relationship_id, supplier_item_id, unit_cost, currency, observed_at, import_batch_id)
values ('47000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1',
        '80000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-000000000001', 306.00, 'USD',
        '2026-09-21 09:00:00+00', '46000000-0000-0000-0000-0000000000a2');
delete from public.import_batch where id = '46000000-0000-0000-0000-0000000000a2';
select t.expect_equal(
  (select coalesce(import_batch_id::text, 'null') || ' ' || unit_cost::text
     from public.supplier_offer_observation where id = '47000000-0000-0000-0000-0000000000a2'),
  'null 306.000000', 'retention: deleting a batch record keeps the observation');

-- (6) A connection with observation_retention = 'history' keeps every observation.
insert into public.connection (id, organization_id, connection_type, provider, method, supplier_market_id,
                               raw_payload_retention, raw_payload_retention_hours, observation_retention,
                               retention_basis)
values ('40000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b1', 'supplier', 'hlc', 'api',
        '20000000-0000-0000-0000-000000000001', 'transient', 168, 'history', 'test: history permitted');
insert into public.import_batch (id, organization_id, connection_id, source_type, data_type, status,
                                 raw_retention, raw_expires_at)
values ('46000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1',
        '40000000-0000-0000-0000-0000000000b2', 'api_pull', 'pricing', 'completed', 'transient', now() - interval '1 day'),
       ('46000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b1',
        '40000000-0000-0000-0000-0000000000b2', 'api_pull', 'pricing', 'completed', 'transient', now() - interval '1 day'),
       ('46000000-0000-0000-0000-0000000000b3', '10000000-0000-0000-0000-0000000000b1',
        '40000000-0000-0000-0000-0000000000b2', 'api_pull', 'pricing', 'completed', 'transient', now() + interval '6 days');
insert into public.supplier_offer_observation
  (organization_id, supplier_relationship_id, supplier_item_id, unit_cost, currency, available_quantity,
   availability_status, observed_at, import_batch_id)
values ('10000000-0000-0000-0000-0000000000b1', '80000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-000000000001',
        299.00, 'USD', 50, 'in_stock', '2026-09-01 12:00+00', '46000000-0000-0000-0000-0000000000b1'),
       ('10000000-0000-0000-0000-0000000000b1', '80000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-000000000001',
        309.00, 'USD', 12, 'limited', '2026-09-10 12:00+00', '46000000-0000-0000-0000-0000000000b2'),
       ('10000000-0000-0000-0000-0000000000b1', '80000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-000000000001',
        314.00, 'USD', 0, 'out_of_stock', '2026-09-20 12:00+00', '46000000-0000-0000-0000-0000000000b3');
-- Purge the two expired raw payloads.
update public.import_batch set raw_purged_at = now()
 where connection_id = '40000000-0000-0000-0000-0000000000b2' and raw_expires_at < now();
select t.expect_count($$select * from public.import_batch
                         where connection_id = '40000000-0000-0000-0000-0000000000b2' and raw_purged_at is not null$$,
                      2, 'retention: expired raw payloads purged on history connection');
:as_b
select t.expect_count($$select * from public.supplier_offer_observation
                         where supplier_item_id = '60000000-0000-0000-0000-000000000001'
                           and supplier_warehouse_id is null$$,
                      3, 'retention: history connection keeps all observations of one item over time');
select t.expect_equal(
  (select string_agg(unit_cost::text, ',' order by observed_at)
     from public.supplier_offer_observation
    where supplier_item_id = '60000000-0000-0000-0000-000000000001' and supplier_warehouse_id is null),
  '299.000000,309.000000,314.000000', 'retention: price history readable in order after raw purge');
select t.expect_equal(
  (select unit_cost::text from public.supplier_offer_observation
    where supplier_item_id = '60000000-0000-0000-0000-000000000001' and supplier_warehouse_id is null
    order by observed_at desc limit 1),
  '314.000000', 'retention: latest observation is still directly queryable');

-- (7) latest_only is not enforced by a uniqueness constraint: the table can
--     hold several observations for the same item; replacing them is the
--     future sync job's responsibility.
:as_server
select t.expect_count($$select 1 from pg_index i
                         where i.indrelid = 'public.supplier_offer_observation'::regclass
                           and i.indisunique and not i.indisprimary$$,
                      0, 'retention: no uniqueness constraint forces one observation per item');
insert into public.supplier_offer_observation
  (organization_id, supplier_relationship_id, supplier_item_id, supplier_warehouse_id, unit_cost, currency,
   available_quantity, availability_status, observed_at)
values ('10000000-0000-0000-0000-0000000000a1', '80000000-0000-0000-0000-0000000000a1',
        '60000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 307.75, 'USD', 9,
        'limited', '2026-09-23 08:00:00+00');
select t.expect_count($$select * from public.supplier_offer_observation
                         where supplier_relationship_id = '80000000-0000-0000-0000-0000000000a1'
                           and supplier_item_id = '60000000-0000-0000-0000-000000000001'
                           and supplier_warehouse_id = '21000000-0000-0000-0000-000000000001'
                           and unit_cost in (305.25, 307.75)$$,
                      2, 'retention: latest_only connection is structurally capable of history');
select t.expect_equal(
  (select observation_retention from public.connection where id = '40000000-0000-0000-0000-0000000000a2'),
  'latest_only', 'retention: latest_only is a connection setting, left to the sync job');
drop table t.observation_snapshot;
:as_b

-- ===========================================================================
-- 5. Programs: private uploads, public programs, links
-- ===========================================================================
:as_a
insert into public.program (id, owner_organization_id, supplier_market_id, name, season_label, provenance, created_by)
values ('a0000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001',
        'HLC Spring 27 (my copy)', 'Spring 2027', 'retailer_uploaded', '00000000-0000-0000-0000-0000000000a1');
insert into public.program_version (id, program_id, version_number, extraction_method)
values ('a1000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 1, 'ai');
insert into public.program_rule (program_version_id, rule_type, tier_label, threshold_type, threshold_value, threshold_currency,
                                 benefit_type, benefit_value, source_text)
values ('a1000000-0000-0000-0000-0000000000a1', 'tier', 'Gold', 'amount', 10000, 'USD', 'percent_discount', 12,
        'Book $10,000+ and receive 12% off (your negotiated rate)');
select t.expect_error($$insert into public.program (owner_organization_id, supplier_market_id, name, provenance, visibility)
                        values ('10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', 'x', 'retailer_uploaded', 'public')$$,
                      'retailer cannot publish a program publicly');
select t.expect_error($$update public.program set visibility = 'public' where id = 'a0000000-0000-0000-0000-0000000000a1'$$,
                      'retailer cannot make its private program public');
select t.expect_error($$insert into public.program_rule (program_version_id, rule_type) values ('a1000000-0000-0000-0000-000000000001', 'other')$$,
                      'A cannot edit the supplier''s official program');
insert into public.program_link (organization_id, private_program_id, official_program_id, status, decided_by, decided_at)
values ('10000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000001',
        'confirmed', '00000000-0000-0000-0000-0000000000a1', now());
select t.expect_count('select * from public.program', 2, 'A sees its private program + the public one');
update public.program_version set status = 'confirmed', confirmed_at = now(), confirmed_by = '00000000-0000-0000-0000-0000000000a1'
 where id = 'a1000000-0000-0000-0000-0000000000a1';
select t.expect_error($$update public.program_version set summary = 'changed' where id = 'a1000000-0000-0000-0000-0000000000a1'$$,
                      'confirmed program version is frozen');
select t.expect_error($$insert into public.program_rule (program_version_id, rule_type) values ('a1000000-0000-0000-0000-0000000000a1', 'other')$$,
                      'rules of a confirmed version are frozen');
:as_b
select t.expect_count('select * from public.program', 1, 'B sees only the public program');
select t.expect_count('select * from public.program_rule', 0, 'B cannot see A''s private program terms');
select t.expect_count('select * from public.program_link', 0, 'B cannot see A''s program link');
select t.expect_error($$insert into public.program_link (organization_id, private_program_id, official_program_id)
                        values ('10000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000001')$$,
                      'B cannot link A''s private program');

-- ===========================================================================
-- 6. Recommendations: immutable output, status lifecycle
-- ===========================================================================
:as_server
insert into public.recommendation (id, organization_id, recommendation_type, supplier_market_id, supplier_relationship_id,
                                   actionable_until, method_version, inputs, currency)
values ('90000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'replenishment',
        '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-0000000000a1',
        now() + interval '3 days', 'replen-0.1', '{"retailer_weight": 0.8}', 'USD'),
       ('90000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'replenishment',
        '20000000-0000-0000-0000-000000000001', null, now() + interval '3 days', 'replen-0.1', '{}', 'USD');
insert into public.recommendation_line (id, organization_id, recommendation_id, line_number, product_id, retailer_item_id,
                                        supplier_item_id, for_location_id, ship_to_location_id, recommended_quantity,
                                        units_per_order_unit, forecast_demand, coverage_start, coverage_end,
                                        on_hand_at_generation, assumed_unit_cost, currency, explanation)
values ('91000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-0000000000a1', 1,
        '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a2', 1, 12, 8, '2026-09-24', '2026-10-22',
        2, 311.88, 'USD', 'Order 1 box of 12. You sell about 2 a week and have 2 left.');
:as_a
select t.expect_error($$update public.recommendation set summary = 'tampered' where id = '90000000-0000-0000-0000-0000000000a1'$$,
                      'recommendation content cannot be edited');
select t.expect_affected($$update public.recommendation_line set recommended_quantity = 5$$, 0,
                      'users cannot edit recommendation lines');
:as_server
select t.expect_error($$update public.recommendation_line set recommended_quantity = 5$$,
                      'recommendation lines are immutable even server-side');
:as_a
update public.recommendation set status = 'dismissed', status_reason = 'Buying elsewhere this month'
 where id = '90000000-0000-0000-0000-0000000000a2';
select t.expect_equal((select status_changed_by::text from public.recommendation where id = '90000000-0000-0000-0000-0000000000a2'),
                      '00000000-0000-0000-0000-0000000000a1', 'status change is stamped with the user');
select t.expect_error($$update public.recommendation set status = 'open' where id = '90000000-0000-0000-0000-0000000000a2'$$,
                      'a closed recommendation cannot be reopened');
:as_server
select t.expect_error($$update public.recommendation set status = 'bogus' where id = '90000000-0000-0000-0000-0000000000a1'$$,
                      'invalid recommendation status rejected');
:as_b
select t.expect_count('select * from public.recommendation', 0, 'B cannot see A''s recommendations');

-- ===========================================================================
-- 7. Purchase orders: draft -> approved -> submitted, four truths
-- ===========================================================================
:as_a
insert into public.purchase_order (id, organization_id, supplier_market_id, supplier_relationship_id, recommendation_id,
                                   ship_to_location_id, currency, created_by)
values ('92000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-0000000000a1',
        '30000000-0000-0000-0000-0000000000a2', 'USD', '00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$insert into public.purchase_order_line (organization_id, purchase_order_id, line_number, recommended_quantity, quantity)
                        values ('10000000-0000-0000-0000-0000000000a1', '92000000-0000-0000-0000-0000000000a1', 9, 99, 1)$$,
                      'users cannot write recommended_quantity directly');
-- Created from the recommendation line; recommended_quantity is copied by the database.
insert into public.purchase_order_line (id, organization_id, purchase_order_id, line_number, recommendation_line_id, product_id,
                                        supplier_item_id, for_location_id, ship_to_location_id, quantity, unit_cost, currency)
values ('93000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', '92000000-0000-0000-0000-0000000000a1', 1,
        '91000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a2', 1, 311.88, 'USD');
-- A line the buyer added themselves.
insert into public.purchase_order_line (id, organization_id, purchase_order_id, line_number, description, for_location_id, quantity)
values ('93000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', '92000000-0000-0000-0000-0000000000a1', 2,
        'Chain lube', '30000000-0000-0000-0000-0000000000a1', 6);
select t.expect_equal((select recommended_quantity::text from public.purchase_order_line where id = '93000000-0000-0000-0000-0000000000a1'),
                      '1.0000', 'truth 1: recommended quantity copied from recommendation');
select t.expect_equal((select units_per_order_unit::text from public.purchase_order_line where id = '93000000-0000-0000-0000-0000000000a1'),
                      '12.0000', 'pack conversion frozen from recommendation');
select t.expect_equal((select coalesce(recommended_quantity::text, 'null') from public.purchase_order_line where id = '93000000-0000-0000-0000-0000000000a2'),
                      'null', 'buyer-added line has no recommendation');

-- Truth 2: buyer changes are logged.
update public.purchase_order_line set quantity = 2 where id = '93000000-0000-0000-0000-0000000000a1';
select t.expect_count($$select * from public.change_log
                         where table_name = 'purchase_order_line' and row_id = '93000000-0000-0000-0000-0000000000a1'
                           and action = 'update' and changes ? 'quantity'$$, 1, 'truth 2: buyer edit logged');
select t.expect_affected($$delete from public.purchase_order_line where id = '93000000-0000-0000-0000-0000000000a2'$$, 0,
                      'lines are never deleted by users');
select t.expect_error($$update public.purchase_order_line set approved_quantity = 50 where id = '93000000-0000-0000-0000-0000000000a1'$$,
                      'users cannot write approved values directly');
select t.expect_error($$update public.purchase_order set status = 'submitted', submission_method = 'email'
                        where id = '92000000-0000-0000-0000-0000000000a1'$$,
                      'draft cannot skip approval');

-- Truth 3: approval captures values.
update public.purchase_order set status = 'approved' where id = '92000000-0000-0000-0000-0000000000a1';
select t.expect_equal((select approved_quantity::text from public.purchase_order_line where id = '93000000-0000-0000-0000-0000000000a1'),
                      '2.0000', 'truth 3: approved quantity captured');
select t.expect_equal((select (approved_by = '00000000-0000-0000-0000-0000000000a1')::text from public.purchase_order
                        where id = '92000000-0000-0000-0000-0000000000a1'), 'true', 'approval stamped with user');
select t.expect_error($$update public.purchase_order_line set quantity = 3 where id = '93000000-0000-0000-0000-0000000000a1'$$,
                      'approved order lines cannot be edited');

-- Reopen, edit, re-approve.
update public.purchase_order set status = 'draft' where id = '92000000-0000-0000-0000-0000000000a1';
select t.expect_equal((select coalesce(approved_quantity::text, 'null') from public.purchase_order_line
                        where id = '93000000-0000-0000-0000-0000000000a1'), 'null', 'reopening clears the stale approval');
update public.purchase_order_line set quantity = 3 where id = '93000000-0000-0000-0000-0000000000a1';
update public.purchase_order set status = 'approved' where id = '92000000-0000-0000-0000-0000000000a1';

-- Truth 4: submission captures values (server revalidated line 1's price first).
:as_server
update public.purchase_order_line
   set submitted_unit_cost = 309.50, validation_status = 'changed', validated_at = now(),
       validation_details = '{"note": "price dropped at live check"}'
 where id = '93000000-0000-0000-0000-0000000000a1';
:as_a
select t.expect_error($$update public.purchase_order set status = 'submitted' where id = '92000000-0000-0000-0000-0000000000a1'$$,
                      'submission requires a submission method');
update public.purchase_order set status = 'submitted', submission_method = 'email' where id = '92000000-0000-0000-0000-0000000000a1';
select t.expect_equal((select submitted_quantity::text || ' @ ' || submitted_unit_cost::text from public.purchase_order_line
                        where id = '93000000-0000-0000-0000-0000000000a1'),
                      '3.0000 @ 309.500000', 'truth 4: submitted values captured (revalidated price kept)');
select t.expect_equal((select recommended_quantity::text || '/' || approved_quantity::text || '/' || submitted_quantity::text
                         from public.purchase_order_line where id = '93000000-0000-0000-0000-0000000000a1'),
                      '1.0000/3.0000/3.0000', 'all four truths recoverable side by side');
select t.expect_error($$update public.purchase_order set status = 'discarded' where id = '92000000-0000-0000-0000-0000000000a1'$$,
                      'a submitted order cannot be discarded');
select t.expect_error($$update public.purchase_order set status = 'draft' where id = '92000000-0000-0000-0000-0000000000a1'$$,
                      'a submitted order cannot be reopened');

-- Discard path.
insert into public.purchase_order (id, organization_id, currency, created_by)
values ('92000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'USD', '00000000-0000-0000-0000-0000000000a1');
update public.purchase_order set status = 'discarded', discard_reason = 'Decided to wait for the booking program'
 where id = '92000000-0000-0000-0000-0000000000a2';
select t.expect_count($$select * from public.purchase_order where status = 'discarded' and discarded_at is not null$$,
                      1, 'discarded order preserved with stamp');
select t.expect_error($$insert into public.purchase_order (organization_id, origin, status, created_by)
                        values ('10000000-0000-0000-0000-0000000000a1', 'pos', 'submitted', '00000000-0000-0000-0000-0000000000a1')$$,
                      'users cannot fabricate POS-origin orders');
:as_b
select t.expect_count('select * from public.purchase_order', 0, 'B cannot see A''s orders');
select t.expect_error($$insert into public.purchase_order (id, organization_id, currency, created_by)
                        values ('92000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'USD',
                                '00000000-0000-0000-0000-0000000000b1');
                        insert into public.purchase_order_line (organization_id, purchase_order_id, line_number, product_id, quantity)
                        values ('10000000-0000-0000-0000-0000000000b1', '92000000-0000-0000-0000-0000000000b1', 1,
                                '70000000-0000-0000-0000-0000000000a1', 1)$$,
                      'order lines cannot reference a product the buyer cannot see');
select t.expect_error($$insert into public.purchase_order_line (organization_id, purchase_order_id, line_number, quantity)
                        values ('10000000-0000-0000-0000-0000000000b1', '92000000-0000-0000-0000-0000000000a1', 5, 1)$$,
                      'B cannot add lines to A''s order');

-- ===========================================================================
-- 8. Context
-- ===========================================================================
:as_a
insert into public.context_item (organization_id, scope_type, lifespan, category, statement, source_type, created_by)
values ('10000000-0000-0000-0000-0000000000a1', 'organization', 'evergreen', 'growth_priority',
        'We want to grow e-MTB sales.', 'retailer_stated', '00000000-0000-0000-0000-0000000000a1');
insert into public.context_item (organization_id, scope_type, location_id, lifespan, category, statement, source_type,
                                 expires_at, created_by)
values ('10000000-0000-0000-0000-0000000000a1', 'location', '30000000-0000-0000-0000-0000000000a1', 'temporary', 'weather',
        'Unusually wet for the next three weeks.', 'retailer_stated', now() + interval '21 days',
        '00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$insert into public.context_item (organization_id, scope_type, lifespan, statement, source_type)
                        values ('10000000-0000-0000-0000-0000000000a1', 'organization', 'evergreen', 'x', 'system_inferred')$$,
                      'users cannot insert system-inferred context');
select t.expect_error($$insert into public.context_item (organization_id, scope_type, lifespan, statement, source_type)
                        values ('10000000-0000-0000-0000-0000000000a1', 'location', 'evergreen', 'x', 'retailer_stated')$$,
                      'scope must match its reference');
select t.expect_count('select * from public.context_item', 2, 'A sees its context');
:as_b
select t.expect_count('select * from public.context_item', 0, 'B cannot see A''s context');
select t.expect_count($$select * from public.change_log where organization_id <> '10000000-0000-0000-0000-0000000000b1'$$,
                      0, 'B sees only its own audit trail');

-- ===========================================================================
-- 9. Storage and signed-out access
-- ===========================================================================
:as_a
insert into storage.objects (bucket_id, name) values ('documents', '10000000-0000-0000-0000-0000000000a1/programs/hlc.pdf');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('documents', '10000000-0000-0000-0000-0000000000b1/x.pdf')$$,
                      'A cannot upload into B''s folder');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('raw-imports', '10000000-0000-0000-0000-0000000000a1/x.json')$$,
                      'users cannot write raw imports');
:as_b
select t.expect_count('select * from storage.objects', 0, 'B cannot see A''s files');
:as_anon
select t.expect_error('select * from public.organization', 'signed-out visitors have no table access');
select t.expect_error('select * from public.supplier_item', 'signed-out visitors cannot read the catalog');

-- ===========================================================================
-- 10. Server-side integrity
-- ===========================================================================
:as_server
select t.expect_error($$set constraints all immediate; insert into public.sale_line (organization_id, location_id, retailer_item_id, connection_id, external_line_id,
                                                       sold_at, business_date, quantity, currency)
                        values ('10000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1',
                                '50000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 'L2',
                                now(), current_date, 1, 'USD')$$,
                      'a row cannot mix tenants (A sale at B''s location)');
select t.expect_error($$set constraints all immediate; insert into public.inventory_history (organization_id, location_id, retailer_item_id, quantity_on_hand,
                                                               valid_from, valid_from_business_date, last_confirmed_at)
                        values ('10000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1',
                                '50000000-0000-0000-0000-0000000000a1', 7, '2026-09-10 00:00+00', '2026-09-09', '2026-09-10 00:00+00')$$,
                      'inventory periods cannot overlap');
select t.expect_error($$insert into public.supplier_item (supplier_market_id, supplier_sku, pack_quantity)
                        values ('20000000-0000-0000-0000-000000000001', 'BAD', 0)$$,
                      'pack quantity must be positive');
select t.expect_error($$insert into public.connection (organization_id, connection_type, provider, method)
                        values ('10000000-0000-0000-0000-0000000000a1', 'supplier', 'hlc', 'api')$$,
                      'supplier connection requires a supplier market');
select t.expect_error($$update public.change_log set reason = 'rewrite history'$$, 'audit log cannot be rewritten');

select t.expect_error($$set constraints all immediate; delete from public.connection where id = '40000000-0000-0000-0000-0000000000a1'$$,
                      'disconnecting a POS cannot delete sales/inventory history');
select t.expect_error($$set constraints all immediate; delete from public.location where id = '30000000-0000-0000-0000-0000000000a2'$$,
                      'a location referenced by order history cannot be deleted on its own');

-- Deleting a whole retailer (e.g. a data-deletion request) cascades cleanly.
delete from public.organization where id = '10000000-0000-0000-0000-0000000000a1';
select t.expect_count($$select * from public.purchase_order where organization_id = '10000000-0000-0000-0000-0000000000a1'$$,
                      0, 'retailer deletion cascades through orders');
select t.expect_count($$select * from public.product where origin_organization_id = '10000000-0000-0000-0000-0000000000a1'$$,
                      0, 'retailer deletion removes its private provisional products');
select t.expect_count($$select * from public.program where id = 'a0000000-0000-0000-0000-000000000001'$$,
                      1, 'official program unaffected');

\echo 'All RLS and integrity tests passed.'

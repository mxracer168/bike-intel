-- =============================================================================
-- V1 bicycle taxonomy and attribute seed (docs/catalog.md, "V1 taxonomy and
-- attribute seed"). NOT APPLIED TO LIVE until approved.
--
-- Platform reference data, not example data: categories and attribute
-- definitions only, never products. A development/reference seed that
-- exercises the catalog model; it is not a complete bicycle taxonomy and is
-- expected to grow and be refined as real catalog data arrives.
--
-- Normalized meaning and market designation are separate. Enum values are
-- normalized (e.g. a bead-seat diameter in mm); "designations" lists the
-- names the market uses for that value, none of them canonical, so one
-- physical size keeps every name it is sold under (622: "700c", "29″").
-- An item's own designation and what each source said are stored with the
-- item, not here.
--
-- Idempotent: fixed ids, insert-or-update.
-- =============================================================================

-- Categories (16) ---------------------------------------------------------------
insert into public.category (id, industry, parent_id, name, slug) values
  ('ca700000-0000-4000-8000-000000000001', 'bicycle', null, 'Components', 'components'),
  ('ca700000-0000-4000-8000-000000000002', 'bicycle', null, 'Apparel & Protection', 'apparel-protection'),
  ('ca700000-0000-4000-8000-000000000003', 'bicycle', null, 'Bikes', 'bikes'),
  ('ca700000-0000-4000-8000-000000000004', 'bicycle', null, 'Maintenance', 'maintenance')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id;

insert into public.category (id, industry, parent_id, name, slug) values
  ('ca700000-0000-4000-8000-000000000011', 'bicycle', 'ca700000-0000-4000-8000-000000000001', 'Tires', 'tires'),
  ('ca700000-0000-4000-8000-000000000012', 'bicycle', 'ca700000-0000-4000-8000-000000000001', 'Tubes', 'tubes'),
  ('ca700000-0000-4000-8000-000000000013', 'bicycle', 'ca700000-0000-4000-8000-000000000001', 'Drivetrain', 'drivetrain'),
  ('ca700000-0000-4000-8000-000000000014', 'bicycle', 'ca700000-0000-4000-8000-000000000001', 'Brakes', 'brakes'),
  ('ca700000-0000-4000-8000-000000000021', 'bicycle', 'ca700000-0000-4000-8000-000000000002', 'Helmets', 'helmets'),
  ('ca700000-0000-4000-8000-000000000022', 'bicycle', 'ca700000-0000-4000-8000-000000000002', 'Shoes', 'shoes'),
  ('ca700000-0000-4000-8000-000000000031', 'bicycle', 'ca700000-0000-4000-8000-000000000003', 'Mountain', 'mountain'),
  ('ca700000-0000-4000-8000-000000000032', 'bicycle', 'ca700000-0000-4000-8000-000000000003', 'Gravel', 'gravel'),
  ('ca700000-0000-4000-8000-000000000041', 'bicycle', 'ca700000-0000-4000-8000-000000000004', 'Lubricants', 'lubricants')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id;

insert into public.category (id, industry, parent_id, name, slug) values
  ('ca700000-0000-4000-8000-000000000131', 'bicycle', 'ca700000-0000-4000-8000-000000000013', 'Chains', 'chains'),
  ('ca700000-0000-4000-8000-000000000132', 'bicycle', 'ca700000-0000-4000-8000-000000000013', 'Cassettes', 'cassettes'),
  ('ca700000-0000-4000-8000-000000000141', 'bicycle', 'ca700000-0000-4000-8000-000000000014', 'Brake pads', 'brake-pads')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id;

-- Attribute definitions (18) ----------------------------------------------------
insert into public.attribute_definition (id, industry, key, label, data_type, unit, allowed_values, description) values
  ('a7700000-0000-4000-8000-000000000001', 'bicycle', 'wheel_size', 'Wheel size', 'enum', 'iso_bsd_mm',
   '[{"value": 622, "designations": ["700c", "29″"]},
     {"value": 584, "designations": ["650B", "27.5″"]},
     {"value": 559, "designations": ["26″"]},
     {"value": 406, "designations": ["20″"]}]',
   'Normalized as ISO bead-seat diameter. Market designations are contextual (a 700c gravel tire and a 29″ mountain tire share 622); each item keeps the designation it is sold under.'),
  ('a7700000-0000-4000-8000-000000000002', 'bicycle', 'tire_width', 'Width', 'number', 'mm', '[]',
   'Normalized in mm; the item keeps its source designation (2.4″, 40 mm, 40c).'),
  ('a7700000-0000-4000-8000-000000000003', 'bicycle', 'tire_type', 'Tire type', 'enum', null,
   '[{"value": "clincher", "designations": ["Clincher"]},
     {"value": "tubeless_ready", "designations": ["Tubeless-ready", "TLR"]},
     {"value": "tubular", "designations": ["Tubular"]}]', null),
  ('a7700000-0000-4000-8000-000000000004', 'bicycle', 'tubeless_compatible', 'Tubeless compatible', 'boolean', null, '[]', null),
  ('a7700000-0000-4000-8000-000000000005', 'bicycle', 'valve_type', 'Valve', 'enum', null,
   '[{"value": "presta", "designations": ["Presta", "French valve"]},
     {"value": "schrader", "designations": ["Schrader", "Auto valve"]},
     {"value": "dunlop", "designations": ["Dunlop", "Woods"]}]', null),
  ('a7700000-0000-4000-8000-000000000006', 'bicycle', 'valve_length', 'Valve length', 'number', 'mm', '[]', null),
  ('a7700000-0000-4000-8000-000000000007', 'bicycle', 'drivetrain_speed', 'Speed', 'integer', 'speeds', '[]', null),
  ('a7700000-0000-4000-8000-000000000008', 'bicycle', 'cassette_range', 'Range', 'text', 'teeth', '[]',
   'Smallest and largest cog, e.g. "10–51t".'),
  ('a7700000-0000-4000-8000-000000000009', 'bicycle', 'pad_compound', 'Pad compound', 'enum', null,
   '[{"value": "resin", "designations": ["Resin", "Organic"]},
     {"value": "metallic", "designations": ["Metallic", "Sintered"]},
     {"value": "semi_metallic", "designations": ["Semi-metallic"]}]', null),
  ('a7700000-0000-4000-8000-000000000010', 'bicycle', 'color', 'Color', 'enum', null,
   '[{"value": "black"}, {"value": "white"}, {"value": "grey"}, {"value": "red"}, {"value": "orange"},
     {"value": "yellow"}, {"value": "green"}, {"value": "blue"}, {"value": "purple"}, {"value": "pink"},
     {"value": "brown"}, {"value": "tan"}, {"value": "multi"}]',
   'Normalized color family for filtering; the item keeps the supplier''s color name ("Gloss Ocean Teal").'),
  ('a7700000-0000-4000-8000-000000000011', 'bicycle', 'helmet_size', 'Helmet size', 'enum', null,
   '[{"value": "s"}, {"value": "m"}, {"value": "l"}, {"value": "xl"}]',
   'Each item keeps its own head-circumference range.'),
  ('a7700000-0000-4000-8000-000000000012', 'bicycle', 'shoe_size', 'Shoe size', 'number', 'eu', '[]',
   'Normalized to EU sizing where a conversion is known; the item keeps its source system (US, UK, Mondopoint).'),
  ('a7700000-0000-4000-8000-000000000013', 'bicycle', 'frame_size', 'Frame size', 'enum', null,
   '[{"value": "xxs"}, {"value": "xs"}, {"value": "s"}, {"value": "m"}, {"value": "l"}, {"value": "xl"}, {"value": "xxl"}]',
   'Brands label sizes differently (54 cm, M, S3); the item keeps its own label.'),
  ('a7700000-0000-4000-8000-000000000014', 'bicycle', 'discipline', 'Discipline', 'enum', null,
   '[{"value": "road"}, {"value": "mountain"}, {"value": "gravel"}, {"value": "urban"}]', null),
  ('a7700000-0000-4000-8000-000000000015', 'bicycle', 'closure_type', 'Closure', 'enum', null,
   '[{"value": "dial"}, {"value": "laces"}, {"value": "straps"}]', null),
  ('a7700000-0000-4000-8000-000000000016', 'bicycle', 'rotational_protection', 'Rotational impact protection', 'boolean', null, '[]', null),
  ('a7700000-0000-4000-8000-000000000017', 'bicycle', 'frame_material', 'Frame material', 'enum', null,
   '[{"value": "aluminum"}, {"value": "carbon"}, {"value": "steel"}, {"value": "titanium"}]', null),
  ('a7700000-0000-4000-8000-000000000018', 'bicycle', 'volume', 'Volume', 'number', 'ml', '[]',
   'Normalized in ml; the item keeps its source designation (4 oz, 120 ml).')
on conflict (id) do update set
  label = excluded.label, data_type = excluded.data_type, unit = excluded.unit,
  allowed_values = excluded.allowed_values, description = excluded.description;

-- Where attributes apply (inherited by descendants; a child row overrides) ----
-- (category, attribute, applies, filterable, variant_axis, facet_priority)
insert into public.category_attribute
  (category_id, attribute_definition_id, applies, filterable, variant_axis, facet_priority) values
  -- Tires
  ('ca700000-0000-4000-8000-000000000011', 'a7700000-0000-4000-8000-000000000001', true, true, true, 90),
  ('ca700000-0000-4000-8000-000000000011', 'a7700000-0000-4000-8000-000000000002', true, true, true, 85),
  ('ca700000-0000-4000-8000-000000000011', 'a7700000-0000-4000-8000-000000000010', true, true, true, 40),
  ('ca700000-0000-4000-8000-000000000011', 'a7700000-0000-4000-8000-000000000003', true, true, false, 70),
  ('ca700000-0000-4000-8000-000000000011', 'a7700000-0000-4000-8000-000000000004', true, true, false, 65),
  ('ca700000-0000-4000-8000-000000000011', 'a7700000-0000-4000-8000-000000000014', true, true, false, 60),
  -- Tubes
  ('ca700000-0000-4000-8000-000000000012', 'a7700000-0000-4000-8000-000000000001', true, true, true, 90),
  ('ca700000-0000-4000-8000-000000000012', 'a7700000-0000-4000-8000-000000000002', true, true, true, 85),
  ('ca700000-0000-4000-8000-000000000012', 'a7700000-0000-4000-8000-000000000005', true, true, true, 80),
  ('ca700000-0000-4000-8000-000000000012', 'a7700000-0000-4000-8000-000000000006', true, true, true, 50),
  -- Drivetrain (inherited by Chains and Cassettes)
  ('ca700000-0000-4000-8000-000000000013', 'a7700000-0000-4000-8000-000000000007', true, true, false, 90),
  -- Cassettes
  ('ca700000-0000-4000-8000-000000000132', 'a7700000-0000-4000-8000-000000000008', true, true, true, 80),
  -- Brake pads (single-Variant products)
  ('ca700000-0000-4000-8000-000000000141', 'a7700000-0000-4000-8000-000000000009', true, true, false, 80),
  -- Apparel & Protection (inherited by Helmets and Shoes)
  ('ca700000-0000-4000-8000-000000000002', 'a7700000-0000-4000-8000-000000000014', true, true, false, 70),
  ('ca700000-0000-4000-8000-000000000002', 'a7700000-0000-4000-8000-000000000010', true, true, true, 60),
  -- Helmets
  ('ca700000-0000-4000-8000-000000000021', 'a7700000-0000-4000-8000-000000000011', true, true, true, 90),
  ('ca700000-0000-4000-8000-000000000021', 'a7700000-0000-4000-8000-000000000016', true, true, false, 50),
  -- Shoes
  ('ca700000-0000-4000-8000-000000000022', 'a7700000-0000-4000-8000-000000000012', true, true, true, 90),
  ('ca700000-0000-4000-8000-000000000022', 'a7700000-0000-4000-8000-000000000015', true, true, false, 50),
  -- Bikes (inherited by Mountain and Gravel)
  ('ca700000-0000-4000-8000-000000000003', 'a7700000-0000-4000-8000-000000000013', true, true, true, 90),
  ('ca700000-0000-4000-8000-000000000003', 'a7700000-0000-4000-8000-000000000010', true, true, true, 50),
  ('ca700000-0000-4000-8000-000000000003', 'a7700000-0000-4000-8000-000000000001', true, true, false, 70),
  ('ca700000-0000-4000-8000-000000000003', 'a7700000-0000-4000-8000-000000000017', true, true, false, 60),
  ('ca700000-0000-4000-8000-000000000003', 'a7700000-0000-4000-8000-000000000014', true, true, false, 80),
  -- Gravel overrides: discipline is always gravel here
  ('ca700000-0000-4000-8000-000000000032', 'a7700000-0000-4000-8000-000000000014', false, false, false, 0),
  -- Lubricants: a variant axis that is neither size nor color
  ('ca700000-0000-4000-8000-000000000041', 'a7700000-0000-4000-8000-000000000018', true, true, true, 80)
on conflict (category_id, attribute_definition_id) do update set
  applies = excluded.applies, filterable = excluded.filterable,
  variant_axis = excluded.variant_axis, facet_priority = excluded.facet_priority;

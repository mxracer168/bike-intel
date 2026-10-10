# Catalog, sourcing and order creation

**Status: architecture approved (decisions D1–D8, pressure-test
adjustments G1–G5, the restricted first-source approach and the V1 seed,
2026-10-09). The catalog migration is prepared
(`supabase/migrations/20261009000100_catalog_foundation.sql`,
`20261009000200_catalog_seed_bicycle_v1.sql`) and tested locally and in CI,
but **not applied to the live project**. Nothing in the app reads it yet.
The first implementation slice is proposed at the end of this file.**

This file is the reference for the shared Catalog, product identity and
provenance, catalog matching, product lineage, order creation and
sourcing. It records:
- the approved model,
- what it changes in the schema (`supabase/migrations/`),
- what stays flexible and what is deferred,
- what must still be decided before the retailer-facing Catalog is built.

The platform starts with independent bicycle retailers. Nothing in the
catalog core may assume bicycles.

## Approved decisions

| | Decision |
|---|---|
| **D1** | Rename while the tables are empty and unused: `product_group` → `product`, `product` → `product_variant`. Foreign keys that mean the variant become `variant_id`. |
| **D2** | Every Variant belongs to a Product. A simple item with one sellable configuration is a Product with one Variant. |
| **D3** | The POS stays the system of record for a POS purchase order. Bringing one in creates a linked **working order** that Buying Intelligence owns. Edits never silently change the POS PO; only an explicit handoff ("Update POS order") does. No live two-way editing in V1. |
| **D4** | Data-use rights are kept **per source**. Only public, licensed or otherwise platform-usable data feeds the shared canonical catalog. Data that arrives through a retailer's private connection stays restricted to that retailer, unless our rights to that source say otherwise. Retailer-specific price, availability, terms and account status are always private. The policy itself is not decided here; the architecture must be able to enforce it. |
| **D5** | The global Catalog may say another supplier carries a product ("Also sold by X · Not connected") only when we have a legitimate source and the right to show that fact. It never shows price, availability or anything else learned through another retailer. |
| **D6** | By default, one working draft per supplier and ship-to location, and new items go into it. This is application behavior, **not** a database invariant: program, preseason and special orders, different terms and future workflows may need several. |
| **D7** | A new immutable **sourcing plan** records "how to buy", separate from the recommendation's "what to buy". |
| **D8** | Lineage types are **direct successor**, **functional replacement** and **substitute**. `replaced_by` is retired because it is only the inverse of successor. Lineage is allowed between Products and between Variants. |

## The canonical catalog model

```
Product (model / family)            brand, category, name, attributes
 └─ Variant (sellable configuration) attributes (incl. variant axes), status
     ├─ Identifiers                  typed, sourced; may also hang on the Product
     ├─ Lineage                      to other Variants (and Product ↔ Product)
     └─ matched by ─ Supplier offers (supplier_item: one per supplier market + SKU)
                       ├─ catalog facts (description, pack/UOM, list price) with source rights
                       └─ observations through a retailer relationship:
                            price (with conditions) · availability (per warehouse, timestamped)
```

- **Product** is the human-recognizable model or family. **Variant** is
  what is actually bought and sold.
  - A Variant's distinguishing dimensions are attributes flagged as
    variant axes for its category.
  - Size and color are never columns.
- **Identifiers** are open-ended types (UPC, EAN, GTIN, MPN, later
  anything else). Each one records the source record and source rights it
  came from.
  - They are evidence, not unique keys, because real data reuses and
    conflicts.
  - The supplier's SKU identifies the **offer**, not the product.
- **Supplier offer** (`supplier_item`) is one supplier market's
  representation of one Variant:
  - SKU, pack and UOM;
  - its own description and attributes;
  - its source rights.
- **Price and availability are observations of an offer, never product
  attributes.**
  - Availability: supplier, offer, warehouse (optional), quantity or
    status, and when it was observed. Already in
    `supplier_offer_observation`.
  - Pricing: see "Pricing stays an evolving observation" below.
- **Provenance.** What each source said is kept as it said it. The
  canonical value is a separate, explainable choice: which source, why,
  and with what confidence. A canonical value may only come from a source
  whose rights allow platform use (D4).
- **Matching.** Offers and retailer items link to Variants through
  `product_match`, which records confidence, evidence, status history and
  who decided. Resolution depends on confidence:
  - Strong evidence resolves automatically.
  - Ambiguous cases go to a platform review queue.
  - Weak evidence keeps the records apart.
  - Human decisions persist, including "these are not the same".
  - Duplicates are matched, or merged when two Variants are the same.
- **Lineage** links distinct entities: direct successor, functional
  replacement or substitute, each with source, confidence, evidence,
  market and effective date. A replacement is never a merge. History stays
  on the item that produced it; analysis borrows it, weighted by the
  relationship's type and strength.

### Source rights (D4, D5)

Every catalog fact remembers the rights of the source it came from. This
covers offers, identifiers, content assertions, media and "who sells it".

- **Platform-usable**: public, licensed, supplier-provided for platform
  use, or steward-entered. It may feed the canonical catalog and be shown
  to any retailer.
- **Restricted to one organization**: arrived through that retailer's
  authenticated connection, with no broader right. It is visible to, and
  usable for, that retailer only.

The pattern already exists: `product.origin_organization_id` keeps a
POS-created product private until confirmed. It generalizes to a source
rights record per connection or provider, beside the existing retention
policy, and a `restricted_to_organization_id` on restricted rows. RLS
enforces it.

- **Entity resolution may run on restricted data, but its output inherits
  the restriction.** A match or Variant derived only from restricted
  evidence is private to that retailer. Platform-usable evidence can
  improve everyone's catalog without exposing restricted rows.
- **Policy is configuration, not schema.** Which providers are
  platform-usable is a per-source setting. It defaults to **restricted**
  until our rights are confirmed, as retention defaults to transient.

### Pricing stays an evolving observation

**Verified:** nothing in the model assumes an offer has one simple current
price.
- `supplier_item` has no wholesale price, only an optional list price
  (MSRP) per supplier market with its currency.
- Cost lives in `supplier_offer_observation`: many rows per offer, per
  retailer relationship, each with a currency, a price type (customer,
  list, promotional, program) and the time it was observed.
- Recommendations and orders freeze the cost they assumed.

**What's missing:**
- quantity breaks;
- effective and expiry dates;
- a link from a price to its program;
- other conditions.

Price and availability also share one observation row.

**How it grows:** when pricing needs more, split a **price observation**
from the availability observation. The price row carries:
- relationship and offer;
- currency and amount per ordering unit;
- price type;
- minimum quantity (for quantity breaks);
- valid from and to;
- an optional program version;
- conditions (jsonb).

Price observations are private to the retailer, like today. Neither
identity nor the offer changes. A pricing engine, if ever needed, reads
these rows.

### The hierarchy is not the presentation

Product → Variant is the identity model only. The Catalog never has to
show one row per Product or one row per Variant.
- Discovery reads a **derived search index** built per context: global,
  or scoped to a supplier. The index carries the retailer's own visible
  offers and observations, and only platform-usable facts from others.
- An index document can collapse a Product's Variants into one result,
  with axis selection and facets over the variant attributes. Or it can
  expand them, depending on the query, category and context.
- An exact identifier search lands on the Variant. A browse by bike model
  shows one result with size and color choices.
- How results collapse or expand is ranking and presentation logic, not
  schema, so it can keep improving.

### Normalized meaning and source representation

Canonical values and how things are named are kept apart. This is a
general catalog principle, not a tire rule.

- **Normalized value**: the physical or semantic meaning where it's known,
  e.g. a 622 mm bead-seat diameter, a width in mm, a volume in ml. This is
  what filters, comparisons and matching use.
- **Source value**: exactly what the supplier or manufacturer said ("29 x
  2.4", "700x40c", "4 oz"), kept in `catalog_assertion.source_value` with
  its source.
- **Designation**: the market name this item is sold under. One normalized
  value can have several legitimate designations depending on context (a
  700c gravel tire and a 29″ mountain tire share 622), so no normalized
  value has exactly one label.
  - An item's canonical attribute holds both, e.g.
    `{"value": 622, "designation": "29″"}`.
  - An attribute definition's allowed values list the known designations
    without ranking them.

Search can later learn equivalences (622 = 700c = 29″, 584 = 650B = 27.5″,
shoe sizing systems, metric and imperial) from these lists without losing
source truth. Normalization can improve at any time, because the source
value is never overwritten.

## Pressure test: the first Catalog exploration

The first Figma exploration of the retailer-facing Catalog (2026-10-09) was
used as evidence about the interaction model, not as product truth. It
confirmed:
- Catalog is a top-level destination between Orders and Inventory.
- It answers "What can I buy?"; Today keeps "What deserves my attention?".
- Canonical products stay consolidated however many suppliers sell them.
- The product page reads: Product → retailer-specific buying intelligence →
  Variant selection → sourcing recommendation → supplier offers → the
  sourcing explanation.
- Supplier comparison should recommend the best sourcing option, not the
  lowest unit price. The case that sold it: a higher unit price wins
  because the items push an existing order over its free-freight threshold.

Discovery comes first: search → navigation → filters/facets → sort →
results → product/variant → sourcing. Retailer intelligence appears inside
those layers, with progressive disclosure, never as a hero or a work queue.

### What the approved architecture already supports

- **Brand and supplier stay distinct.**
  - Brand is a property of the Product (`brand_id`).
  - A supplier is who offers a Variant (`supplier_item` → supplier
    market).
  - `brand.owner_organization_id` records that a supplier owns a brand
    (Trek), never that a supplier's name is the brand.
  - Guardrail: canonical brand comes only from brand evidence
    (`catalog_assertion`). An unknown brand shows as unknown, never as the
    supplier who sent the record.
  - In the search index, `brand` and `suppliers` are separate fields and
    separate facets.
- **Global and supplier-scoped Catalog are one system.** Supplier is a
  facet over each Variant's visible offers. Entering from a QBP order is
  the same query with the supplier filter fixed, and "Everything I can get
  from QBP" is that filter chosen by hand.
  - Offers are visible when they come from the retailer's own
    connections, or are platform-usable facts (D4/D5).
  - "Not connected" is a state of the facet value, not a separate catalog.
- **Hierarchical categories.** `category.parent_id` already forms a tree
  per industry, so navigation can show one level at a time. The search
  index carries each Product's category path, so a filter on "Components"
  includes Tires.
- **Grid and List.** Both are presentations of the same results ("identity
  is not presentation").
- **Industry-agnostic attributes.** Wheel size, width, frame size, closure
  type, discipline and color are attribute definitions scoped to categories
  in an industry, never columns.
- **Explicit sorts.** Relevance is the default for a typed query. Every
  other sort is named for what it does (name, brand, your cost, available
  now, on hand). Nothing ships as a vague "Recommended"; any intelligent
  ranking later must be explainable. No ranking algorithm is locked in.

### Gaps exposed, and the approved change for each (G1–G5, approved 2026-10-09)

**G1. Product-level vs Variant-level recommendations (approved).**
Today `recommendation_line` has one product reference, which after D1 means
a Variant. It can say "18 of the 29 × 2.4 Black", and "allocate across
Variants" only as unconnected lines. It cannot say "18 across this tire"
without naming a Variant, and it can't tie an allocation back to the
family need it splits. Approved, folded into the D1 renames:
- `recommendation_line.product_id`: the Product, always set.
- `recommendation_line.variant_id`: nullable.
- `recommendation_line.parent_line_id`: nullable, so a Variant line can
  allocate part of a Product-level line.

This gives three unambiguous cases:

| Case | Product | Variant | Parent |
|---|---|---|---|
| Product-level need ("18 across this tire") | set | — | — |
| Variant-level need ("6 of 29 × 2.4 Black") | set | set | — |
| Allocation (6 + 8 + 4 of the 18) | set | set | the Product line |

Orders always buy Variants: an order line needs a Variant, so a
Product-level need must be allocated (by the system or the retailer)
before it becomes an order line. Screens must always say which case they
show, e.g. "18 across this tire" beside a Variant picker, never "18" alone.

**Quantity units.** A need with no supplier is in canonical units.
Converting to ordering units belongs to the sourcing plan line, because
packs differ by offer.

**History is never rewritten.** The retailer's final quantities don't
have to match the recommendation, and nothing changes the recommendation
to make them match. Buying Intelligence may recommend 18 across a Product,
and the retailer may order 16 or 20. Three records stay comparable:
- **The recommendation**: the Product-level line, immutable.
- **The system's proposed allocation, if any**: its Variant child lines,
  also immutable. Nothing requires them to sum to the parent's quantity.
- **The retailer's decision and outcome**: order lines for Variants, with
  working, approved and submitted quantities.
  - Each order line references the recommendation line it came from. That
    is either the system's Variant allocation line, or the Product-level
    line when the retailer chose the Variants themselves.
  - Agreement is measured at both levels: per Variant where an allocation
    existed, and summed across the Product.

No size-run or allocation engine is designed here.

**G2. Unit cost vs landed economics (approved).**
These are three different things, kept apart:
- **Supplier unit cost** is an observation of one offer: per ordering
  unit, per relationship, with a price type and a time. It's already
  modelled.
- **Freight and order impact** depend on the whole order: which working
  order the items join, whether it crosses a free-freight threshold, and
  the freight cost otherwise.
- **Estimated landed cost** is derived from both, for a specific
  allocation, so it exists only inside a sourcing decision.

Landed cost is never stored on an offer and never indexed. "Best landed
option $81.20" is a sourcing result for this retailer's current basket and
working orders. When freight is free, landed unit cost equals unit cost,
but the plan records both.

For the sourcing migration, on each `sourcing_plan_line`:
- the observed unit cost and pack;
- cost per canonical unit;
- allocated freight;
- estimated landed cost per canonical unit.

On the plan and per target order: order subtotal, threshold gap, and
estimated freight.

**Normalization comes first.** Pack and UOM are normalized to a
comparable canonical unit before any supplier economics are compared. A
box of 10 tubes and a single tube are compared per tube. An offer whose
pack can't be normalized (`uom_normalization = 'needs_review'`) is shown
but never ranked against the others.

The landed-cost engine itself is not designed here.

**G3. Category-specific, inherited facets (approved).** A
single `attribute_definition.scope` can't express "applies to Tires and
everything under it, filterable, third in the rail, and a variant axis
here but not there". For the catalog migration:
- **`attribute_definition`** describes the attribute itself:
  - key, label, data type, unit;
  - allowed values or value normalization;
  - industry.
- **`category_attribute`** applies an attribute to a category and its
  descendants:
  - `filterable`;
  - `variant_axis`;
  - `facet_priority`;
  - optional display order.
  - A child category may override what it inherits (e.g. hide or
    re-order a facet).

**`facet_priority` is guidance, not a fixed order.** Discovery may
reorder or emphasize facets for the current query, result set or context.
Nothing in the schema fixes the filter rail.

Necessary now: the two tables, inheritance down the tree, and the
filterable, variant-axis and priority flags. Flexible: value
normalization depth, "required" attributes, multi-category listing,
mapping supplier category text to our taxonomy, and merchandising
collections.

**Category belongs to the Product.** After D1, `product_variant` drops its
own `category_id`, so the two can't disagree.

**G4. Dynamic facets and retailer context in discovery (approved; an
index requirement, not schema).**
- **Dynamic facets.** Counts that change with the result set, values that
  disappear, and more specific facets as the retailer narrows are search
  behaviors.
  - Facets are chosen from the `category_attribute` rows that apply to the
    categories present in the current results. Priority is a starting
    point the search layer may override.
  - Counts come from the index.
  - Counts are per collapsed result (a Product), unless the retailer is
    filtering on a variant axis.
- **Retailer signals.** Signals such as replenishment recommended, on
  hand / incoming, normal supplier, demand rising and new to your
  assortment come from data that already exists:
  - matched `retailer_item`s;
  - inventory history;
  - open order lines;
  - supplier preference and purchase history;
  - open recommendation lines.

  They are joined at the Product and Variant through `product_match`.
  - The shared Catalog answers what a product is, which Variants exist,
    who legitimately offers it, and what describes it.
  - The overlay answers what it means to this retailer right now.

  A **derived, rebuildable per-retailer signal overlay**, keyed
  by organization and Product/Variant. It is refreshed on sync, protected
  by RLS and never a source of truth. Discovery combines it with the
  canonical index at query time, so canonical documents stay shared and
  nothing leaks across retailers. Source rights and retailer-data
  boundaries apply to the overlay as to everything else.
  - Belongs to the first implementation slice, not the catalog migration.
- **Engine.** Postgres (full-text plus jsonb attribute indexes plus facet
  counting queries) is enough for the first catalog sizes. Choosing a
  dedicated engine is deferred until the catalog is large enough to need
  one.
  - It must support per-tenant filtering, faceted counts and result
    collapsing (grouping Variants under their Product).

**G5. A sourcing recommendation on a product page is a preview
(approved).** The product page computes the best option for this item
against the retailer's current working orders. A preview is a
computation, not a durable record:
- That preview is computed on demand.
- It is persisted as a `sourcing_plan` only when the retailer acts on it
  (adds to an order), or when the system proposes orders.

Viewing a product page never creates a sourcing plan. The explanation
behind an action is always kept.

### The model after the pressure test

Product → Variant → Supplier offer → Observation holds. None of the
findings puts supplier into identity, price or availability onto the
product, or one presentation into the schema. Three things move:
- recommendations name their scope (G1);
- landed economics lives only in sourcing (G2);
- attribute applicability gets its own category link (G3).

## The order and sourcing model

```
Need (what to buy)                 recommendation / recommendation_line: immutable, supplier optional
   │
Sourcing plan (how to buy)         sourcing_plan / sourcing_plan_line: immutable
   │   needs · offers + warehouse availability considered · working orders considered
   │   allocation · landed economics · alternatives · assumptions · explanation
   ▼
Working order                      purchase_order (draft → approved → submitted | discarded)
   │   lines say how they were added (catalog, supplier catalog, recommendation, POS import, manual)
   │   retailer edits audited (change_log); approved/submitted values frozen
   ▼
Handoffs                           purchase_order_handoff: supplier submission, create or update POS PO
```

- **One working object, many ways in.** All four entry points create or
  modify the same `purchase_order`:
  - Catalog browsing.
  - Supplier-scoped Catalog browsing inside an order.
  - POS import.
  - A recommendation ("act on this").

  Every line records its origin.
- **Default draft per supplier and ship-to** (D6) is resolved in the
  application. Several open drafts for one supplier and location remain
  valid data.
- **POS purchase orders** (D3):
  - The POS PO is mirrored read-only with its external status
    (`origin = 'pos'`), at any status, not only submitted.
  - Bringing it in creates a platform working order whose
    `source_purchase_order_id` points at the mirror, and which keeps the
    POS version it started from. Later divergence on either side can then
    be detected and shown, never silently resolved.
  - "Update POS order" is a handoff like any other: an explicit action,
    recorded with its result.
  - Tighter synchronization, for integrations that support it, can be
    added per connection later without changing this shape.
- **What vs how.**
  - A recommendation says what is needed and why. It stays immutable, and
    its supplier stays open.
  - A sourcing plan decides how to fill those needs: across suppliers,
    offers, warehouses, existing working orders, freight thresholds and
    freight cost, programs and timing. It optimizes the whole buying
    picture, not each line.
- **Sourcing plan contents** (D7). It preserves enough to reconstruct the
  decision:
  - the needs being sourced;
  - the offers considered;
  - the warehouse and availability observations considered;
  - the working orders considered;
  - the proposed allocation across suppliers and orders;
  - estimated landed economics, including freight;
  - meaningful alternatives, with the best simple one and the difference
    against it;
  - assumptions, frozen as recommendation lines freeze theirs;
  - a plain explanation, answer first ("We split these between two
    suppliers because both orders qualify for free freight, saving about
    $42 compared with ordering nine from Supplier B").

  The retailer's overrides are their edits to the resulting working
  orders, audited and linked back to plan lines. The eventual outcome is
  what was approved and submitted, compared with the plan. The
  optimization method is not designed here.

## Platform intelligence vs retailer intelligence

- **Shared across the platform:** catalog identity, verified matches and
  verified lineage from platform-usable sources (suppliers, manufacturers,
  licensed data, stewardship).
- **The retailer's own:** sales, inventory, preferences, buying behavior,
  commercial terms, prices and availability, and anything that arrived
  through their private connections.
- **What crosses the boundary:** a retailer's data contributes to shared
  matching or lineage only with the industry-intelligence agreement, only
  in aggregate, and never by exposing restricted source rows.
- **Stewardship:** catalog clean-up is the platform's job. Retailers are
  never asked to clean supplier data. A retailer's corrections to their
  own POS items stay theirs.

## Schema changes (prepared, not applied)

The catalog migration (items 1–9 and 2a below) is written and tested on
throwaway local databases, in the local test run and in CI. It is not
applied to the live project; you apply it by hand. The sourcing migration
(items 10–13) comes when sourcing is built. Applied migrations are never
edited.

As written, the catalog migration also:
- **stops unless the catalog tables are empty**, so nothing is ever
  reinterpreted;
- **gives Products** the same provisional / confirmed / merged status and
  the same private-to-a-retailer rule (`origin_organization_id`) that
  Variants already have;
- **adds `connection.catalog_rights`** (restricted by default), which only
  the platform can widen;
- **adds `restricted_to_organization_id` on supplier records**, plus a
  rule that a match built on restricted data is restricted to the same
  retailer;
- **only lets a restricted source set a canonical value** on an item
  private to that same retailer;
- **recreates the order-line guard on the Variant**: an order line taken
  from a Product-level need doesn't copy that total as its own
  recommendation (G1);
- **seeds the V1 taxonomy** in its own migration, idempotently.

About 30 new local database tests cover the rights boundaries,
identifiers, lineage levels, recommendation scope and the seed.

**Catalog migration**
1. **Renames** (D1).
   - `product_group` → `product`, `product` → `product_variant`.
   - `product_id` → `variant_id` wherever it means the variant:
     identifiers, matches, relationships, recommendation and order lines,
     program eligibility, context items and intelligence questions. Context
     scoped to a product can then be about a Product (a whole model) or one
     Variant.
   - Program eligibility's existing `product_group_id` (model) target
     becomes `product_id`, and its `product_id` (variant) target becomes
     `variant_id`.
2. **Required Product** (D2): `product_variant.product_id not null`.
   Category lives on the Product only (`product_variant.category_id`
   dropped, G3).
2a. **Recommendation scope** (G1): `recommendation_line` gets
   `product_id` (required), `variant_id` (nullable) and `parent_line_id`
   (nullable). A line without a supplier is in canonical units. There is
   no sum constraint between parent and children.
3. **Identifiers.**
   - The closed CHECK becomes an `identifier_type` reference table.
   - An identifier attaches to a Product or a Variant.
   - It records the source record, import batch and source rights.
4. **`attribute_definition`** and **`category_attribute`** (G3).
   - The definition: key, label, data type, unit, allowed values or
     normalization, industry.
   - The category link, inherited by descendants and overridable: whether
     the attribute is filterable, whether it is a variant axis, and its
     facet priority.
   - Attributes stay jsonb, keyed by definition.
5. **Source rights** (D4):
   - a per-connection/provider rights setting, defaulting to restricted;
   - `restricted_to_organization_id` on offers, identifiers, assertions
     and media;
   - RLS that hides restricted rows from other organizations;
   - `supplier_item` uniqueness that includes the restriction scope, so a
     platform record and a retailer-restricted record of the same SKU can
     coexist.
6. **`catalog_assertion`** (provenance).
   - Each row is what one source said about one field of a Product or
     Variant: value, source record, rights, time and import batch.
   - Canonical values point at the assertion they came from, with who
     chose it and the confidence.
   - It may land when a second source first describes the same item, but
     no canonical value is written without a recorded, platform-usable
     source.
7. **`product_media`**, with source and rights.
8. **Verified "not the same" pairs**, so a rejected pairing is never
   proposed again.
9. **Lineage** (D8): types become `direct_successor`,
   `functional_replacement` and `substitute`; `replaced_by` is retired;
   subjects may be Products or Variants.

**Sourcing migration (when sourcing is built)**

10. **POS mirror and working orders** (D3).
    - Allow `origin = 'pos'` at any external status, read-only.
    - `purchase_order.source_purchase_order_id`, plus the POS version it
      started from.
    - `purchase_order_handoff`, already planned in `architecture.md`,
      gains an "update existing POS PO" action.
11. **Order lines:** an `origin` per line and an optional ship-from
    warehouse.
12. **`sourcing_plan` and `sourcing_plan_line`** (D7), immutable;
    working-order lines may reference the plan line they came from.
    - Each line keeps unit cost and pack, cost per canonical unit,
      allocated freight and estimated landed cost per canonical unit
      separately (G2).
    - The plan keeps each target order's subtotal, threshold gap and
      estimated freight.
    - A plan is stored when the retailer acts or the system proposes
      orders; product-page previews are computed on demand (G5).
13. **Pricing, when needed:** a price observation split from availability
    (see above), and a `freight_cost` term type beside the free-freight
    threshold.

## Keep flexible

- Matching methods, thresholds and the AI role in fuzzy matching.
- Taxonomy and attribute content per industry, including where model year
  lives.
- How strongly lineage transfers history, and how it learns.
- The optimization method and objective weights.
- The pricing conditions model.
- The search engine and how results collapse or expand. Postgres
  full-text comes first.
- Observation retention, which is per provider already.

## Deliberately deferred

- Kits and bundles.
- Serialized items.
- Supplier-side catalog editing and manufacturer feeds.
- Cross-currency offer comparison.
- Durable catalog change history.
- The steward review tool's interface.
- Live POS synchronization.

## Before building the retailer-facing Catalog

Both were approved on 2026-10-09.

- **First source.** V1 may begin with supplier catalog data from a
  retailer's own authorized connection. Conditions:
  - we have permission to store and process it for that retailer;
  - retention follows the source's rights;
  - the source stays restricted;
  - nothing from it reaches another retailer.

  Platform-wide rights are not a prerequisite. A second supplier for the
  same retailer should follow as soon as practical.
- **Seed.** Approved as a development and reference seed: it exercises
  the model and is not a final bicycle taxonomy. It grows and is refined
  as real catalog data arrives.

### 1. The first catalog source and our rights to it (approved)

Because the default rights setting is **restricted**, building the Catalog
does not have to wait for the commercial and legal policy. A first source
that arrives through one retailer's own connection is restricted to that
retailer, which the architecture already enforces. What that retailer sees
is then accurate and theirs alone.

**Needed before implementation:**
- **One real supplier catalog to build against.** A distributor's dealer
  feed or export, in the form it really arrives (API, CSV or Excel), with
  a representative sample. It should include UPC/EAN, MPN, brand, variant
  attributes and pack quantities. Real files are messy in ways invented
  ones aren't.
- **Confirmation that our terms let us store and process it for that
  retailer**, and for how long. This sets the connection's retention and
  marks it restricted. No platform-wide right is needed for V1.
- **A second supplier for the same retailer**, as soon as possible.
  Supplier comparison, matching across suppliers and "best landed option"
  only mean something when two offers of one Variant are visible to the
  same retailer. Until a second real source exists, comparison is shown
  with example data.
- **Example data for previews stays in `src/demo`.** A fictional catalog
  with three suppliers and overlapping offers exercises every screen, and
  is never written to the database (unchanged rule).

**Can develop incrementally after the Catalog exists:**
- platform-usable sources: supplier partnerships, licensed or manufacturer
  data, GS1-style identifier data;
- the legal review of each source;
- "Also sold by · Not connected", which has nothing to show until a
  platform-usable source exists;
- more suppliers and matching quality;
- the steward review tool;
- images, where source rights for media are often different from text.

### 2. The V1 taxonomy and attribute seed (approved as a development/reference seed)

Categories and attribute definitions are **platform reference data**, not
example data. They are seeded by a migration or seed script and grow over
time. Products are never seeded; they come from sources, or from
`src/demo` for previews.

The seed is deliberately small, but covers every case the architecture
must handle: depth, single-Variant and multi-Variant Products, sparse
variant matrices, pack-size offers, attributes reused across categories,
inherited and overridden facets, a variant axis that isn't size or color,
items many distributors sell, and items one brand sells direct.

**Categories (industry `bicycle`)**

```
Components
  Tires
  Tubes
  Drivetrain
    Chains
    Cassettes
  Brakes
    Brake pads
Apparel & Protection
  Helmets
  Shoes
Bikes
  Mountain
  Gravel
Maintenance
  Lubricants
```

That is 16 categories, three levels deep at most. The approved proposal
said 15; the tree itself (4 + 9 + 3) is what was approved and seeded. Bikes > Mountain and
Bikes > Gravel are siblings that share most facets.

**Attribute definitions (18)**

| Key | Type | Notes |
|---|---|---|
| `wheel_size` | enum | Normalized to ISO bead-seat diameter (622, 584, 559, 406). The definition lists the market designations for each value ("700c" and "29″" for 622; "650B" and "27.5″" for 584) without making any of them canonical; each item keeps the designation it's sold under. |
| `tire_width` | number | Normalized in mm; the item keeps its designation (2.4″, 40 mm, 40c) |
| `tire_type` | enum | Clincher, tubeless-ready, tubular |
| `tubeless_compatible` | boolean | |
| `valve_type` | enum | Presta, Schrader, Dunlop |
| `valve_length` | number | |
| `drivetrain_speed` | integer | 9–13 |
| `cassette_range` | text | e.g. "10–51t" |
| `pad_compound` | enum | Resin, metallic, semi-metallic |
| `color` | enum + source name | Normalized color family, with the supplier's color name kept |
| `helmet_size` | enum | S, M, L, XL (each with a cm range) |
| `shoe_size` | number | Normalized to EU where a conversion is known; the item keeps its sizing system (US, UK, Mondopoint) |
| `frame_size` | enum | XS–XL, plus source size labels |
| `discipline` | enum | Road, mountain, gravel, urban. Reused by helmets, shoes and bikes |
| `closure_type` | enum | Dial, laces, straps |
| `rotational_protection` | boolean | Helmets |
| `frame_material` | enum | Aluminum, carbon, steel, titanium |
| `volume` | number | Normalized in ml; the item keeps its designation (4 oz, 120 ml) |

**Applied to categories** (✱ = variant-defining; others filterable).
Brand, supplier, availability and the retailer overlay states are system
facets everywhere, not attributes.

| Category | Attributes |
|---|---|
| Tires | `wheel_size` ✱, `tire_width` ✱, `color` ✱ (sidewall), `tire_type`, `tubeless_compatible`, `discipline` |
| Tubes | `wheel_size` ✱, `tire_width` ✱ (range), `valve_type` ✱, `valve_length` ✱ |
| Drivetrain (inherited by Chains, Cassettes) | `drivetrain_speed` |
| Cassettes | `cassette_range` ✱ |
| Brake pads | `pad_compound` (single-Variant products) |
| Apparel & Protection (inherited) | `discipline`, `color` ✱ |
| Helmets | `helmet_size` ✱, `rotational_protection` |
| Shoes | `shoe_size` ✱, `closure_type` |
| Bikes (inherited by Mountain, Gravel) | `frame_size` ✱, `color` ✱, `wheel_size`, `frame_material`, `discipline` |
| Gravel | overrides: `discipline` hidden (always gravel) |
| Lubricants | `volume` ✱ |

**What each part exercises**

- **Single-Variant Products:** chains (one per speed) and brake pads.
- **Sparse multi-Variant Products:** a tire family where not every wheel
  size × width × color combination exists.
- **Pack sizes and offers:** chains sold singly and in a workshop
  25-pack, and tubes singly and in a box of 10. These are the same Variant
  in different offers, compared per canonical unit (G2).
- **A variant axis that isn't size or color:** lubricant volume, which is
  also a non-"each" unit.
- **Inheritance and override:** Drivetrain → Chains/Cassettes,
  Apparel & Protection → Helmets/Shoes, and the Gravel override.
- **Supplier comparison:** tires, tubes, chains, pads and lube are carried
  by several distributors. Bikes and helmets are sold by one brand direct.
- **The example dataset in `src/demo`:** about 40 Products and 200
  Variants across three suppliers, including the free-freight case from
  the exploration.

**Needed before implementation:**
- your approval of this seed: the categories, the 18 definitions, and
  which attributes define variants;
- one decision, to store wheel size as ISO bead-seat diameter and widths in
  mm (recommended). Everything else can change later without migrations,
  because definitions are data.

**Can grow incrementally:**
- more categories (e-bikes, wheels, lights, nutrition, service parts);
- value normalization depth;
- compatibility (which pads fit which brakes), a separate concept, not
  an attribute, and deferred;
- mapping supplier category text to our taxonomy;
- multi-category listing and merchandising collections;
- localized labels.

## First implementation slice (proposed)

**Goal:** the smallest end-to-end Catalog that proves the model on real
data. One retailer uploads one real supplier's catalog file, and gets a
searchable, faceted, rights-restricted Catalog of canonical Products,
Variants and that supplier's offers. They can browse it globally or
scoped to the supplier. No other retailer can see any of it.

### Genuinely functional on real data

1. **Apply the catalog migration**, by hand, after review.
2. **Supplier catalog import.**
   - An owner or admin adds a supplier catalog file (CSV or Excel) for a
     supplier in the directory.
   - This creates a `file` supplier connection, with `catalog_rights`
     restricted and retention taken from that source's terms.
   - The raw file is kept in the retailer's storage folder under that
     retention.
   - Every run is an `import_batch`. Re-importing updates records rather
     than duplicating them.
   - Column mapping for the first supplier is a small, per-supplier
     configuration in code.
3. **Normalization and grouping.** Each row becomes a restricted
   `supplier_item`, with pack and UOM parsed (`needs_review` when it
   can't be), and a Variant under a Product. Both are private to the
   retailer.
   - **Grouping:** by the supplier's model or style field when it has one;
     otherwise one Product per row. Never across brands.
   - **Identifiers:** UPC, EAN and MPN become identifiers.
   - **Assertions:** every field becomes an assertion holding the source
     value, our normalized reading, and the designation.
   - **Attributes:** mapped to seed definitions where the reading is
     confident. Anything else stays as a source assertion only.
   - **Categories:** the supplier's category text maps to the seed through
     a small mapping. Unmapped items stay uncategorized and remain
     searchable.
4. **Matching, deterministic only.**
   - Rows that share a UPC, EAN or GTIN, or the same brand + MPN, resolve
     to one Variant.
   - Conflicts, such as one UPC on two different items, become candidate
     matches with evidence, not merges.
   - The same code will match a second supplier's records to the same
     Variants.
5. **Provenance.** With a single source, its normalized values become
   canonical. That's allowed because the Products are private to the same
   retailer. Every value can be traced to its row and import.
6. **Prices and availability, when the file has them.**
   - They are stored as `supplier_offer_observation`s through the
     retailer's relationship with that supplier, observed at the file's
     date.
   - Shown as unit cost, pack and cost per canonical unit, with
     freshness.
   - No landed cost.
7. **Catalog** (`/catalog`, between Orders and Inventory). Queries run as
   the signed-in retailer, so row-level security enforces rights.
   - **Search:** Postgres full-text over name, brand and identifiers. An
     exact identifier lands on its Variant.
   - **Navigation:** the category tree, one level at a time.
   - **Facets:** category, brand, supplier and availability. Category
     facets come from inherited `category_attribute` rows for the
     categories in the current results, with live counts per Product.
   - **Results:** collapsed by Product; Grid and List.
   - **Sorts:** relevance, name, brand, and your cost per unit.
8. **Product page.** The Product, a Variant picker built from its variant
   axes, and the offers with pack, cost per canonical unit, availability
   and when it was observed.
9. **Supplier scope.** `/catalog?supplier=…` is the same query with the
   supplier fixed. It is reachable from the supplier's page now, and from
   an order once orders are real.
10. **Overlay: "Normal supplier".** This comes from the retailer's own
    supplier preference, which is real today.
11. **Tests.**
    - Database tests for every rights boundary: another retailer sees
      nothing.
    - Unit tests for parsing, normalization (including designations) and
      grouping.
    - An end-to-end test: upload a fixture file, then search, filter and
      open a product.

### Example data until there's a second supplier or more integrations

These stay in `src/demo`, shown only when `DEMO_PREVIEW` is on, and never
written to the database:
- **Second and third suppliers' offers, supplier comparison, and the
  sourcing preview** ("best landed option", the free-freight case).
  - Matching and the comparison code are real and tested with fixtures.
  - They show real results once a second real supplier is connected.
- **Overlay signals that need POS data:** on hand, incoming, replenishment
  recommended, demand rising, new to your assortment. No POS sync exists
  yet.
  - The overlay's shape is defined in this slice and filled from example
    data.
  - The derived per-retailer table is built when POS data arrives, so it
    has something real to derive from.
- **"Add to order".** Orders are still example-only. Writing real
  working-order lines from the Catalog is the next slice.

### Not in the first slice

- "Also sold by · Not connected", which needs a platform-usable source.
- Fuzzy or AI matching, and the steward review tool.
- Lineage authoring.
- Images, unless the file carries image URLs we may show.
- A dedicated search engine.
- Sourcing plans.
- Supplier APIs.

### Decisions for the slice (approved 2026-10-09)

1. **The supplier and a real sample file.** Still to come. The prepared
   migrations stay unapplied until that file has been profiled against the
   model (next step below).
2. **Server-side catalog import (approved).** A server-only ingestion
   module may use the existing privileged server credential, narrowly
   encapsulated in that boundary:
   - The credential is never exposed to the client. The existing
     secret-leak checks stay in place.
   - The requesting user is authenticated normally first.
   - Organization membership and an owner or admin role are verified
     before any privileged catalog write.
   - Every imported record is scoped explicitly to the authorized
     organization, and its supplier relationship and connection, as the
     rights model requires.
   - Organization, supplier, connection and other tenant boundaries are
     never trusted because the client submitted them. They are resolved
     server-side from the authenticated user's own memberships and
     records.
   - Tests cover cross-tenant and role-escalation attempts through the
     import path.
3. **Who may import (approved):** owners and admins only in V1.
4. **Uncategorized products (approved).**
   - Products that can't yet be mapped into the taxonomy still import and
     stay searchable.
   - "Uncategorized" is a data state (`product.category_id` is null), not
     a category.
   - The UI may group them as "Other", but no catch-all "Other" category
     is created in the taxonomy.

### Next step: pressure-test against a real supplier file

Before the migrations are applied, a representative real supplier export
or feed will be profiled. It is not imported.

The review covers:
- the source's actual structure, mapped onto Product → Variant → Supplier
  offer → Observation;
- identifiers and how complete they are;
- how brand or manufacturer is represented;
- how Products and Variants appear;
- category structure, attributes, and pack/UOM behavior;
- pricing, and availability or warehouse data;
- descriptions and other content;
- the source identifiers we must keep;
- what is missing or ambiguous.

Unfamiliar fields are reported, not silently normalized or dropped. The
review then states:
- which schema assumptions the data disproves or makes questionable;
- the smallest schema changes needed, if any;
- what can be imported confidently, what needs mapping, and what should
  stay raw source data at first.

If the file exposes no problem with the prepared schema, the review says
so. The file itself is never committed to the repository.

## Catalog screens on example data (2026-10-10)

The retailer-facing Catalog follows the Figma Catalog and Product Detail
designs (`/catalog`, `/catalog?supplier=…`, `/catalog/[productId]`). Until
the migrations are applied and a source is imported, it runs on example
data only (`src/demo/catalog.ts`). That data is built from the example
proposed orders and inventory: real product names and brands, one Variant
per order line or inventory item. A few second-supplier offers exist only
to show comparison; each is marked `illustrative` and labelled "Example
comparison".

What the screens hold to:
- **Recommendation scope.** Example recommendations come from proposed
  order lines, so they are Variant-level (G1). Product Detail says which
  option they are for ("3 recommended for 700 × 28"). Other options'
  recommendations are listed separately. A product-wide total is never shown.
- **Supplier cost, not landed cost (G2).** "Best source — Supplier · $X
  each" uses the supplier's price per canonical unit (packs normalized).
  The reason underneath uses only what the proposed orders already say:
  - which proposed order holds the recommendation;
  - how far that order is from free freight;
  - when another supplier lists the item for less.

  No freight or landed figure is estimated (`features/catalog/sourcing.ts`).
- **Adding to an order (example only, 2026-10-10).** Product Detail follows
  the updated Figma design: the product on the left, and the decision for
  the selected option in a sticky dark card on the right (the
  recommendation, a quantity starting at it, "Add N to {supplier} order",
  "Choose another supplier"). Both buttons open a side tray. There, each
  supplier offering the option is a destination:
  - its proposed order: the option's own line is set to the quantity, or
    the option is added under "Added from the Catalog";
  - an order already started from the Catalog;
  - a new order, which starts one (`/orders/draft-{supplier}`).

  Moving a recommendation to another supplier offers to take it off the
  order it was in, so it isn't bought twice. Adding the same option again
  sets its quantity and never doubles it. The order page, the order list
  (totals, lines, free freight) and the product card all read the same
  state. It lives in this browser only (`features/orders/drafts.ts`); the
  real version is the working purchase order. Sending a started order
  isn't part of the example.
- **Retailer network (Phase 2).** Product Detail shows the example network
  listings and Wholesale Market Value with the same mocked introduction as
  orders. No new network backend.
- **Product images.** A product shows an image only when one is attached
  with its source (`CatalogImage.source`); otherwise a quiet placeholder
  shows ("No product image matched yet"). Example-catalog photos are local
  only:
  - `npm run demo:images` (`scripts/demo-images/`) searches a few bike
    shops' public storefront search by product name.
  - It keeps a result only on a strict name match (every model word and
    number, and the brand), and downloads the photo into
    `public/demo/products/`, which is git-ignored and never committed.
  - It writes `manifest.json`, which `src/demo/catalog.ts` reads, and
    `review.html`, a contact sheet for checking every match.
  - `--relaxed` adds a fallback for products with no strict match: the
    closest result of the same brand and the same general product type
    (tire, helmet, pedals, light, hub, bottle cage…), allowing another
    size, color, pack or model.
    - It prefers the result sharing the most words of the product name,
      and never crosses types. The type is read from each store title; for
      our own product, from its name or else its catalog category.
    - These are recorded as approximate, labelled "Approximate demo match"
      on the review sheet (with the store's title and page), and captioned
      as a similar product's image on Product Detail.
    - An exact image is never replaced by an approximate one, and an
      approximate one gets a strict retry on every run.
  - `overrides.json` hides a wrong match or supplies an image URL.
  - Without the folder, every product shows the placeholder.
- **Discovery is derived.** Search, filters (with counts that follow the
  results), contextual attribute filters and sort are pure functions over
  presentation shapes (`features/catalog/search.ts`). The same functions
  can later read the rights-filtered discovery index. Attribute filters
  keep both meanings: one normalized value (622) and the designations the
  item is sold under ("700c / 29″").

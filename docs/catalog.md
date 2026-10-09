# Catalog, sourcing and order creation

**Status: architecture approved (decisions D1–D8, 2026-10-09). Not built,
not migrated.**

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

## Schema changes (approved, not written)

These go in one additive migration when catalog work starts, and a second
when sourcing is built. Applied migrations are never edited. The catalog
tables hold no data and no application code reads them yet.

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
3. **Identifiers.**
   - The closed CHECK becomes an `identifier_type` reference table.
   - An identifier attaches to a Product or a Variant.
   - It records the source record, import batch and source rights.
4. **`attribute_definition`.**
   - Key, label, data type, unit and allowed values.
   - Scope: industry and/or category.
   - Flags for variant axis and facetable.
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

These must be settled first:

1. **The first catalog source and its rights.** Which supplier feeds or
   licensed data will populate the shared catalog, and are we allowed to
   use them platform-wide? Until a platform-usable source exists, every
   retailer's Catalog is only what their own connections provide, and
   "Also sold by" has nothing it may show.
2. **The first industry taxonomy and attribute definitions.** Categories
   and variant axes for bicycles, parts and accessories, enough to facet
   and to collapse Variants.
3. **The catalog migration applied** (items 1–9). These are renames and
   new tables only, but they need your manual apply like every migration.
4. **The search approach for V1.** Postgres full-text with a facet table
   is enough to start. The per-context index (global vs supplier-scoped,
   rights-filtered) must be built before the UI.

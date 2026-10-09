# Catalog, sourcing and order creation

**Status: proposed, awaiting approval.** Nothing in this file is built or
migrated. It reviews the shared Catalog, product identity, provenance,
matching, lineage, order creation and sourcing optimization against the
schema in `supabase/migrations/` and `architecture.md`. It records what to
lock in, what to keep flexible and what to defer, and the decisions that
need an answer before any of it is built. The retailer-facing Catalog and
these workflows wait for approval.

The platform starts with independent bicycle retailers. Nothing in the
catalog core may assume bicycles.

## How the concepts map onto what exists

The foundation already separates the three things that matter most:
identity, a supplier's commercial listing, and what we observed about
price and stock. The gaps are naming, identifiers, attributes, provenance
and the order/sourcing side.

| Concept | Today | Verdict |
|---|---|---|
| **Product** (model / family) | `product_group`, optional | Right idea; optional and named differently (**D1**, **D2**) |
| **Variant** (sellable configuration) | `product` ("canonical sellable variant") | Right grain; the name says Product (**D1**) |
| Variant dimensions | `product.attributes` / `product_group.attributes` (jsonb, untyped) | Not hard-coded to size and color (good); no definitions, so no reliable facets or variant axes |
| **Identifiers** | `product_identifier`: type limited to UPC / EAN / GTIN / MPN by a CHECK; source is a coarse enum; Variant only | Too closed; no link to the source record; can't attach to a Product |
| Supplier SKU | `supplier_item.supplier_sku` | Correct: it identifies the offer, not the product |
| **Supplier Offer** | `supplier_item` (global, catalog facts, no wholesale price), one per supplier market and SKU, with pack / UOM | Matches the concept; keep the name in the schema, call it an offer in prose |
| Offer pricing | `supplier_offer_observation.unit_cost`, `price_type`, per retailer relationship | Correct: prices are relationship-specific and never global |
| **Warehouse availability** | `supplier_warehouse`; `supplier_offer_observation` with warehouse, quantity or status, `observed_at`, expiry, retention | Already meets the requirement (supplier, offer, warehouse, quantity/status, freshness) |
| **Provenance** | Raw source records are kept (`supplier_item`, `retailer_item`, `import_batch`); canonical `product` fields have no record of which source said what, or why a value won | Gap: canonical values aren't explainable |
| Product content (descriptions, features, images) | `supplier_item.description` + `attributes`; no images | Gap: no home for images; long-form content only in jsonb |
| **Matching** | `product_match`: item → Variant, confidence, method, evidence, `candidate` / `active` / `rejected` / `superseded`, decided by system / user / platform admin; history kept | Already the right shape for confidence-based resolution and remembered human decisions |
| Duplicate canonical products | `product.status = 'merged'` + `merged_into_product_id` | Fine for true duplicates; must never be used for replacements |
| **Lineage** | `product_relationship`: successor / replaced_by / closest_equivalent / comparable; source type; confidence; evidence; market; effective date | Close; types need settling (**D8**) and Product-level lineage is missing |
| Category / industry | `category.industry`, `organization.industry` (default `bicycle`) | Fine; no bicycle-specific columns in the catalog core |
| **Order as working object** | `purchase_order` (draft → approved → submitted) | Right object. POS drafts can't be imported (**D3**); lines don't record how they were added |
| **What vs how to buy** | `recommendation` (immutable, supplier optional) and `recommendation_line` (supplier item optional) | "What" fits already. "How" (the sourcing decision) has no home |
| Freight | `supplier_terms` `free_freight_threshold` | Threshold only; no freight cost model (already listed as not built) |
| Search and discovery | Search runs per request as the user; "Postgres full-text first" is recorded | Fine for pages; faceted catalog discovery needs a derived index |

## Decisions needed

Each decision has a recommendation; nothing is built until it's approved.

**D1. Names: Product and Variant.** The concepts say Product = model and
Variant = configuration. The schema says `product_group` = model and
`product` = variant, and `product_id` on recommendation, order, program
and conversation rows means the variant.
- *Recommended:* rename now, in one additive migration, while no
  application code reads these tables and they hold no data:
  `product_group` → `product`, `product` → `product_variant`, and
  variant-meaning `product_id` columns → `variant_id`. The cost of the
  rename only grows from here.
- *Alternative:* keep the physical names and map them in the docs. Cheaper
  today, but a permanent source of confusion.

**D2. Every Variant belongs to a Product.** Today the model grouping is
optional.
- *Recommended:* required. A simple component is a Product with one
  Variant. Browsing, lineage and model-level identifiers then always have a
  Product to attach to.

**D3. Importing a draft purchase order from the POS.** `purchase_order`
allows a POS-origin order only once submitted
(`check (origin = 'platform' or status = 'submitted')`), so a draft or open
POS PO can't be brought in.
- *Recommended:*
  - Mirror POS purchase orders as they are: `origin = 'pos'`, any external
    status, read-only.
  - Bringing one into Buying Intelligence creates a platform working order
    that points at it (`source_purchase_order_id`). Buying Intelligence
    owns the working copy until handoff.
  - At handoff, the POS side updates that same POS PO rather than creating
    a second one (through the planned `purchase_order_handoff`).
- *Needs your answer:* who owns the order after import, and whether edits
  ever sync back to the POS before handoff.

**D4. Is supplier catalog content shared across retailers?**
`supplier_item` is global today, including content we only received
through one retailer's connection credentials.
- *Recommended:*
  - Catalog facts (identity, identifiers, descriptions, attributes,
    images) are platform-wide, unless a supplier's or provider's terms
    forbid it. That would be a per-provider sharing flag, recorded like
    retention is today.
  - Prices and availability stay relationship-scoped.
- *Needs your answer:* this is a commercial and legal question as much as a
  technical one.

**D5. What the global Catalog shows for suppliers the retailer doesn't
buy from.**
- *Recommended:* every known offer appears as a sourcing option, but
  price and availability appear only through the retailer's own
  relationships. Unconnected suppliers read as "Also sold by X (not
  connected)". Nothing seen through one retailer's account is shown to
  another.

**D6. One working order per supplier?** "Add to my existing order" and
optimizing against open orders need to know which draft is "the" order.
- *Recommended:* by default, one open draft per supplier relationship and
  ship-to location. This is enforced in the application, not the database,
  so an intentional second draft (a program order kept separate) is still
  possible.

**D7. Where sourcing decisions live.**
- *Recommended:*
  - `recommendation` stays "what to buy", with the supplier left open
    (already allowed).
  - A new immutable **sourcing plan** records "how to buy": which offers,
    warehouses and orders fulfill which needs, the alternatives considered,
    the estimated landed economics and the explanation.
  - Proposed orders are the output of a sourcing plan.

**D8. Lineage types.**
- *Recommended mapping:*
  - `successor` → **direct successor**.
  - `closest_equivalent` → **functional replacement**.
  - `comparable` → **substitute / alternative**.
  - Retire `replaced_by`, which is only the inverse of `successor` and
    invites the same fact stored twice.
- *Also recommended:* allow lineage between Products as well as Variants
  (the 2026 model succeeding the 2025 model), with Variant-level links when
  sizes or colors map one-to-one.

## Lock in now

- **Identity, offer and observation stay separate.**
  - A Product or Variant is what the thing is.
  - A supplier item is one supplier's offer of it, with its own SKU, pack
    and UOM.
  - Price and availability are observations of an offer, through a
    relationship, at a time, optionally per warehouse.
  - Availability is never a product attribute.
- **One real-world item is one Variant.** Several suppliers' offers match to
  it; we never create a second Variant because a second supplier sells it.
- **Duplicates and replacements are different things.** Same identity:
  match the offers, or merge true duplicate Variants. Replacement: two
  distinct entities joined by lineage, never merged. History stays on the
  item that produced it, and analysis borrows it through lineage, weighted
  by the relationship's type and strength.
- **Source data is never overwritten.**
  - What each source said stays as it said it.
  - The canonical value is a separate, explainable choice: which source,
    why, and with what confidence.
  - Corrections change the choice, not the source.
- **Identifiers are open-ended and sourced.**
  - New identifier types are data, not schema changes.
  - Every identifier remembers where it came from.
  - Identifiers are not unique keys, because real data reuses and
    conflicts.
- **No industry in the core.**
  - Variant dimensions and attributes are data, defined per category or
    industry.
  - The core has no size, color, wheel-size or similar column.
  - Bicycle knowledge lives in taxonomy and attribute definitions.
- **Catalog stewardship is the platform's job.** Matching, review and
  lineage run at platform level. Retailers are never asked to clean
  supplier data. A retailer's corrections to their own POS items stay
  private to them.
- **Confidence-based resolution, remembered.**
  - Strong evidence resolves automatically.
  - Ambiguous cases go to a platform review queue.
  - Weak evidence keeps records apart.
  - Every human decision, including "these are not the same", is stored,
    so the same problem isn't solved twice.
- **What to buy and how to buy are separate decisions, both immutable and
  explainable.** The need doesn't change because the sourcing does.
- **Sourcing optimizes the whole buying picture, not each line.** The
  inputs:
  - all open needs
  - existing working orders
  - supplier preference
  - offer price and warehouse availability
  - number of orders
  - freight thresholds and freight cost
  - programs
  - delivery timing

  A non-obvious choice is explained answer first ("We split these between
  two suppliers because both orders qualify for free freight, saving about
  $42 compared with ordering nine from Supplier B"), then the reason and the
  evidence.
- **An order is one working object with many ways in.** Catalog,
  supplier-scoped Catalog, POS import and recommendation all create or
  modify the same `purchase_order`. Each line records how it got there.
- **Platform intelligence vs retailer intelligence.**
  - Catalog identity, verified matches and verified lineage from supplier,
    manufacturer and steward sources are platform-wide.
  - Anything learned from a retailer's own sales, inventory or buying stays
    theirs. It contributes to platform-wide matching or lineage only with
    the industry-intelligence agreement, and only in aggregate.
- **Discovery reads a derived index.** Search, facets, sorting and
  supplier comparison read an index built from the catalog, not the
  transactional tables directly, so the discovery experience can improve
  without reshaping the schema.

## Smallest durable changes

These are proposals for one additive migration when catalog work starts,
plus a second for sourcing when optimization is built. Neither is written
yet, and applied migrations are never edited.

**Catalog (when catalog work starts)**
1. **Names and the required Product** (D1, D2).
2. **Identifiers.**
   - Replace the closed type CHECK with an `identifier_type` reference
     table (UPC, EAN, GTIN, MPN, and later ISBN, JAN, manufacturer model
     codes, anything else).
   - Let an identifier attach to a Product or a Variant.
   - Record its source record (supplier item, retailer item, manual,
     import) and import batch.
3. **`attribute_definition`.**
   - Fields: key, label, data type, unit, allowed values, scope (industry
     and/or category), and flags for "variant axis" and "facetable".
   - Attributes stay jsonb on Product and Variant, keyed by definition.
     Unknown keys are kept, but don't facet until defined.
4. **Provenance: `catalog_assertion`.**
   - Each row records what one source said about one field or attribute
     of one Product or Variant: the value, the source record, when it was
     observed, and the import batch.
   - The canonical value records which assertion it came from, who or what
     chose it, and the confidence.
   - This could wait until a second source describes the same product, but
     no canonical value may be written without a recorded source.
5. **`product_media`.** Images and documents, with source, order and
   rights / sharing flag (follows D4).
6. **Negative decisions.**
   - A small table of verified "not the same product" pairs, so a rejected
     pairing between two canonical items is never proposed again.
   - Rejected `product_match` rows already cover item → Variant.
7. **Lineage.** D8 types; Product-level subjects. Strength stays
   `confidence` plus evidence. How much history a successor inherits is
   decided in analysis, not stored as a fixed weight.

**Orders and sourcing (when sourcing optimization is built)**

8. **POS draft import** (D3); `purchase_order_line.origin` (catalog,
   supplier catalog, recommendation, POS import, manual) and an optional
   ship-from warehouse per line.
9. **`sourcing_plan` and `sourcing_plan_line`** (D7). Both are immutable,
   like recommendations:
   - which needs, which offers and warehouses, which orders (new or
     existing)
   - the objective and its inputs
   - estimated landed cost and freight
   - the best simple alternative and the savings against it
   - a plain explanation
10. **Freight cost.** Add a `freight_cost` term type (a jsonb schedule)
    beside the existing free-freight threshold in `supplier_terms`.

**Already in place:** warehouse availability with freshness
(`supplier_offer_observation`), and match confidence, evidence and
history (`product_match`).

## Keep flexible

- Matching methods, thresholds and the AI role in fuzzy matching (the
  evidence jsonb holds whatever signals are used).
- The taxonomy and attribute content per industry, including where model
  year lives (a column today; it may become an attribute).
- How strongly lineage transfers history, and how that learns from
  supplier, retailer and market behavior.
- The optimization method and objective weights (landed cost, order
  count, preference, timing, program benefit).
- The search engine: Postgres full-text first; a dedicated engine if facets
  and scale need it.
- How long availability and price observations are kept (already per
  provider).

## Deliberately deferred

- Kits and bundles (a bike sold with accessories, a set sold as one SKU).
- Serialized items.
- Supplier-side catalog editing and manufacturer feeds.
- Cross-currency comparison of offers in different supplier markets.
- Durable "what changed" history for catalog content.
- The platform review tooling's interface.
- The retailer-facing Catalog UI.

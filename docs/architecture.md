# Architecture foundation

B2B retail buying intelligence, starting with specialty bicycle retail.

> Complexity behind the glass. Clarity in front of it.

This file records the approved foundational decisions behind the initial
database schema (`supabase/migrations/`). It is the reference to check new
work against.

## Sources of truth

| Owner | Authoritative for |
|---|---|
| Retailer POS | Sales, current inventory, purchase history, POS-originated POs |
| Supplier systems | Supplier inventory, pricing, supplier product data, order status, supplier-published programs |
| This platform | Canonical product identity, cross-system matching, context, recommendations, intelligence, lineage, supplier preferences, normalized programs, orchestration |

## Core principles

- **Preserve truth in the data; interpret in the analysis.** Sales stay on the
  retailer item that produced them. Matches and lineage are separate,
  correctable links, never merges.
- **Recommendation ≠ purchase order.** Recommendations are immutable system
  output. Orders carry the buyer's decisions.
- **Retailer data is private by default.** Suppliers see nothing identifiable
  without explicit retailer permission. No supplier feedback loop in V1.
- **Supplier data may be cached for analysis; transactional values are
  revalidated live** as close to submission as each integration allows.
- **Retention is per provider.** Nothing depends on storing external payloads
  forever (`history`, `latest_only`, `transient`).
- **Business logic lives in application code and standard SQL.** Supabase
  provides Postgres, Auth, Storage and RLS; only `app.current_user_id()` and
  the storage migration depend on Supabase specifics.

## Conventions

| Topic | Rule |
|---|---|
| Identifiers | UUID primary keys everywhere |
| Money | `monetary_amount` (6 dp) + `currency_code`, always together |
| Quantities | `quantity` (4 dp); nothing assumes whole "each" units |
| Time | `timestamptz` (UTC); every location has a timezone; sales/inventory also store the local business date |
| Status fields | `text` + `CHECK` (easy to extend), not Postgres enums |
| Tenancy | Every private row carries `organization_id`; RLS on every table; composite foreign keys stop a row from pointing at another tenant's data |
| Audit | `change_log` via trigger on decision-bearing tables; append-only |
| Deletion | Users never hard-delete history; server-side cascades exist for data-deletion requests |

## Tables (35)

Visibility key: **G** global/shared · **R** retailer-private ·
**Rel** relationship-specific (retailer side only in V1) · **O** owner-scoped
(private to the owning org: a retailer today, a supplier later).

| Area | Table | Vis. | Purpose |
|---|---|---|---|
| Orgs | `organization` | G (suppliers) / R (retailers) | Retailer or supplier company |
| | `membership` | R | Auth user ↔ organization, role |
| | `organization_agreement` | R | Append-only consent record; platform terms and industry-intelligence contribution are separate types |
| | `location` | R | Store / warehouse / office / ship-to; own country + timezone |
| Supplier directory | `supplier_market` | G | Supplier company in one country (HLC US, HLC Canada) |
| | `supplier_warehouse` | G | Optional fulfillment locations |
| | `brand` | G | Brand, optionally owned by a supplier |
| | `category` | G | Our taxonomy, per industry |
| | `product_group` | G | Model / model year grouping variants |
| Integration | `connection` | O | POS or supplier connection; capabilities; retention policies; Vault pointer |
| | `document` | O | Uploaded files (bytes in Storage) |
| | `import_batch` | O | Every pull/upload; raw payload pointer + retention state |
| | `sync_coverage` | R | What each sync fully observed ("unchanged" vs "not observed") |
| | `change_log` | O | Audit trail |
| Catalog | `product` | G (private while provisional from POS data) | Canonical sellable variant |
| | `product_identifier` | follows product | UPC / EAN / GTIN / MPN |
| | `supplier_item` | G | Supplier catalog entry; raw + normalized UOM; no wholesale price |
| | `retailer_item` | R | POS item as the POS has it; selling UOM; stocking intent |
| | `product_match` | G (supplier items) / R (retailer items) | Item → product with confidence, evidence, status |
| | `product_relationship` | G | Successor / replaced-by / equivalent / comparable |
| Relationships | `supplier_relationship` | Rel | Claimed / verified / inactive / suspended; preference |
| | `supplier_terms` | Rel | Time-aware terms; optional location override |
| | `supplier_offer_observation` | Rel | Cached price/availability; optional warehouse level |
| POS mirror | `sale_line` | R | POS sales/returns with local business date |
| | `inventory_history` | R | Change-based on-hand periods + last confirmation |
| Programs | `program` | O | Private (retailer upload) or public (supplier-published) |
| | `program_version` | follows program | Versioned interpretation; frozen once confirmed |
| | `program_rule` | follows program | Tiers, thresholds, benefits, original wording |
| | `program_eligibility` | follows program | What qualifies (or unresolved source lines) |
| | `program_link` | R | Private program → official program; never merged |
| Context | `context_item` | R | Scoped, evergreen/temporary, stated/inferred beliefs |
| Decisions | `recommendation` | R | Immutable output; status open / acted_on / dismissed / expired / unaddressed; `actionable_until` |
| | `recommendation_line` | R | Quantity, forecast, coverage, frozen assumptions, explanation |
| | `purchase_order` | R | draft → approved → submitted, or discarded; POS-origin mirrored |
| | `purchase_order_line` | R | Recommended / working / approved / submitted values; live validation |

Plus the view `organization_agreement_current` (latest decision per agreement type).

## Key mechanics

**Four truths of a buying decision.** `recommendation_line` holds what the
system recommended (immutable). Buyer edits to `purchase_order_line` are
logged in `change_log`. At approval the database copies working quantities
and costs into `approved_*`; at submission it fills `submitted_*`, keeping
any price the server revalidated live. Approved orders cannot be edited
without returning to draft, which clears the stale approval.

**Recommendation performance.** Agreement = recommendation line vs approved /
submitted values. Outcome = later sales, inventory history and sync coverage,
judged against the frozen forecast, coverage period, stock position and
stocking intent. No outcome tables yet; the inputs are preserved.

**Program privacy.** Retailer uploads are owned by the retailer and cannot be
made public by the retailer. `program_link` lives on the retailer's side and
points private → official, so the official program never reveals who
uploaded a copy. Analyses stay tied to the version they were computed on.

**Units of measure.** `supplier_item.uom_raw` keeps the supplier's text
(`b/12`); `unit_type`, `pack_quantity`, `order_multiple` and
`minimum_order_quantity` are the normalized form. `retailer_item` has its own
selling unit and `units_per_selling_unit`. Order and recommendation
quantities are in ordering units with a frozen `units_per_order_unit`.

**Retention.** `connection.raw_payload_retention` governs raw payloads
(default `transient`, 7 days, until terms are confirmed);
`connection.observation_retention` governs cached supplier observations.
Normalized rows keep their `import_batch_id` after raw data is purged.
Recommendation lines copy the assumptions they used, so purging an
observation never breaks an explanation.

## Not built yet (deliberately)

Supplier logins and supplier-side access, retailer→supplier data-sharing
grants, program audience lists, industry-intelligence aggregate tables,
outcome/metrics tables, supplier account numbers per location, lost-sales
capture, order transmission to suppliers/POS. Each can be added without
reshaping the tables above.

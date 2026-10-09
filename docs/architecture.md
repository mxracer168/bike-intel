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

- **Sortable tables.** Data tables should allow users to sort meaningful
  columns directly from the column header. The first selection sorts
  descending and the second ascending, with the active sort and direction
  always visible. Sorting should respect data type, work alongside
  filtering, and remain keyboard and screen-reader accessible.
- **The application defines the product; the design reference defines its
  look.** Useful functionality and information are kept and restyled, never
  dropped because a visual reference omits them; real conflicts are flagged
  (`design-system.md`, "The Figma design reference").
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
- **Code may deploy before its migration.** Migrations are applied to the
  live project by hand, so reads of tables or columns added by a recent
  migration recognize "not there yet" (`lib/supabase/schema.ts`) and fall
  back to what the older schema can answer. A page must never fail because
  an optional, newer column is missing; writes that need it report that
  plainly instead.

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

## Application (tenant bootstrap + skeleton)

Next.js (App Router, TypeScript) at the repository root; Supabase Auth with
email + password and email confirmation.

- **Three database access paths.** Server code acting as the signed-in user
  (`lib/supabase/server.ts`, RLS applies); a server-only admin client
  (`lib/supabase/admin.ts`, marked `server-only`) used solely for
  organization bootstrap; and no database access from browser code at all.
- **Organization bootstrap** is one transaction in the database function
  `bootstrap_retailer_organization`, callable only with the service role.
  Duplicate submissions are prevented by a per-request key
  (`organization.creation_request_id`), not by limiting users to one
  organization. People may belong to several organizations.
- **Active organization** is resolved in one place
  (`domain/organization/active.ts`): the user's earliest active retailer
  membership until an organization switcher exists.
- **Onboarding is defined by missing facts** (`domain/onboarding/status.ts`):
  organization, country, a location, platform terms, industry-intelligence
  choice. Today's forms are one front end over domain commands; a
  conversational onboarding can call the same commands.
- **Consent** is two separate append-only rows in `organization_agreement`
  (platform terms, industry intelligence) sharing a `presentation_id`.
- **Shell and routes.** Flat left sidebar (`content/navigation.ts`): Today,
  Orders (`/orders`, `/orders/[orderId]`), Inventory, Programs, Suppliers,
  Insights (performance and opportunities), Business (profile, locations, team
  as tabs). `/recommendations`, `/performance` and `/opportunities` redirect to
  where their content now lives.
- **Presentation shapes, not data models.** `ProposedOrderView` /
  `OrderLineView` / `OrderSummary`, `WorkItemView` and `SupplierPresentation`
  describe what screens render. Today is business health cards plus one ranked
  list of `WorkItemView`s; an order becomes one item
  (`features/work/fromOrder.ts`) and line evidence stays on the order.
- **The intelligence conversation is the interface; `context_item` is the
  memory.** Each retailer has one ongoing, private conversation
  (`intelligence_message`, append-only), opened from "Add context" anywhere in
  the app. It holds notes, answers, attachments and check-in markers and is
  never rewritten. Questions live once in `intelligence_question`
  (open / answered / deferred / withdrawn), so answering in the panel, the
  weekly check-in or anchored on an order resolves the same row
  (`answer_intelligence_question`, run as the user). Attachments are ordinary
  `document` rows whose bytes sit in `documents/<organization_id>/intelligence/`;
  nothing reads them yet, and the conversation says so. Interpreting the
  conversation into `context_item` (with `source_message_id` /
  `source_document_id`) comes later; nothing is inferred today. Voice input
  relies on the device's own dictation for now. Quick answers are stored on
  the question (`answer_choice`), not in the conversation. The assistant
  model (tell / ask / answer, and "retrieve, don't dump") is in
  [`intelligence.md`](intelligence.md).
- **Retailer network** (inventory sharing) is example-only for now; principles
  and the future model are in [`network.md`](network.md).
- **Sync status** is one quiet line in the sidebar (example-only for now). Real data is mapped
  into them; they carry no schema commitments. A supplier page is an identity
  plus an ordered list of typed sections, so it can be sparse or rich.
- **Example data** lives in `src/demo/`, gated by `DEMO_PREVIEW` (default on
  only under `next dev`), always visibly marked, never written to the database.

## Tables (39)

Visibility key: **G** global/shared · **R** retailer-private ·
**Rel** relationship-specific (retailer side only in V1) · **O** owner-scoped
(private to the owning org: a retailer today, a supplier later).

| Area | Table | Vis. | Purpose |
|---|---|---|---|
| Orgs | `organization` | G (suppliers) / R (retailers) | Retailer or supplier company; `created_by` + `creation_request_id` for idempotent bootstrap |
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
| POS mirror | `sale_line` | R | POS sales/returns with local business date; source and provenance, special-order flag (demand channel and fulfillment not yet modelled, see Demand channels) |
| | `inventory_history` | R | Change-based on-hand periods + last confirmation |
| Programs | `program` | O | Private (retailer upload) or public (supplier-published) |
| | `program_version` | follows program | Versioned interpretation; frozen once confirmed |
| | `program_rule` | follows program | Tiers, thresholds, benefits, original wording |
| | `program_eligibility` | follows program | What qualifies (or unresolved source lines) |
| | `program_link` | R | Private program → official program; never merged |
| Context | `business_instructions_version` | R (history: owners/admins) | The retailer's long-form instructions; append-only versions; version assigned under a per-org lock with a stale-save check; written only by a signed-in owner/admin (enforced by trigger); members read the current version only |
| | `business_rule` | R | Superseded by business instructions; in the database, unused |
| | `context_item` | R | Scoped (incl. category/product), evergreen/seasonal/temporary, stated/inferred beliefs, review date, source message/document |
| Intelligence | `intelligence_message` | R | The retailer's one ongoing conversation; append-only |
| | `intelligence_question` | R | Questions worth asking, with lifecycle; answered once wherever shown |
| Decisions | `recommendation` | R | Immutable output; status open / acted_on / dismissed / expired / unaddressed; `actionable_until` |
| | `recommendation_line` | R | Quantity, forecast, coverage, frozen assumptions, explanation |
| | `purchase_order` | R | draft → approved → submitted, or discarded; POS-origin mirrored |
| | `purchase_order_line` | R | Recommended / working / approved / submitted values; live validation |

Plus the views `organization_agreement_current` (latest decision per agreement type) and
`business_instructions_current` (latest instructions),
the server-only function `bootstrap_retailer_organization` and
`answer_intelligence_question` (runs as the user).

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

## Demand channels: what kind of demand a sale represents

Historical sales are not one undifferentiated demand stream. A tube sold over
the counter, a tube used in a repair, a tire ordered for one named customer
and a helmet bought online and shipped from the warehouse imply very
different things for forecasting, replenishment, assortment and inventory
risk. The platform preserves those distinctions wherever source systems make
it possible.

**Four separate facts, never one "sales type" field:**

| Fact | Answers | Examples |
|---|---|---|
| **Demand channel** | Where, or through what kind of customer interaction, did the demand originate? | In-store, E-commerce, Service, Rental; later B2B / commercial, events, others |
| **Data source** | Which external system supplied the transaction? | Lightspeed Retail, Shopify, a work-order system, another POS |
| **Fulfillment** | How, and from where, was it fulfilled? | From the selling location, another store, a central warehouse, drop-ship, supplier-direct; pickup or shipment |
| **Special-order intent** | Did a specific customer commit to this item? | Known from the source, inferred by the platform, or unknown |

- **Channel is not source.** Not everything from Shopify is one kind of
  demand, and not everything from a POS is ordinary in-store stocking
  demand. Channel is assigned per transaction (or line), not per
  connection.
- **Channel is not fulfillment.** A customer can buy online while a store, a
  warehouse or a supplier fulfills it. Online demand fulfilled from a store,
  from a warehouse, or drop-shipped are three different signals for local
  stocking.
- **Retailer-defined channels.** In-store, E-commerce, Service and Rental are
  a starter list, not an industry taxonomy. Retailers will be able to rename,
  disable and add channels; logic keys off a stable channel identity, never
  its display name.
- **Special orders don't teach stocking.** An item sold because one customer
  committed to it must not teach the system "this store should normally
  stock it". Where the source says so, keep it; where the platform infers a
  likely special order, the inference stays distinguishable from known
  source data (who or what decided, and when).
- **Service consumption is real demand.** Parts used on a work order (tubes,
  cables, brake pads) count as demand even when never scanned at a retail
  checkout, and keep their service identity. This may later affect stocking
  targets, stockout tolerance, replenishment priority, forecasting and
  assortment; no weighting exists yet.
- **Provenance travels with every line:** source system, the source's
  transaction and line identifiers, the import batch.

**Channel-aware intelligence (future).** The recommendation engine should be
able to say things like "most of this item's demand comes from service",
"online demand is growing while store demand is flat", "these were special
orders, so we didn't treat them as normal replenishment demand", or "this
location fulfills much of the organization's online demand". Nothing
channel-aware is built: today's pace and weeks-of-supply figures (including
the excess rule) treat demand as one stream and must become channel-aware,
excluding special orders, when this lands.

**What the schema has today (`sale_line`):**

| Need | Today |
|---|---|
| Data source | `connection_id` (the provider) |
| Provenance | `external_sale_id`, `external_line_id`, `import_batch_id` |
| Location | `location_id`, which is the location the source reported; whether that is where it was sold or where it was fulfilled is not distinguished |
| Special-order intent | `is_special_order` (true / false / null = not reported); no way yet to mark a value as inferred rather than reported |
| Demand channel | Not represented (anything a source reports sits unmodelled in `attributes`) |
| Fulfillment method / location | Not represented |
| Service / work-order consumption | Not represented: no work-order source; consumption would not arrive as an ordinary sale line |

**Requirement for the additive migration (when a second channel or source
is connected, not before):** a retailer-scoped **demand channel** table
(stable id, display name, enabled, starter set seeded per retailer);
`sale_line.demand_channel_id`, `fulfillment_method` and
`fulfillment_location_id` alongside the existing location, with the
existing `location_id` documented as the selling location; special-order
provenance (reported vs inferred, by what, when); and a home for service
consumption (work-order lines, or sale lines in the Service channel with
their work-order reference). The import layer maps each source's fields into
these explicitly; unknown stays null rather than defaulting to "in-store".

## Supplier orders: finishing an order

The order page is where a retailer curates one supplier's order and then
hands it off. The lines and their expanded recommendation detail use the full
page width; the order-level summary lives in a compact header that stays in
view while the lines scroll. Behaviour decided so far:

- **The header carries only what's worth a glance**: the supplier's name,
  the exact order total with line count and status, the free-freight gap,
  the typical order with cadence and a comparison, and the one action
  (Review & submit). Terms, promotions and other supplier context may come
  back later through progressive disclosure if they prove important; there
  is no order-context sidebar.
- **The total is exact** ($4,824.10, never "about"), recomputed in cents as
  quantities change. When it can't be trusted to the cent, it says so under
  the total: lines without a price are left out and counted, and prices
  older than a few days are called out ("Prices 9 days old").
- **Freight shows the gap, not the terms**: "$176 away · Free over $5,000".
  No threshold, or already free: no freight block.
- **Typical order** is product language: today an example value, and the
  calculation behind it may change (it need not stay a simple average). The
  block shows the typical amount, how often the store orders ("Every ~12
  days") and how this order compares as a symbol and a number: ▲ 22%,
  ▼ 18%, or ≈ Typical within 5%. Color follows the symbol, never replaces it.
- **Approval and submission are separate states**, even when one action does
  both: `draft → approved → submitted`, or `draft → discarded`. An order the
  retailer still has to send themselves is *approved*, not submitted;
  "Mark as sent" submits it with `submission_method = 'export'`. Quantities
  are locked once approved. The method stays visible after submission.
- **"Review & submit" explains exactly what will happen** before anything
  does, worded from the actual connections (`features/orders/handoff.ts`):

  | | Supplier takes orders electronically | Supplier doesn't |
  |---|---|---|
  | **POS accepts purchase orders** | A. Submit to the supplier, create the PO in the POS. "Approve & submit". | B. Create the PO in the POS, prepare the supplier's order file (opens in Excel). "Approve & prepare order". |
  | **POS doesn't** | C. Submit to the supplier; prepare a file to create the PO by hand. "Approve & submit". | D. Prepare both files; the retailer sends one and enters the other. "Approve order". |

  The primary button carries the exact total. Supplier submission and the
  POS purchase order are two independent handoffs; neither implies the other.
- **Live revalidation is promised, never implied.** Where a supplier takes
  orders electronically, pricing and availability are rechecked just before
  sending (see "Core principles"). Screens describe that recheck as
  something that will happen; nothing says it happened unless it did. The
  example on the order page says plainly that nothing was sent or rechecked.
- **Files are the fallback, not a feature.** Order files are plain CSV with
  product, variant, quantity and unit cost (the POS file adds the supplier),
  so they open in Excel. Supplier-specific formats come with each supplier.

**Schema gap (not migrated).** `purchase_order` has one `connection_id` /
`external_*` set and one `submission_method`, so it can record *either* the
supplier submission *or* the POS purchase order, not both. Scenario A needs
both. When submission is built, add a small `purchase_order_handoff` table
(one row per target: supplier or POS; connection, method, status, external
reference, error, timestamps) rather than widening `purchase_order`; keep
`purchase_order.submission_method` as the supplier-side summary. Order
context (cadence, typical order) is derived from order history; terms,
freight thresholds and programs already have homes in `supplier_terms` and
`program_version`.

## Onboarding conversation: getting to know the retailer

A new retailer's first real experience is a conversation with their buying
advisor, not a setup wizard. It has two jobs: learn enough to understand how
the business actually works, and introduce the relationship the retailer
will keep with Buying Intelligence. The message it establishes early: we
don't just analyze sales data; we learn how the business works. Decided so
far:

- **Conversational, not form-driven.** Subjects are covered in conversation
  (the business, customers and riders, what's carried and deliberately not,
  buying approach, suppliers, seasonality, what makes the store different,
  and its philosophy on cash flow, stockouts and turns). Topics orient the
  retailer; they are not required steps, and the retailer is never held in
  a fixed sequence.
- **Questions adapt to answers.** A follow-up depends on what was said. The
  important case: when a retailer says "we don't carry road bikes", the
  advisor asks whether that is a firm decision or current behaviour, because
  the answer decides what it becomes.
- **Three kinds of learning, kept apart.** A conversation can surface
  durable rules ("We do not stock road bikes"), seasonal context ("Tourism
  rises May through August") and temporary context ("A major race at the
  end of October"). They stay distinct (`context_item` lifespan: evergreen,
  seasonal, temporary; see `intelligence.md`) and are never flattened into
  one memory.
- **Business instructions stay human-controlled.** A durable rule heard in
  conversation is only ever a *suggestion* for the retailer's business
  instructions; the instructions change only when an owner or admin edits
  them (`business-instructions.md`). Anything shown as learned is a
  candidate the retailer can review, not a stored fact.
- **Not everything said is intelligence.** Onboarding is the same
  conversation with the same intent boundaries: business context, business
  questions, product help, product feedback and casual conversation. Only
  business context is eligible to become intelligence.
- **One interaction model.** Onboarding is the first session of the
  retailer's ongoing intelligence conversation, not a separate tool. Later
  the retailer continues it through scheduled check-ins, by opening it any
  time, by adding context from a screen, by answering questions we've
  identified, and by asking about their business or the product.
- **Explain why context matters.** Before it ends, the advisor explains that
  some things never show up in sales history in time (a race coming to
  town, construction out front, a new competitor, a planned promotion,
  staffing changes, unusual weather, a category to push, a temporary stock
  concern), and that this is why it will keep asking.
- **It ends by offering a recurring check-in.** A short weekly conversation,
  recommended at a sensible time, which the retailer may accept, move or
  decline. Choosing that time may later take into account business hours,
  stated preferences, the buying schedule and calendar availability.

### Intelligence meetings

Onboarding is the first instance of a reusable **intelligence meeting**: a
conversation with the retailer's buying advisor that later weekly check-ins
reuse (`features/meeting`).

- **Why it matters, up front.** A meeting opens by placing itself in how
  recommendations are made: historical truth plus market intelligence plus
  the retailer's context make clear recommendations. The conversation is the
  context.
- **Meetings have an agenda.** It shows what's been covered, what's being
  discussed now and what's up next. It orients; it is not a wizard: no step
  counts, next buttons or progress bars, and the conversation may move
  between items in any order.
- **Agendas can be prepared.** Onboarding's agenda is predictable. A weekly
  meeting's agenda may later be prepared from the retailer's context:
  unanswered intelligence questions, supplier conditions, inventory
  opportunities, upcoming events, things the retailer mentioned before, and
  recommendations that would benefit from more context. Not built.
- **The transcript is available, not primary.** The conversation itself
  (and what's being said now) leads; the transcript is there to look back.
- **What was learned is reviewed at the right moment.** During the meeting,
  what we're learning is secondary reference. At the end it invites review,
  and durable rules remain suggestions for the retailer's business
  instructions, never written by the meeting.
- **The next step is part of the meeting.** At the end of onboarding,
  scheduling the recurring check-in is presented as the next item on the
  agenda, not as a separate prompt.

Today this exists only as a scripted example (`/demo/onboarding`, demo
preview only): no video, voice, speech, extraction, scheduling or writes.

## Search and notifications

**Search** is one shape (title, one line of context, where it lives, and
the group it belongs to) filled by sources: pages, suppliers, locations and,
where example data is on, orders, products on orders, inventory, programs
and connections. Adding something searchable means adding a source. Today it
runs on the server per request, as the signed-in user, so row-level security
and tenant boundaries apply; there is no index. When real data grows, a
stored per-retailer index (Postgres full-text first) can replace the
sources without changing the experience. Search never returns anything the
retailer can't already open.

**Notifications** are derived from current state, not stored events: a
connection needing attention, items a supplier can't ship on a proposed
order, a supplier program closing within 30 days, a new intelligence
question. Each carries a fingerprint of the state it describes, so a changed
state reads as new again. Nothing is invented to fill the panel.

- **Read state is per browser today** (the same approach as the retailer's
  priority order): the fingerprints a person has seen, kept locally. It
  doesn't follow them to another device. Durable read state, or true
  "what changed since you last looked" history, needs a decision about a
  per-person notification record and when events are generated (on sync, on
  a schedule, on change). Not decided; not built.
- **Real sources are thin today:** orders, connections and programs aren't
  stored yet, so outside example data only new questions can appear. Each
  source turns on as its data becomes real.

## Recorded for later (no schema change yet)

- **Recommendation confidence** becomes structured data in an additive
  migration when recommendations are built; decide then whether it lives on
  the line only or on both recommendation and line.
- **Adjustable buying assumptions** (e.g. weeks of cover): decide the levels
  (organization, location, category/product, recommendation override,
  context) when replenishment is built. No generic settings table.
- **Order undo / recoverability**: decide when order submission and supplier
  capabilities are understood. No delayed-send status yet.
- **Messages about one item**: a conversation message written from a
  recommendation carries the item it's about, so context from it can be
  scoped to that product. Needs a nullable `product_id` on
  `intelligence_message` (proposed, not applied); see `intelligence.md`.
  Supplier warehouse detail on "Why N?" already has a home
  (`supplier_warehouse`, warehouse-level `supplier_offer_observation`).
- **Demand channels**: channel, data source, fulfillment and special-order
  intent stay separate facts; retailer-defined channels; requirement for an
  additive migration recorded under "Demand channels" above.
- **Retailer network (excess inventory sharing)**: Wholesale Market Value,
  default network pricing with retailer overrides, exclusions, the
  retailer-controlled excess rule, participation expectations, reputation and
  reviews, and a lightweight transaction lifecycle. Decisions and the future
  model (participation, offers, network transactions, reviews) are recorded in
  `network.md`; nothing is in the schema yet. The platform stays outside
  payment and shipping.

## Not built yet (deliberately)

Supplier logins and supplier-side access, retailer→supplier data-sharing
grants, program audience lists, industry-intelligence aggregate tables,
outcome/metrics tables, supplier account numbers per location, lost-sales
capture, order transmission to suppliers/POS (the order page shows what it
will do; see "Supplier orders"), freight calculation, payments, invoicing
and receiving. Each can be added without
reshaping the tables above.

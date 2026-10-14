# North Star: what the platform could become

> **Long horizon, not roadmap.** Nothing here is committed, scheduled or
> built. These are capabilities Buying Intelligence could grow into as the
> network of retailers and suppliers matures. They are recorded so that what
> we build now leaves room for them, and so that the principles behind them
> are decided before the pressure to ship them arrives.
>
> What is being built now is in [`architecture.md`](architecture.md),
> [`catalog.md`](catalog.md) and [`connections.md`](connections.md). Where a
> North Star item touches something built or approved, this file says so;
> otherwise assume it does not exist.

## Principles shared by every item

These hold for every capability below and override anything below that
seems to say otherwise.

- **The supplier stays authoritative for what it owns.** Pricing,
  availability, account status, catalog visibility, eligibility and
  restrictions belong to the supplier. Buying Intelligence shows them, keeps
  observations of them and acts on them. It never recreates, overrides or
  second-guesses supplier entitlement logic. (Extends the sources-of-truth
  table in `architecture.md`.)
- **Sourcing never changes demand.** Whether a retailer *can* buy something
  from a given supplier affects *how* a need is filled (the sourcing plan).
  It never changes the independent assessment of *what* the retailer needs
  (the recommendation). This is the existing "what vs how" split
  (`architecture.md`, Catalog) applied to eligibility.
- **We facilitate; others decide.** Suppliers approve or restrict
  retailers; retailers choose what to share. The platform carries the
  process and records the outcome; it does not make either party's decision.
- **Links, not merges.** Identities and accounts are connected by
  correctable, sourced links, never by overwriting one record with another
  (the same rule as product matching).
- **Private by default, shared by consent.** A retailer's account
  details, eligibility, applications and business profile are visible only
  to that retailer and, where relevant, the one supplier involved. Nothing
  reaches another retailer or another supplier without explicit permission.
- **Neutral intelligence.** What we recommend, and the opportunities we
  surface, are never influenced by a supplier's commercial interest in the
  authorization or eligibility process (as Program fit is never influenced by
  sponsorship, `programs.md`).

## How they fit together

```
Canonical retailer identity (4)
   └─ links each retailer and location to its supplier/distributor accounts
        ├─ Retailer-specific supplier integrations (1)
        │     the retailer's own pricing, catalog, availability and restrictions,
        │     as each supplier's system reports them
        └─ Supplier-managed eligibility (2)
              eligible · authorization required · restricted, by brand or SKU
                 ▲
                 └─ Authorization channel (3)
                       discover → apply → supplier decides → eligible
                          ▲
                          └─ Reusable business profile (5)
                                what an application needs, shared by consent
                                   ▲
                                   └─ Standardized application protocol (6)
                                         what real dealer applications ask for

All of it shapes sourcing (where and whether to buy).
None of it shapes demand (what the retailer needs).
```

---

## 1. Retailer-specific supplier integrations

**Idea.** For a supplier or distributor such as HLC, Buying Intelligence
maintains one platform-level integration, and each retailer authorizes
access to their own account. Through that authorization the retailer sees
their actual experience with that supplier, where the supplier exposes it:

- dealer-specific pricing;
- dealer-specific catalog (what this account can see);
- product availability;
- brand and SKU eligibility;
- account-specific restrictions;
- other account information the supplier exposes.

**Rule.** Buying Intelligence does not recreate supplier entitlement logic.
If the supplier's system decides what an account can see or buy, we read
that decision; we never compute our own version of it. When the supplier
doesn't expose something, it is shown as unknown, never inferred.

**What exists today.**
- A connection belongs to one retailer, may be scoped to locations, and
  lists only the capabilities that provider gives for this account
  (`connections.md`). Features check capabilities, never provider names.
- Price and availability are relationship-specific observations
  (`supplier_offer_observation`), never product attributes; transactional
  values are revalidated live before submission (`architecture.md`).
- Catalog data from a retailer's own connection is restricted to that
  retailer by default (`catalog.md`, source rights).
- The HLC connection method (dealer API token) is documented; nothing
  connects yet.

**What it would add.** Account-scoped catalog visibility (a supplier offer
visible only through the accounts the supplier exposes it to), eligibility
and restriction observations alongside price and availability, and the
platform-level vs per-retailer credential split in the provider registry.

## 2. Supplier-managed retailer purchasing eligibility

**Idea.** Suppliers get one place to manage which retailers may buy which
brands or SKUs across connected distribution channels, instead of
maintaining it separately in every distributor.

**Scopes.** Brand and SKU at minimum; possibly category, product line,
region or location later. A more specific rule outranks a broader one
(SKU over brand); how conflicts between rules at the same scope resolve is
an open question.

**States (at minimum):**

| State | Retailer can discover it | Retailer can buy it | Shown as a purchasing source |
| --- | --- | --- | --- |
| Eligible | Yes | Yes | Yes |
| Authorization required | Yes | Not until authorized | Yes, marked "Authorization required", with a path to apply where appropriate (item 3) |
| Restricted / Do not sell | Supplier's choice | No | Generally no |

- **The supplier is authoritative.** Only the supplier (or its system)
  creates or changes a rule. Every rule records who set it, when, its scope
  and its effective dates.
- **Demand is untouched.** A restricted brand still shows up in the
  retailer's demand picture if the retailer's customers want it. What
  changes is the sourcing: that supplier is not offered as a source, and if
  no eligible source remains, the screen says so plainly rather than hiding
  the need.
- **Restrictions are private.** That a supplier restricts a retailer is
  known only to that supplier and that retailer. It never appears to other
  retailers, other suppliers, or in any aggregate.
- **Two sources may speak.** When a supplier's own system (item 1) and its
  centrally managed rules disagree, which wins is a decision for the
  supplier. Proposed default until it's made: the more restrictive answer
  applies and the disagreement is surfaced.

**What exists today.** Supplier organizations exist as an organization type,
but supplier logins and supplier-side access are deliberately not built
(`architecture.md`). Programs already have eligibility (`program_eligibility`),
which is about program qualification, not purchasing rights; the two stay
separate.

## 3. Buying Intelligence as an authorization channel

**Idea.** For brands that require authorized-reseller status, discovery can
lead straight to authorization:

1. The retailer discovers an opportunity (in the Catalog, a recommendation
   or Insights).
2. The product or brand is marked "Authorization required".
3. The retailer applies through, or from, Buying Intelligence, using their
   business profile (item 5) where the supplier accepts it.
4. The supplier reviews and decides, in its own process.
5. On approval, the supplier's rule changes to Eligible (item 2) and the
   supplier becomes a purchasing source.

**Rules.**
- Buying Intelligence carries the application and records its status
  (draft, submitted, under review, approved, declined, withdrawn). It never
  approves, declines or scores an application.
- The opportunity was surfaced on its own merits. Whether a brand requires
  authorization, or whether the supplier is a platform partner, never
  changes how an opportunity is ranked or presented.
- What is sent with an application is shown to the retailer before it is
  sent, and recorded (item 5).

## 4. Canonical retailer identity

**Problem.** The same retailer appears under a DBA in one supplier system,
a legal entity name in another, and a different account number everywhere.
Suppliers and distributors spend real effort resolving who is who.

**Idea.** Buying Intelligence assigns persistent canonical identifiers to
retailer organizations and to their locations, and keeps a crosswalk to
every account number that refers to them:

```
Canonical Retailer ID ↔ Supplier A account ↔ Distributor B account ↔ Supplier C dealer ID
Canonical Location ID ↔ Supplier A ship-to  ↔ Distributor B ship-to
```

**Rules.**
- **It does not replace account numbers.** Supplier and distributor
  identifiers stay theirs and stay authoritative in their systems; the
  crosswalk only links them.
- **Organization and location are distinct identities.** An account may
  belong to the organization or to one location (a ship-to); the crosswalk
  says which.
- **Persistent and never reused.** A canonical ID is opaque, stable across
  renames, DBA changes and ownership changes, and never reassigned. It is
  separate from internal database keys, so internal changes never move it.
- **Every link is sourced and correctable**: who asserted it (the retailer,
  the supplier, a verified connection), when, and whether it is verified.
  Two records found to be one retailer are linked, not merged.
- **Names are history, not identity.** Legal names, DBAs and their changes
  are recorded with dates; none of them is the identity.
- **Who sees the crosswalk.** A supplier sees links to its own accounts
  only. Revealing a retailer's account with one supplier to another
  supplier requires that retailer's consent.

**What exists today.** Organizations and locations already have stable
UUIDs and are distinct entities; `supplier_relationship` records claimed /
verified relationships. Supplier account numbers per location are listed as
not built (`architecture.md`). If broadly adopted, the canonical ID could
become a common identity reference across the industry; that adoption, not
the table, is the hard part.

## 5. Reusable retailer business profile

> Tell us about your business once. Maintain it in one place. Reuse it
> wherever appropriate.

**Idea.** A retailer maintains, once, the information commonly required to
open supplier and distributor accounts, and reuses it for each new account
or authorization application (item 3):

- business identity and legal entity information;
- locations;
- contacts;
- tax documentation;
- insurance documentation;
- financial and credit information;
- trade references;
- other credentials a supplier requires.

**Completed progressively, never up front.** Onboarding does not ask for
every conceivable field. The profile fills in as needs arise: applying to a
supplier asks only for what that application needs and the profile doesn't
already hold, and what's given is kept for next time. This follows the
existing onboarding rule that progress is defined by missing facts
(`architecture.md`, "Onboarding is defined by missing facts").

**The retailer controls it and chooses what each trading partner gets.**
Nothing in the profile is shared because it exists; every share is an
explicit choice for one partner.

**Rules for sensitive information.**
- **The retailer owns it.** Only owners and admins (or roles they grant)
  can see or change the sensitive parts; the rest of the team sees what
  they need.
- **Shared per recipient, by consent.** Each share names the recipient, the
  exact items, the purpose and the date. Sharing one item never implies
  another.
- **Revocable going forward.** A retailer can withdraw access; the screen
  says plainly that a copy already sent to a supplier can't be recalled.
- **Every access and share is logged**, append-only, visible to the
  retailer.
- **Documents expire.** Insurance certificates, tax forms and credit
  references carry expiry or review dates, and the retailer is reminded
  before they lapse.
- **Stronger storage than ordinary files**: encrypted, in a separate
  access tier, with retention tied to the retailer's account and to the
  purpose of each share.
- **Kept out of the intelligence layer.** Tax, financial and credit
  documents are never retrieved into the language model's context
  (`intelligence.md`, "retrieve, don't dump") unless the retailer
  explicitly asks for something that needs them.

**What exists today.** The Business profile holds the organization's
details, locations and team, and `document` stores uploaded files under the
organization's own storage path. None of the consent, sharing, expiry or
stronger-storage controls above exist.

## 6. Standardized retailer application protocol

**Idea.** Dealer applications across suppliers and distributors ask for
much of the same information in different forms. A future discovery
exercise collects as many real applications as practical and analyzes:

- common fields;
- common documents;
- supplier-specific requirements;
- outliers;
- information that is repeated across applications;
- vertical-specific requirements (bicycle first; others as the platform
  grows beyond it).

**What it would produce.** An inventory of fields and documents with how
often each appears and how each supplier words it, mapped to the business
profile (item 5). That tells us what the profile must hold, which items
nearly every supplier needs (worth asking for early), and which are rare
(asked only when a specific application needs them). If suppliers adopt it,
the mapping could become a standard application format that a retailer's
profile fills in for any participating supplier, with each supplier's own
additions on top.

**Handling the material.** Collected applications are research inputs:
blank forms where possible; any filled-in example with real retailer data
is kept outside the repository and never committed, like the supplier file
awaiting profiling.

**What exists today.** Nothing; the exercise has not started.

## What would have to be true first

- **Supplier participation.** Items 2 and 3 need suppliers on the platform:
  supplier-side access, which is deliberately not built.
- **Real applications to study.** Items 5 and 6 depend on the discovery
  exercise; the profile's structure should come from what suppliers
  actually ask, not from a guess.
- **Enough retailers.** Items 2, 3 and 4 are worth a supplier's effort only
  when a meaningful share of its dealers use Buying Intelligence.
- **Legal and commercial terms** for each supplier integration (what we may
  store, show and for how long), for acting as an application channel, and
  for holding sensitive retailer documents.

## Open questions

- Which supplier systems already expose account-specific eligibility and
  restrictions through their dealer APIs, and in what form?
- Should restricted brands be invisible to the retailer, or visible but
  unavailable? (Today's rule: the supplier is generally not shown as a
  source; the supplier may decide visibility.)
- Who may assert an account link in the crosswalk, and what counts as
  verification?
- Which profile items need a qualified custodian (for example, financial
  statements), and does that change where they are stored?

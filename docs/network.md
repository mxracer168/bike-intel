# Retailer network: excess inventory sharing

Retailers who opt in make their excess inventory discoverable to other
participating retailers. Before a retailer buys an item from a supplier, the
platform can show whether another retailer has that item available, at what
price, and how reliable that retailer has been. This is still a demonstration
(example data only), not a marketplace: the platform does not take payment,
ship, invoice or settle anything.

## Decision record

| Date | Decision |
|---|---|
| 2026-10-06 | **Wholesale Market Value** becomes a platform term (definition below). |
| 2026-10-06 | **Default network price = Wholesale Market Value.** Retailers don't price excess items one by one; they may override any item, above, at or below it. Supersedes the earlier "no pricing from the platform" principle. |
| 2026-10-06 | **Exception management.** Opted-in excess is available automatically; the retailer intervenes only to change a price or exclude an item. |
| 2026-10-06 | **The excess threshold is the retailer's.** The platform suggests; the retailer decides what counts as excess for them. |
| 2026-10-06 | **Trust layer:** participation expectations, seller reputation (rating, reviews, completed transactions) and a lightweight transaction lifecycle, without the platform handling payment or shipping. |
| 2026-10-06 | **No negotiation friction.** A buyer sees item, quantity, network price, Wholesale Market Value, seller and reputation before contacting anyone. |

## Excess inventory

**What counts as excess is the retailer's call.** The system identifies
*likely* excess using a rule the retailer controls, expressed in their terms:
"Flag inventory with more than N weeks of projected supply." The excess
quantity is what's on hand beyond that many weeks at the current pace; items
that aren't selling at all are excess in full.

- The rule is shown in plain words wherever excess is listed, with a way to
  change it. No rule builder.
- Projected supply uses the item's demand pace. When demand channels exist
  (`architecture.md`), the pace should exclude special orders and account for
  channel, so one customer's order doesn't make stock look like it's moving.
- The platform may suggest a starting rule, but no default is locked. A good
  rule may eventually vary by category, seasonality, stocking intent and
  other context (a shop deliberately stocking ahead for spring is not
  carrying excess).
- **Identified is not committed.** Flagging an item as excess never obliges
  the retailer to sell it.

## Wholesale Market Value

**Wholesale Market Value** is the platform's estimate of the current
wholesale replacement value of an item: approximately what a retailer could
reasonably expect to pay for the same item today through normal wholesale
channels, based on available supplier pricing and other appropriate market
intelligence.

It is **not**:

- MSRP or MAP;
- the retailer's historical or average cost;
- a consumer resale value;
- derived from what other retailers are asking on the network;
- a mandatory, market-wide resale price.

The calculation is open. Likely inputs: current wholesale prices across
suppliers, supplier availability, pack and unit-of-measure normalization,
market and country, current program pricing where it applies, and how fresh
each price is. Where it first appears on a screen, it carries a one-line
explanation; elsewhere the name is enough.

## Network price

When an opted-in retailer's excess item is available to the network:

> **Default network price = current Wholesale Market Value**

- **Separate values.** Wholesale Market Value (the platform's benchmark) and
  network price (what this retailer asks) are stored separately. With no
  override, the network price follows Wholesale Market Value as it changes.
- **Overrides are the retailer's.** A retailer may set any item's network
  price below, at or above Wholesale Market Value. An explicit override is
  never silently replaced when Wholesale Market Value later changes; the
  retailer can return the item to the default at any time.
- **Comparison, not judgment.** Screens show how a network price compares to
  Wholesale Market Value ("8% below"), with direction never conveyed by
  color alone. Below is not "good" and above is not "bad".
- **The seller's tradeoff is visible.** Next to the network price, the
  seller sees the expected gain or loss against their own average cost, per
  unit and as a percentage. Average cost is private to the seller and never
  shown to buyers.
- **Not a profit guarantee.** Sharing exists to help retailers turn excess
  back into cash and to strengthen the network, not to guarantee anyone a
  profit.

## Exclusions and exception management

The governing model:

> System identifies likely excess → retailer has opted into sharing →
> eligible excess is available at Wholesale Market Value → the retailer
> intervenes only for exceptions.

The exceptions are: **override the network price**, or **exclude the item**
from the network. Excluding an item keeps it flagged as excess for the
retailer but hides it from other retailers. Nothing requires activating
lines one by one, and the screens are built to manage hundreds of excess
items by exception (sort and filter by investment, weeks of supply, gain,
loss, price changes, exclusions).

## What the buyer sees

**The network principle: no negotiation friction.** Before contacting a
seller, a buyer can see the item, quantity available, network price,
Wholesale Market Value and how the price compares to it, the seller's
identity and the seller's reputation. A buyer should never have to contact
three retailers just to learn what each wants; the trade is economically
understandable before anyone talks.

In a proposed order, rows show facts only. Other retailers appear in an
opened line as one collapsed signal, and the "Other retailers" filter lists
the lines where they have stock. Prominence follows relevance
(`supplierShort`):

| Supplier | Shown in the opened line |
|---|---|
| Available or limited | An outlined disclosure after "Why N?": "3 retailers have some ⌄". |
| Out of stock or delayed | The same disclosure, stronger: "2 retailers can cover all 3 ⌄". The supplier's status is under "Why N?" (supplier availability, and the recommended next step). |

- **The signal:** "1 retailer can cover all 3" (full match) or "3 retailers
  have some" (partial). No match shows nothing.
- **The list** (only after clicking the signal): retailers who can cover the
  whole quantity first, then "Other retailers with some"; within each, the
  lowest network price first. Each offer shows retailer and place,
  reputation, units available, network price and how it compares to
  Wholesale Market Value. Wholesale Market Value is the same for every offer
  on one item, so it's stated once above the list. The system does not
  propose splitting an order across retailers.
- **Contacting a seller** introduces the two retailers (mocked today).
  Payment and shipping are arranged between them.

Matching compares what we'd order now (following any quantity change) with
what others made available (`features/orders/network.ts`).

## Trust: participation, reputation, reviews

**Participation expectations.** Taking part in the network will carry basic
expectations, agreed when a retailer opts in, such as: respond to requests
promptly, confirm availability, ship accepted inventory within a service
window, provide tracking where appropriate, communicate cancellations or
problems promptly, and represent quantity and condition accurately. Exact
service levels are not decided; any wording on screens today is example
content.

**Reputation.** Each participating retailer builds a visible reputation:
star rating, number of reviews and completed network transactions (for
example "4.8 ★ · 23 reviews · 79 completed transactions"). A retailer with
little history is shown as such, plainly, without penalty language. Later,
objective reliability measures (share shipped on time, typical days to ship)
may matter more than ratings.

**Reviews** are offered after a completed transaction, never required.

**No gamification.** No public leaderboards, ranks, tiers, badges or
achievement systems. The goal is trust, not competition.

**Identity.** Reputation needs a stable seller identity, so sellers are
named alongside their reputation before contact. What a *buyer* reveals, and
when, is still open. Screens get seller names through one function
(`retailerLabel`) so the policy can change without restructuring.

## Transaction lifecycle (future)

The platform stays outside payment and shipping, but accountability needs
enough structured state to measure participation and reliability:

> Requested → Accepted → Shipped → Received → Completed

with **Declined**, **Cancelled** and **Disputed** as other outcomes. Each
transition records who made it and when. This is not a payment or
fulfillment system; it is the minimum needed to count completed
transactions, offer reviews at the right moment and, later, measure
timeliness.

## Principles

- **Opt-in, and only what's offered.** A retailer's inventory is private.
  Only excess they've opted to share, and haven't excluded, is visible to
  others, and only the offer: item, quantity, network price and Wholesale
  Market Value. Never their stock levels, sales or costs.
- **The platform does the work by default; the retailer stays in control.**
  Defaults are computed; every exception is the retailer's explicit choice
  and is never silently undone.
- **Recommendations, not rules.** Pricing guidance is a default and a
  benchmark, never a platform-enforced price.

## Today

Example data only: the Excess inventory view under Inventory (rule, summary,
table, price overrides and exclusions, all held on the page and not saved)
and other retailers' offers in proposed orders. Wholesale Market Value,
network prices and reputations are example values.

## Not built (deliberately)

Wholesale Market Value calculation, saving rules, overrides or exclusions,
opt-in and participation agreements, messaging, payment, checkout, shipping
labels, freight, tax, invoicing, settlement, fees, reputation scoring,
reviews, service-level enforcement, disputes and the transaction lifecycle.

## When this becomes real

Sharing crosses the tenant boundary, so it needs its own explicit model
rather than widening access to private inventory:

- a **network participation** record per retailer (opted in, the excess
  rule, agreed expectations), auditable and withdrawable like other
  agreements;
- **Wholesale Market Value** per product and market, with its inputs and when
  it was computed;
- an **offer** per shared item, owned by the seller: units available, an
  optional explicit network price (absent means "follow Wholesale Market
  Value"), excluded or not, from/until. Other participants read offers only
  through a deliberately narrow view that never exposes the underlying
  stock, sales or costs;
- **network transactions** with the lifecycle above (who, when, each
  transition), and **reviews** tied to completed transactions;
- **connection requests** between two retailers, with the identity policy
  applied at that step.

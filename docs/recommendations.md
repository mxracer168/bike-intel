# Explaining a recommendation ("Why N?")

A retailer should understand a recommended quantity without having to read a
chart. Every explanation follows the same order:

1. **Answer**: the quantity ("Why 3?").
2. **Reason**: one plain paragraph, from the recommendation's own numbers:
   how fast it sells, what's on hand, what's already on order, and what we
   expect them to need before they can restock. A reason that changed the
   quantity is said inside that paragraph ("Because this item is new to your
   store, we started small…"); a reason that didn't isn't shown.
3. **How we got there**, shown rather than told (Figma reference): one
   formula everywhere (orders and the Catalog), **Target − Current = Need
   → Order**. On an opened order line it comes first, under one quiet row
   (confidence, commitment, Add context); there is no paragraph above it.
   - The target is expected sales + safety stock, and the Target step shows
     that sum.
   - Each step opens its evidence as figures, tables and bars:
     - Target: the sum; demand rate, coverage, lead time and trend; recent
       weekly demand as bars.
     - Current: on hand by location, and open purchase orders, or "No open
       purchase orders".
     - Need: how long on hand lasts, the target coverage, and a bar of on
       hand / on order / uncovered.
     - Order: Need → case pack or minimum → Recommended order, and the
       supplier's stock in a few words.
   - The arithmetic is derived in one place and always reconciles with the
     quantity shown. Changing the quantity changes the commitment and
     totals, never the formula ("Back to N" in the top row).
   - The plain-language reason (`explanation()`) stays available, but the
     opened line doesn't lead with it.

**Ordering rules.** When the supplier sells in cases (order a multiple of the
case) or has a minimum order quantity, the recommended order can differ from
the need:
- The line keeps both: `need`, and `orderRule` (`{ kind: 'case', size }` or
  `{ kind: 'minimum', quantity }`), with `quantity = applyRule(need, rule)`
  (`features/orders/why.ts`).
- The paragraph says why ("Northline sells these in cases of 6, so we
  rounded up to 6").
- The Order step shows Need → Case pack / Minimum → Order, and the formula
  opens on that step.
- A case line's quantity stepper moves a case at a time.

The example Northline order opens on such a line for demos: the chain tool's
need of 2 becomes 3 under Northline's minimum. The B01S brake pads show a
case pack: a need of 5 becomes 6.

Beside it, a compact summary of what was weighed (sales pace, supplier
availability, delivery, seasonal trend, confidence), each said once.
Nothing is repeated between the summary and the rest of the screen.

**Supplier availability** is one value ("24 available", "25+ available",
"2 left", "Back in ~18 days"), opening in place to the supplier's own
detail: stock by warehouse when the supplier reports it, otherwise the best
the supplier gives (a total, a threshold, or in stock without a quantity),
and for an out-of-stock item, when it's expected back and how long until it
could be on the shelf. Never more specific than the source, and never a
vague word ("Plenty"): the exact count when the supplier reports one, its
floor ("25+") when it only reports a threshold. Every availability line
(order lines and Catalog offers) is worded from the same stock figures by
`stockWords()`, so the text and the number can't disagree.

**Adding context about this item.** The explanation offers a way into the
intelligence conversation already about this item, so what the retailer
says next is understood as being about it (see `intelligence.md`, "Messages
about one item").

## Quantity and action are different things

The **recommended quantity** answers "how many do I need?". The
**recommended action** answers "what should I do about it, and when?". They
are related but not always the same:

| Situation | Quantity | Action |
|---|---|---|
| Supplier has it | 3 units | Order 3 with this order. |
| Supplier has only a few | 3 units | Order now, while they have them. |
| Supplier is out, back in 18 days | 3 units | Order 3 when the supplier has them again, or use another supplier (or another retailer) if you need them sooner. |

The screen must never make "order 3" read as "send an order to a supplier
who can't ship it". When the supplier can't ship, the explanation says so,
shows how long until it could be on the shelf (supplier wait + delivery),
and the next step names the choice.

Later these may become distinct recommendation states (for example, "wait
for supplier", "source elsewhere"). Today the action is worded from the
supplier's status; the data model is unchanged.

## Recent weekly sales

- Only complete weeks: the current, unfinished week is left out until a
  partial-week treatment is designed deliberately.
- Every week is shown, and a week with no sales says 0 rather than leaving a
  gap.
- Whole units on the axis, and the average marked and labelled.

## Not built yet

Forecasting, seasonal models, supplier-depletion modelling, confidence
scoring and alternate-supplier selection. Seasonality ("about 20% faster
than normal"), the supplier's expected date and confidence on the proposed
order screens are example data. The "View details" links show what exists
today.

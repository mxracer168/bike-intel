# Explaining a recommendation ("Why N?")

A retailer should understand a recommended quantity without having to read a
chart. Every explanation follows the same order:

1. **Answer**: the quantity ("Why 3?").
2. **Reason**: one plain paragraph, from the recommendation's own numbers:
   how fast it sells, what's on hand, what's already on order, and what we
   expect them to need before they can restock. A reason that changed the
   quantity is said inside that paragraph ("Because this item is new to your
   store, we started small…"); a reason that didn't isn't shown. Then the
   arithmetic in one line: expected demand − on hand − already ordered =
   recommended. The arithmetic always reconciles with the quantity shown.
3. **Evidence**: recent weekly sales, which confirm the reason and never
   replace it.

Beside it, a compact summary of what was weighed (sales pace, supplier
availability, delivery, seasonal trend, confidence), each said once.
Nothing is repeated between the summary and the rest of the screen.

**Supplier availability** is one value ("24 available", "25+ available",
"2 left", "Back in ~18 days"), opening in place to the supplier's own
detail: stock by warehouse when the supplier reports it, otherwise the best
the supplier gives (a total, a threshold, or in stock without a quantity),
and for an out-of-stock item, when it's expected back and how long until it
could be on the shelf. Never more specific than the source.

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

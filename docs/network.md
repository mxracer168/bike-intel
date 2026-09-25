# Retailer network: inventory sharing

Before a retailer buys an item from a supplier, the platform can show whether
other participating retailers have made that same item available. This is a
demonstration of the network today (example data only), not a marketplace.

## What the buyer sees

- **On the order:** a quiet line, "3 lines may be available from other
  retailers", which filters the order to those lines.
- **On a line:** a small secondary note under the product, only when there is
  something to say: "3 retailers can cover all 6" (full match) or
  "3 retailers have some available" (partial). No match shows nothing.
- **In the line detail:** "Available from other retailers". Retailers who can
  cover the whole quantity on their own come first, then those with some,
  each ordered by units available. A partial match lists everyone with at
  least one. The system does not propose splitting an order across
  retailers.
- **"Request connection"** introduces the two retailers (mocked today). Price
  and shipping are agreed between them.

Matching compares what we'd order now (following any quantity change) with
what others made available (`features/orders/network.ts`).

## Principles

- **No pricing from the platform.** No prices, savings, margins, suggested
  dealer-to-dealer prices or shipping assumptions. Retailers negotiate.
- **Not a profit guarantee.** Sharing exists to help retailers reduce excess
  inventory and to strengthen the retailer network, not to guarantee the
  seller a profit. Future guidance on pricing and shipping will be
  recommendations, never platform-enforced rules.
- **Opt-in, and only what's offered.** A retailer's inventory is private. Only
  units a retailer has explicitly chosen to make available are visible to
  others, and only for as long as they choose.
- **Identity policy is open.** Whether other retailers are named immediately,
  partly anonymized until connection, or revealed only after both sides
  agree is not decided. Screens get names through one function
  (`retailerLabel`) so the policy can change without restructuring.

## Not built (deliberately)

Seller workflow (identifying excess, opting in, choosing quantities, listing
management), messaging, negotiation, pricing, payment, checkout, shipping,
invoicing, fees, and orders between retailers.

## When this becomes real

Sharing crosses the tenant boundary, so it needs its own explicit model
rather than widening access to private inventory:

- an **offer** record owned by the sharing retailer (item, units available,
  from/until, status), readable by other participants only through a
  deliberately narrow view that exposes the offer, never the underlying
  stock, sales or costs;
- **connection requests** between two retailers, with the identity policy
  above applied at that step;
- consent recorded like other agreements (auditable, withdrawable).

# Inventory

## Principle: money and velocity first, units where they mean something

**Aggregate inventory views favor financial and velocity metrics.** The
headline health of a retailer's inventory is its value, how long it will
last, and how fast it turns, not how many units are on the shelf.

Raw unit counts are useful at the **item**, **brand**, **category** and
**location** level, but not as a headline metric. A shop may hold 600
spokes worth less than one e-bike; a total unit count mixes them as if they
were the same thing. "Units on hand" is never one of the top health cards.

## The page

1. **Inventory health**: three cards in Today's card language:
   inventory value, weeks of supply, inventory turn.
2. **Inventory composition**: "Inventory by brand" and "Inventory by
   category" as ranked horizontal bars (not pies: easier to compare, rank
   and scale). Each defaults to **Dollars** ("where is our inventory value
   concentrated?") with a compact **Dollars | Units** toggle, because at
   this level units are useful and can tell a very different story (spokes
   and tubes dominate units; bikes and suspension dominate dollars).
   - The top six groups, the rest folded into **Other**; "View all" shows
     the full ranking at full width.
   - Hover or focus a bar for its value, units, share and weeks of supply.
   - **Charts are navigation**: choosing a bar filters the item table to the
     items behind it (and takes you there); choosing it again, or removing
     the filter chip, clears it. Totals are summed from the same items, so
     the bar and the filtered table always agree.
3. **Inventory detail**: search ("Search inventory…", which will also match
   part numbers, UPCs and manufacturer numbers without showing them as
   columns), one **Filters** control (brand, category, supplier, condition),
   **Coverage: Days / Weeks / Months**, and the item table:
   Product · On hand · Value · Coverage, sortable by each.
   - An item opens in the Orders page's washed, accent-edged surface: weekly
     sales, then the facts not already in the row (average cost, on order,
     supplier, recent activity) and, for retailers with several locations,
     stock by location.
   - Conditions (low, healthy, excess, not selling) are filters, never
     badges on every row.

**Locations.** With more than one stocking location, a location control
("All locations" by default) changes the cards, charts and table; all
locations are consolidated and an opened item shows its split. With one
location there's no control and no split.

## Today

Example data only (`src/demo/inventory.ts`), spread across the retailer's
own stocking locations. Value and weeks of supply are summed from the
example items; the turn and trends are example values. Nothing is
forecast or computed from real sales.

## Not built

POS integration, real turn and weeks-of-supply calculations, forecasting,
replenishment, accounting, transfers between locations, supplier sourcing,
and sharing overstock with other retailers.

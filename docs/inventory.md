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

1. **How inventory stands**, in one sentence on a soft status surface
   (green when healthy, amber when worth a look): how many items hold how
   much in excess, by the same rule as the Excess inventory tab, and how
   many are running low, with a link to Excess inventory. Healthy while the
   excess stays under 15% of inventory value (`EXCESS_SHARE_ALERT`).
2. **Inventory health**: three figures on one panel (the shared
   `HealthSnapshot` panel): inventory value, weeks of supply, inventory turn.
3. **Inventory composition**: one ranked list of horizontal bars (not pies:
   easier to compare, rank and scale), switched between **Brand | Category**
   and **Dollars | Units**. Dollars by default ("where is our inventory
   value concentrated?"); units are useful at this level and can tell a very
   different story (spokes and tubes dominate units; bikes and suspension
   dominate dollars).
   - The top six groups, the rest folded into **Other**; "View all" shows
     the full ranking.
   - Hover or focus a bar for its value, units, share and weeks of supply.
   - **Charts are navigation**: choosing a bar filters the item table to the
     items behind it (and takes you there); the other bars step back while
     one is chosen; choosing it again, removing the filter chip or "Clear
     filter" clears it. Totals are summed from the same items, so the bar and
     the filtered table always agree.
4. **Items**: the heading says what the table shows ("All inventory",
   "Shimano inventory") with the count and value on hand; search ("Search
   this inventory", which also matches part numbers, UPCs and manufacturer
   numbers without showing them as columns), one **Filters** control (brand,
   category, supplier, condition), **Coverage: Days / Weeks / Months**, and
   the item table: Product (with brand · category under it) · Demand ·
   On hand · On order · Value · Coverage, every column sortable.
   - **Demand** describes recent sales, not a forecast: the last four weeks
     against the weeks before (Rising, Steady, Slowing), "Few sales" when
     there are too few to tell, "No recent sales" when there are none.
   - An item opens beneath its row: weekly sales, then the facts not already
     in the row (average cost, on order, supplier, recent activity) and, for
     retailers with several locations, stock by location.
   - Conditions (low, healthy, excess, not selling) are filters, never
     badges on every row.

4. **Excess inventory** (a tab beside the main view, not another sidebar
   destination): what the system thinks is excess under the retailer's own
   rule ("more than N weeks of projected supply"), why, and what another
   retailer would pay for it. Opted-in excess is offered to the retailer
   network at Wholesale Market Value by default; the retailer manages only
   exceptions (a different network price, or excluding an item). Behavior and
   decisions: `network.md`.

   The inventory table's **Excess** condition uses the same rule.

**Locations.** With more than one stocking location, a location control
("All locations" by default) changes the status, figures, chart and table; all
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
and anything that makes network sharing real (see `network.md`).

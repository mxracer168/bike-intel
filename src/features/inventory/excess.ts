import { compareToMarket, type PriceComparison } from '@/features/network/pricing'
import type { InventoryItemView } from './types'

/**
 * Excess inventory and network pricing (docs/network.md). Pure functions over
 * presentation shapes: no example data lives here, and nothing here computes
 * Wholesale Market Value; it is an input.
 */

/** The weeks-of-supply rule the example starts with. Not a platform default. */
export const EXAMPLE_EXCESS_WEEKS = 26

/** Rule choices offered in the example. */
export const EXCESS_RULE_OPTIONS = [13, 26, 39, 52] as const

/**
 * The network side of one excess item, owned by the selling retailer.
 * Wholesale Market Value and the network price are separate values: with no
 * override, the network price follows Wholesale Market Value.
 */
export type NetworkOffer = {
  itemId: string
  /** The platform's benchmark per unit. */
  wholesaleMarketValue: number
  /** The retailer's explicit price per unit; absent means "use Wholesale Market Value". */
  priceOverride?: number
  /** Hidden from other retailers, though still excess for this retailer. */
  excluded: boolean
}

export type ExcessRow = {
  item: InventoryItemView
  /** Weeks the stock on hand lasts at the current pace; null when it isn't selling. */
  weeksOfSupply: number | null
  /** Units beyond the rule. */
  excessQty: number
  wholesaleMarketValue: number
  networkPrice: number
  overridden: boolean
  excluded: boolean
  comparison: PriceComparison
  /** Network price − average cost, per unit. */
  gainPerUnit: number
  /** As a share of average cost. */
  gainPercent: number
  /** Average cost × excess units: money tied up. */
  excessCost: number
  /** Network price × excess units: what selling it all would bring in. */
  recovery: number
}

export function weeksOfSupply(item: InventoryItemView): number | null {
  return item.perWeek > 0 ? item.onHand / item.perWeek : null
}

/**
 * Units beyond `ruleWeeks` of supply at the current pace. Items that aren't
 * selling are excess in full. Zero when within the rule.
 */
export function excessQuantity(item: InventoryItemView, ruleWeeks: number): number {
  if (item.onHand <= 0) return 0
  if (item.perWeek <= 0) return item.onHand
  const keep = Math.ceil(ruleWeeks * item.perWeek)
  return Math.max(0, item.onHand - keep)
}

export function excessRows(items: InventoryItemView[], ruleWeeks: number, offers: Record<string, NetworkOffer>): ExcessRow[] {
  return items.flatMap((item) => {
    const excessQty = excessQuantity(item, ruleWeeks)
    const offer = offers[item.id]
    if (excessQty <= 0 || !offer) return []
    const networkPrice = offer.priceOverride ?? offer.wholesaleMarketValue
    const gainPerUnit = networkPrice - item.unitCost
    return [{
      item,
      weeksOfSupply: weeksOfSupply(item),
      excessQty,
      wholesaleMarketValue: offer.wholesaleMarketValue,
      networkPrice,
      overridden: offer.priceOverride !== undefined,
      excluded: offer.excluded,
      comparison: compareToMarket(networkPrice, offer.wholesaleMarketValue),
      gainPerUnit,
      gainPercent: item.unitCost > 0 ? (gainPerUnit / item.unitCost) * 100 : 0,
      excessCost: excessQty * item.unitCost,
      recovery: excessQty * networkPrice,
    }]
  })
}

export type ExcessSummary = { skus: number; units: number; cost: number; recovery: number; shared: number }

/** Recovery counts only what's offered to the network (not excluded). */
export function summarizeExcess(rows: ExcessRow[]): ExcessSummary {
  return rows.reduce((s, r) => ({
    skus: s.skus + 1,
    units: s.units + r.excessQty,
    cost: s.cost + r.excessCost,
    recovery: s.recovery + (r.excluded ? 0 : r.recovery),
    shared: s.shared + (r.excluded ? 0 : 1),
  }), { skus: 0, units: 0, cost: 0, recovery: 0, shared: 0 })
}

export type ExcessSort = 'investment' | 'weeks' | 'gain' | 'loss'
export const excessSortLabel: Record<ExcessSort, string> = {
  investment: 'Most money tied up',
  weeks: 'Most weeks of supply',
  gain: 'Largest gain',
  loss: 'Largest loss',
}

export type ExcessView = 'all' | 'shared' | 'excluded' | 'changed' | 'below' | 'above' | 'loss'
export const excessViewLabel: Record<ExcessView, string> = {
  all: 'All excess',
  shared: 'Available to the network',
  excluded: 'Excluded',
  changed: 'Price changed by you',
  below: 'Below Wholesale Market Value',
  above: 'Above Wholesale Market Value',
  loss: 'Selling below your cost',
}

export function matchesView(r: ExcessRow, view: ExcessView): boolean {
  switch (view) {
    case 'all': return true
    case 'shared': return !r.excluded
    case 'excluded': return r.excluded
    case 'changed': return r.overridden
    case 'below': return r.comparison.direction === 'below'
    case 'above': return r.comparison.direction === 'above'
    case 'loss': return r.gainPerUnit < 0
  }
}

const weeksKey = (r: ExcessRow) => r.weeksOfSupply ?? Number.POSITIVE_INFINITY

/** Gain and loss sort by the whole excess quantity, not per unit: what matters is the money. */
export function sortExcess(rows: ExcessRow[], sort: ExcessSort): ExcessRow[] {
  const total = (r: ExcessRow) => r.gainPerUnit * r.excessQty
  const by: Record<ExcessSort, (a: ExcessRow, b: ExcessRow) => number> = {
    investment: (a, b) => b.excessCost - a.excessCost,
    weeks: (a, b) => weeksKey(b) - weeksKey(a) || b.excessCost - a.excessCost,
    gain: (a, b) => total(b) - total(a),
    loss: (a, b) => total(a) - total(b),
  }
  return [...rows].sort(by[sort])
}

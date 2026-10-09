import { sortRows, type SortState } from '@/ui/sorting'
import { EXAMPLE_EXCESS_WEEKS } from './excess'
import type { Condition, CoverageUnit, InventoryItemView, Measure } from './types'

/** On hand at one location, or everywhere when `locationId` is null. */
export function onHandAt(item: InventoryItemView, locationId: string | null): number {
  if (!locationId) return item.onHand
  return item.byLocation.find((l) => l.locationId === locationId)?.onHand ?? 0
}

/** Expected weekly sales at one location: the item's pace in proportion to the stock there. */
export function perWeekAt(item: InventoryItemView, locationId: string | null): number {
  if (!locationId || item.onHand === 0) return item.perWeek
  return item.perWeek * (onHandAt(item, locationId) / item.onHand)
}

export const valueAt = (item: InventoryItemView, locationId: string | null) => onHandAt(item, locationId) * item.unitCost

/** Weeks the stock will last at the expected pace; null when it isn't selling. */
export function coverWeeks(onHand: number, perWeek: number): number | null {
  if (perWeek <= 0) return null
  return onHand / perWeek
}

const WEEKS_PER_MONTH = 52 / 12

/** "6.2 weeks", "43 days", "1.4 months"; "Not selling" when there's no pace to divide by. */
export function formatCoverage(weeks: number | null, unit: CoverageUnit): string {
  if (weeks === null) return 'Not selling'
  if (unit === 'days') {
    const d = Math.round(weeks * 7)
    return `${d} ${d === 1 ? 'day' : 'days'}`
  }
  const v = unit === 'weeks' ? weeks : weeks / WEEKS_PER_MONTH
  const shown = v >= 100 ? Math.round(v).toString() : v.toFixed(1)
  return `${shown} ${unit === 'weeks' ? (shown === '1.0' ? 'week' : 'weeks') : (shown === '1.0' ? 'month' : 'months')}`
}

/**
 * A rough condition for filtering, not a verdict shown on every row:
 * not selling, low (under three weeks), excess (beyond the excess rule, the
 * same one the Excess inventory tab uses), else healthy.
 */
export function condition(item: InventoryItemView, locationId: string | null): Condition {
  const weeks = coverWeeks(onHandAt(item, locationId), perWeekAt(item, locationId))
  if (weeks === null) return 'not_selling'
  if (weeks < 3) return 'low'
  if (weeks > EXAMPLE_EXCESS_WEEKS) return 'excess'
  return 'healthy'
}

export const conditionLabel: Record<Condition, string> = {
  low: 'Low', healthy: 'Healthy', excess: 'Excess', not_selling: 'Not selling',
}

export type Group = {
  name: string
  dollars: number
  units: number
  /** Share of the total for the measure the chart is showing. */
  share: number
  /** Value divided by the value of a week's expected sales; null if nothing sells. */
  weeksOfSupply: number | null
  /** The group names inside it (just itself, or everything folded into "Other"). */
  members: string[]
}

/** Totals by brand or category, largest first for the chosen measure. */
export function groupBy(items: InventoryItemView[], key: 'brand' | 'category', measure: Measure, locationId: string | null): Group[] {
  const acc = new Map<string, { dollars: number; units: number; weekly: number }>()
  for (const item of items) {
    const units = onHandAt(item, locationId)
    if (units === 0) continue
    const g = acc.get(item[key]) ?? { dollars: 0, units: 0, weekly: 0 }
    g.dollars += units * item.unitCost
    g.units += units
    g.weekly += perWeekAt(item, locationId) * item.unitCost
    acc.set(item[key], g)
  }
  const total = [...acc.values()].reduce((s, g) => s + g[measure], 0) || 1
  return [...acc.entries()]
    .map(([name, g]) => ({
      name, dollars: g.dollars, units: g.units, share: g[measure] / total,
      weeksOfSupply: g.weekly > 0 ? g.dollars / g.weekly : null, members: [name],
    }))
    .sort((a, b) => b[measure] - a[measure] || a.name.localeCompare(b.name))
}

/** The top `n` groups, with the rest folded into one "Other". */
export function topWithOther(groups: Group[], n: number): Group[] {
  if (groups.length <= n + 1) return groups
  const top = groups.slice(0, n)
  const rest = groups.slice(n)
  const dollars = rest.reduce((s, g) => s + g.dollars, 0)
  const weekly = rest.reduce((s, g) => s + (g.weeksOfSupply ? g.dollars / g.weeksOfSupply : 0), 0)
  const other: Group = {
    name: 'Other',
    dollars,
    units: rest.reduce((s, g) => s + g.units, 0),
    share: rest.reduce((s, g) => s + g.share, 0),
    weeksOfSupply: weekly > 0 ? dollars / weekly : null,
    members: rest.flatMap((g) => g.members),
  }
  return [...top, other]
}

/**
 * How recent sales compare with the weeks before them: the last four weeks
 * against the earlier ones. A description of what has happened, not a
 * forecast. Too few sales to tell is said as such.
 */
export type DemandTrend = 'rising' | 'steady' | 'slowing' | 'few' | 'none'

export const demandLabel: Record<DemandTrend, string> = {
  rising: 'Rising', steady: 'Steady', slowing: 'Slowing', few: 'Few sales', none: 'No recent sales',
}

/** Rising and slowing need at least this many units sold, so one sale doesn't make a trend. */
const TREND_MIN_UNITS = 4
const RECENT_WEEKS = 4

export function demandTrend(item: Pick<InventoryItemView, 'weeklySales'>): DemandTrend {
  const w = item.weeklySales
  const total = w.reduce((a, b) => a + b, 0)
  if (total === 0) return 'none'
  if (total < TREND_MIN_UNITS || w.length <= RECENT_WEEKS) return 'few'
  const recent = w.slice(-RECENT_WEEKS)
  const earlier = w.slice(0, -RECENT_WEEKS)
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const before = avg(earlier)
  const now = avg(recent)
  if (before === 0) return 'rising'
  const ratio = now / before
  if (ratio >= 1.25) return 'rising'
  if (ratio <= 0.75) return 'slowing'
  return 'steady'
}

/** Sort order for demand: the ones to watch (no sales, slowing) first when ascending. */
const demandRank: Record<DemandTrend, number> = { none: 0, slowing: 1, few: 2, steady: 3, rising: 4 }

/** Value beyond this share of inventory in excess or not selling turns the status from healthy to worth a look. */
export const EXCESS_SHARE_ALERT = 0.15

export type InventoryStatus = { tone: 'good' | 'caution'; title: string; detail: string; excessItems: number }

/**
 * One sentence on the state of inventory, by the same rule the Excess
 * inventory tab uses: what the units beyond the rule cost, and how much is
 * running low. Healthy while that excess stays under EXCESS_SHARE_ALERT of
 * inventory value.
 */
export function inventoryStatus(items: InventoryItemView[], locationId: string | null): InventoryStatus {
  const stocked = items.filter((i) => onHandAt(i, locationId) > 0)
  const total = stocked.reduce((s, i) => s + valueAt(i, locationId), 0)
  const beyond = (i: InventoryItemView) => {
    const units = onHandAt(i, locationId)
    const perWeek = perWeekAt(i, locationId)
    return perWeek <= 0 ? units : Math.max(0, units - Math.ceil(EXAMPLE_EXCESS_WEEKS * perWeek))
  }
  const excess = stocked.filter((i) => beyond(i) > 0)
  const excessCost = excess.reduce((s, i) => s + beyond(i) * i.unitCost, 0)
  const low = stocked.filter((i) => condition(i, locationId) === 'low').length
  const good = total > 0 && excessCost / total < EXCESS_SHARE_ALERT
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(excessCost)
  const count = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`
  const first = excess.length === 0
    ? 'Nothing is beyond what you’re likely to sell'
    : `${count(excess.length)} ${excess.length === 1 ? 'holds' : 'hold'} ${money} in excess`
  const rest = low > 0 ? `${count(low)} ${low === 1 ? 'is' : 'are'} running low` : 'everything else is within its expected range'
  return {
    tone: good ? 'good' : 'caution',
    title: good ? 'Inventory is generally healthy' : 'More inventory than usual is in excess',
    detail: `${first}; ${rest}.`,
    excessItems: excess.length,
  }
}

export type SortKey = 'product' | 'demand' | 'onHand' | 'onOrder' | 'value' | 'coverage'
export type Sort = SortState<SortKey>

/** Sort rows; items that aren't selling have the longest coverage. */
export function sortItems(items: InventoryItemView[], sort: Sort, locationId: string | null): InventoryItemView[] {
  const k = (i: InventoryItemView): number | string => {
    switch (sort.key) {
      case 'product': return `${i.product} ${i.variant ?? ''}`.toLowerCase()
      case 'demand': return demandRank[demandTrend(i)]
      case 'onHand': return onHandAt(i, locationId)
      case 'onOrder': return i.onOrder
      case 'value': return valueAt(i, locationId)
      case 'coverage': return coverWeeks(onHandAt(i, locationId), perWeekAt(i, locationId)) ?? Number.POSITIVE_INFINITY
    }
  }
  return sortRows(items, k, sort.dir, (a, b) => a.product.localeCompare(b.product))
}

/** Matches the product description, brand, and the hidden part numbers and UPCs. */
export function matchesSearch(item: InventoryItemView, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [item.product, item.variant ?? '', item.brand, ...item.identifiers].join(' ').toLowerCase()
  return q.split(/\s+/).every((word) => hay.includes(word))
}

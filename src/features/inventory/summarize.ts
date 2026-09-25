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
 * not selling, low (under three weeks), excess (over sixteen), else healthy.
 */
export function condition(item: InventoryItemView, locationId: string | null): Condition {
  const weeks = coverWeeks(onHandAt(item, locationId), perWeekAt(item, locationId))
  if (weeks === null) return 'not_selling'
  if (weeks < 3) return 'low'
  if (weeks > 16) return 'excess'
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

export type SortKey = 'product' | 'onHand' | 'value' | 'coverage'
export type Sort = { key: SortKey; dir: 'asc' | 'desc' }

/** Sort rows; items that aren't selling have the longest coverage. */
export function sortItems(items: InventoryItemView[], sort: Sort, locationId: string | null): InventoryItemView[] {
  const k = (i: InventoryItemView): number | string => {
    switch (sort.key) {
      case 'product': return `${i.product} ${i.variant ?? ''}`.toLowerCase()
      case 'onHand': return onHandAt(i, locationId)
      case 'value': return valueAt(i, locationId)
      case 'coverage': return coverWeeks(onHandAt(i, locationId), perWeekAt(i, locationId)) ?? Number.POSITIVE_INFINITY
    }
  }
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const x = k(a), y = k(b)
    const c = typeof x === 'string' ? x.localeCompare(y as string) : x === y ? 0 : x < (y as number) ? -1 : 1
    return c * dir || a.product.localeCompare(b.product)
  })
}

/** Matches the product description, brand, and the hidden part numbers and UPCs. */
export function matchesSearch(item: InventoryItemView, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [item.product, item.variant ?? '', item.brand, ...item.identifiers].join(' ').toLowerCase()
  return q.split(/\s+/).every((word) => hay.includes(word))
}

import { describe, expect, it } from 'vitest'
import { condition, coverWeeks, formatCoverage, groupBy, matchesSearch, sortItems, topWithOther } from '@/features/inventory/summarize'
import type { InventoryItemView } from '@/features/inventory/types'

function item(id: string, brand: string, cost: number, onHand: number, perWeek: number, byLocation?: [string, number][]): InventoryItemView {
  return {
    id, product: `${brand} part ${id}`, brand, category: 'Parts', supplier: 'S', unitCost: cost, onHand, onOrder: 0, perWeek,
    weeklySales: [], lastSale: null, lastReceipt: null, lastPurchaseQty: null,
    byLocation: (byLocation ?? [['a', onHand]]).map(([locationId, n]) => ({ locationId, name: locationId, onHand: n })),
    identifiers: [`PN-${id}`, `0123${id}`],
  }
}

const items = [
  item('1', 'Trek', 1000, 3, 0.3), // $3,000, 3 units
  item('2', 'DT Swiss', 1, 600, 20), // $600, 600 units
  item('3', 'Shimano', 50, 20, 2), // $1,000
  item('4', 'Fox', 250, 2, 0), // $500, not selling
]

describe('inventory composition', () => {
  it('ranks by dollars or by units, which can differ a lot', () => {
    expect(groupBy(items, 'brand', 'dollars', null).map((g) => g.name)).toEqual(['Trek', 'Shimano', 'DT Swiss', 'Fox'])
    expect(groupBy(items, 'brand', 'units', null).map((g) => g.name)).toEqual(['DT Swiss', 'Shimano', 'Trek', 'Fox'])
  })
  it('gives shares of the measure shown and weeks of supply by value', () => {
    const [trek] = groupBy(items, 'brand', 'dollars', null)
    expect(trek).toMatchObject({ dollars: 3000, units: 3, share: 3000 / 5100 })
    expect(trek!.weeksOfSupply).toBeCloseTo(10)
  })
  it('folds the tail into one Other that remembers its members', () => {
    const top = topWithOther(groupBy(items, 'brand', 'dollars', null), 2)
    expect(top.map((g) => g.name)).toEqual(['Trek', 'Shimano', 'Other'])
    expect(top[2]).toMatchObject({ dollars: 1100, units: 602, members: ['DT Swiss', 'Fox'] })
  })
  it('does not fold a single leftover group', () => {
    expect(topWithOther(groupBy(items, 'brand', 'dollars', null), 3).map((g) => g.name)).toEqual(['Trek', 'Shimano', 'DT Swiss', 'Fox'])
  })
})

describe('coverage', () => {
  it('shows days, weeks or months, and says when nothing sells', () => {
    expect(formatCoverage(6.2, 'weeks')).toBe('6.2 weeks')
    expect(formatCoverage(6.2, 'days')).toBe('43 days')
    expect(formatCoverage(13, 'months')).toBe('3.0 months')
    expect(formatCoverage(null, 'weeks')).toBe('Not selling')
    expect(coverWeeks(9, 0)).toBeNull()
  })
  it('bands items for filtering', () => {
    expect(condition(items[3]!, null)).toBe('not_selling')
    expect(condition(item('5', 'X', 1, 2, 1), null)).toBe('low')
    expect(condition(item('6', 'X', 1, 40, 1), null)).toBe('excess')
    expect(condition(items[2]!, null)).toBe('healthy')
  })
})

describe('the item table', () => {
  it('sorts by on hand, value and coverage (not-selling last when soonest first)', () => {
    expect(sortItems(items, { key: 'onHand', dir: 'desc' }, null)[0]!.id).toBe('2')
    expect(sortItems(items, { key: 'value', dir: 'desc' }, null)[0]!.id).toBe('1')
    expect(sortItems(items, { key: 'coverage', dir: 'asc' }, null).map((i) => i.id)).toEqual(['3', '1', '2', '4'])
  })
  it('searches descriptions and hidden part numbers', () => {
    expect(matchesSearch(items[2]!, 'shimano part')).toBe(true)
    expect(matchesSearch(items[2]!, 'pn-3')).toBe(true)
    expect(matchesSearch(items[2]!, 'fox')).toBe(false)
  })
  it('uses one location’s stock when a location is chosen', () => {
    const split = item('7', 'Maxxis', 10, 10, 2, [['a', 6], ['b', 4]])
    expect(groupBy([split], 'brand', 'units', 'b')[0]).toMatchObject({ units: 4, dollars: 40 })
    expect(coverWeeks(4, 0.8)).toBe(5)
  })
})

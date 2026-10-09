import { describe, expect, it } from 'vitest'
import { condition, coverWeeks, demandTrend, formatCoverage, groupBy, inventoryStatus, matchesSearch, sortItems, topWithOther } from '@/features/inventory/summarize'
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

describe('demand trend', () => {
  const w = (weeklySales: number[]) => ({ weeklySales })
  it('compares the last four weeks with the weeks before', () => {
    expect(demandTrend(w([2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4]))).toBe('rising')
    expect(demandTrend(w([4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2]))).toBe('slowing')
    expect(demandTrend(w([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]))).toBe('steady')
  })
  it('does not call a trend from one or two sales', () => {
    expect(demandTrend(w([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1]))).toBe('few')
    expect(demandTrend(w([0, 0, 0, 0]))).toBe('none')
  })
  it('sorts by demand with no sales and slowing first when ascending', () => {
    const rows = [
      { ...items[2]!, id: 'r', weeklySales: [1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3] },
      { ...items[2]!, id: 'n', weeklySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { ...items[2]!, id: 's', weeklySales: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1] },
    ]
    expect(sortItems(rows, { key: 'demand', dir: 'asc' }, null).map((i) => i.id)).toEqual(['n', 's', 'r'])
    expect(sortItems(rows, { key: 'demand', dir: 'desc' }, null)[0]!.id).toBe('r')
  })
})

describe('inventory status', () => {
  it('is healthy when little value sits in excess, and says what does', () => {
    // Beyond 26 weeks: DT Swiss 600 − 520 = 80 units ($80); Fox isn't selling, all 2 ($500).
    const many = [...items, item('7', 'Big', 100, 100, 10)]
    expect(inventoryStatus(many, null)).toMatchObject({
      tone: 'good', title: 'Inventory is generally healthy',
      detail: '2 items hold $580 in excess; everything else is within its expected range.',
    })
    expect(inventoryStatus([...many, item('5', 'X', 1, 2, 1)], null).detail).toBe('2 items hold $580 in excess; 1 item is running low.')
  })
  it('turns to worth a look when much of the value is sitting', () => {
    expect(inventoryStatus([item('8', 'X', 100, 50, 0), item('9', 'Y', 10, 10, 2)], null).tone).toBe('caution')
  })
})

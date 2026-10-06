import { describe, expect, it } from 'vitest'
import { excessQuantity, excessRows, matchesView, sortExcess, summarizeExcess, type NetworkOffer } from '@/features/inventory/excess'
import type { InventoryItemView } from '@/features/inventory/types'
import { compareToMarket, describeComparison } from '@/features/network/pricing'
import { describeReputation } from '@/features/network/reputation'

const item = (id: string, onHand: number, perWeek: number, unitCost: number): InventoryItemView => ({
  id, product: `Item ${id}`, brand: 'B', category: 'C', supplier: 'S', unitCost, onHand, onOrder: 0, perWeek,
  weeklySales: [], lastSale: null, lastReceipt: null, lastPurchaseQty: null, byLocation: [], identifiers: [],
})
const offer = (itemId: string, wholesaleMarketValue: number, extra: Partial<NetworkOffer> = {}): NetworkOffer =>
  ({ itemId, wholesaleMarketValue, excluded: false, ...extra })

describe('excess quantity', () => {
  it('is what is on hand beyond the rule at the current pace', () => {
    expect(excessQuantity(item('a', 10, 0.25, 1), 26)).toBe(3) // keeps ceil(6.5) = 7
    expect(excessQuantity(item('a', 5, 1, 1), 26)).toBe(0)
  })
  it('is everything when the item is not selling', () => {
    expect(excessQuantity(item('a', 30, 0, 1), 26)).toBe(30)
  })
  it('follows the retailer’s rule', () => {
    const i = item('a', 40, 1, 1)
    expect(excessQuantity(i, 13)).toBe(27)
    expect(excessQuantity(i, 52)).toBe(0)
  })
})

describe('network price', () => {
  const items = [item('a', 10, 0.25, 72), item('b', 10, 0.25, 100), item('c', 10, 0.25, 50)]
  const offers = {
    a: offer('a', 90),                              // default: follows Wholesale Market Value
    b: offer('b', 100, { priceOverride: 92 }),      // below market and below cost
    c: offer('c', 50, { priceOverride: 54, excluded: true }),
  }
  const rows = excessRows(items, 26, offers)
  const [a, b, c] = ['a', 'b', 'c'].map((id) => rows.find((r) => r.item.id === id)!)

  it('defaults to Wholesale Market Value, kept as a separate value', () => {
    expect(a).toMatchObject({ networkPrice: 90, wholesaleMarketValue: 90, overridden: false, comparison: { direction: 'equal' } })
  })
  it('uses the retailer’s explicit price, and compares it to the benchmark', () => {
    expect(b).toMatchObject({ networkPrice: 92, wholesaleMarketValue: 100, overridden: true, comparison: { direction: 'below', percent: 8 } })
    expect(c?.comparison).toEqual({ direction: 'above', percent: 8 })
  })
  it('shows gain or loss against average cost', () => {
    expect(a?.gainPerUnit).toBe(18)
    expect(a?.gainPercent).toBe(25)
    expect(b?.gainPerUnit).toBe(-8)
  })
  it('counts recovery only for what is shared', () => {
    const s = summarizeExcess(rows)
    expect(s).toMatchObject({ skus: 3, units: 9, shared: 2, recovery: 3 * 90 + 3 * 92 })
  })
  it('filters exceptions and sorts by money, not units', () => {
    expect(rows.filter((r) => matchesView(r, 'changed')).map((r) => r.item.id)).toEqual(['b', 'c'])
    expect(rows.filter((r) => matchesView(r, 'excluded')).map((r) => r.item.id)).toEqual(['c'])
    expect(rows.filter((r) => matchesView(r, 'loss')).map((r) => r.item.id)).toEqual(['b'])
    expect(sortExcess(rows, 'gain').map((r) => r.item.id)).toEqual(['a', 'c', 'b'])
    expect(sortExcess(rows, 'loss')[0]?.item.id).toBe('b')
  })
  it('leaves an override in place when Wholesale Market Value changes', () => {
    const moved = excessRows(items, 26, { ...offers, b: { ...offers.b, wholesaleMarketValue: 110 } })
    expect(moved.find((r) => r.item.id === 'b')).toMatchObject({ networkPrice: 92, comparison: { direction: 'below', percent: 16 } })
  })
})

describe('comparison and reputation words', () => {
  it('describes direction in words, and says nothing when equal', () => {
    expect(describeComparison(compareToMarket(92, 100))).toBe('8% below Wholesale Market Value')
    expect(describeComparison(compareToMarket(108, 100))).toBe('8% above Wholesale Market Value')
    expect(describeComparison(compareToMarket(100.2, 100))).toBeNull()
  })
  it('states reputation plainly, including little or no history', () => {
    expect(describeReputation({ rating: 4.8, reviews: 23, completed: 79 })).toBe('Rated 4.8 out of 5 from 23 reviews · 79 completed transactions')
    expect(describeReputation({ reviews: 0, completed: 2 })).toBe('No reviews yet · 2 completed transactions')
    expect(describeReputation({ reviews: 0, completed: 0 })).toBe('No reviews yet · No completed transactions yet')
  })
})

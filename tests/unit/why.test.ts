import { describe, expect, it } from 'vitest'
import { calculation, completeWeekStarts, explanation, extraReason, nextStep, seasonView, supplierView } from '@/features/orders/why'
import type { OrderLineView } from '@/features/orders/types'

const line = (over: Partial<OrderLineView> = {}): OrderLineView => ({
  id: 'l1', product: 'Tire', onHand: 0, onOrder: 0, quantity: 3, unitCost: 50, state: 'ok',
  supplier: { status: 'available', note: 'Available' }, reason: 'You have none left.',
  weeklySales: [1, 2, 1, 1, 0, 1, 1, 1, 0, 1, 2, 1], confidence: 'medium', availability: 'Plenty',
  assumptions: [], alternatives: [], ...over,
})

describe('Why N? explanation', () => {
  it('explains the reference case in plain words', () => {
    expect(explanation(line())).toBe(
      'You sell about 1 per week, have none on hand, and don’t have anything on order. We expect you to need 3 before your next chance to restock.')
  })

  it('mentions stock and what more to order when some is on hand or on order', () => {
    expect(explanation(line({ onHand: 2, onOrder: 1, quantity: 5 }))).toBe(
      'You sell about 1 per week, have 2 on hand, and have 1 on order. We expect you to need about 8 before your next chance to restock, so we suggest 5 more.')
  })

  it('handles items that rarely sell', () => {
    expect(explanation(line({ weeklySales: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0], quantity: 2 })))
      .toMatch(/^You’ve sold 2 in the last 12 weeks/)
  })
})

describe('the calculation', () => {
  it('always reconciles: demand − on hand − ordered = recommended', () => {
    const c = calculation(line({ onHand: 2, onOrder: 1, quantity: 5 }))
    expect(c.expectedDemand - c.onHand - c.onOrder).toBe(c.recommended)
  })

  it('describes demand as pace over weeks', () => {
    expect(calculation(line()).demandNote).toBe('~1 per week for the next 3 weeks')
  })
})

describe('quantity and action stay separate', () => {
  const out = line({ supplier: { status: 'out', note: 'Expected in 18 days', expectedInDays: 18 } })

  it('an out-of-stock supplier changes the action, not the quantity', () => {
    expect(calculation(out).recommended).toBe(3)
    expect(nextStep(out, 'Northline')).toBe(
      'Order 3 units when Northline has them again (expected in 18 days), or consider another supplier if you need them sooner.')
  })

  it('says when it is back, and the time to the shelf only on request', () => {
    const s = supplierView(out, 5)
    expect(s).toMatchObject({ value: 'Back in ~18 days', attention: true, warehouses: [] })
    expect(s.note).toBe('None in stock. Expected back in about 18 days, so about 23 days to your shelf.')
  })

  it('an available supplier means order now, with this order', () => {
    expect(nextStep(line(), 'Northline', 'Thursday')).toBe('Order 3 units with this Northline order by Thursday.')
    expect(supplierView(line(), 5).attention).toBe(false)
  })
})

describe('supplier availability says only what the supplier reports', () => {
  const at = (stock: NonNullable<OrderLineView['supplier']['stock']>) =>
    supplierView(line({ supplier: { status: 'available', note: 'Available', stock } }), 5)

  it('an exact total, with warehouses only when reported', () => {
    const w = at({ total: 27, warehouses: [{ name: 'Reno warehouse', available: 12 }, { name: 'Denver warehouse', available: 8 }, { name: 'Atlanta warehouse', available: 7 }] })
    expect(w.value).toBe('27 available')
    expect(w.warehouses.map((x) => x.available)).toEqual([12, 8, 7])
    const t = at({ total: 27 })
    expect(t).toMatchObject({ value: '27 available', warehouses: [] })
  })

  it('a threshold stays a threshold', () => {
    expect(at({ atLeast: 25 }).value).toBe('25+ available')
  })

  it('no quantity at all says in stock, nothing more', () => {
    expect(supplierView(line(), 5).value).toBe('In stock')
  })
})

describe('one paragraph', () => {
  it('says "new to your store" inside the explanation when it shaped the quantity', () => {
    expect(explanation(line({ newToStore: true, state: 'question', reason: 'This is new to your store, so we started small.',
      weeklySales: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0], quantity: 2 }))).toBe(
      'You’ve sold 2 in the last 12 weeks, have none on hand, and don’t have anything on order. '
      + 'Because this item is new to your store, we started small and expect you to need 2 before your next chance to restock.')
  })

  it('carries another unusual reason in the same paragraph', () => {
    expect(explanation(line({ state: 'review', reason: 'You returned 2 of these last month.' })))
      .toMatch(/before your next chance to restock\. You returned 2 of these last month\.$/)
  })
})

describe('the follow-up sentence', () => {
  it('is kept for an unusual line, unless the evidence already says it', () => {
    expect(extraReason(line({ state: 'review', reason: 'You returned 2 last month.' }))).toBe('You returned 2 last month.')
    expect(extraReason(line({ state: 'review', seasonalPace: 0.2 }))).toBeNull()
    expect(extraReason(line({ state: 'review', supplier: { status: 'out', note: 'x' } }))).toBeNull()
    expect(extraReason(line())).toBeNull()
    expect(extraReason(line({ state: 'question', newToStore: true }))).toBeNull()
  })
})

describe('seasonality', () => {
  it('reads a pace against normal for the season', () => {
    expect(seasonView(line({ seasonalPace: 0.2 }))?.value).toBe('~20% faster')
    expect(seasonView(line({ seasonalPace: -0.15 }))?.value).toBe('~15% slower')
    expect(seasonView(line())).toBeNull()
  })
})

describe('complete weeks', () => {
  it('ends with the last full week, leaving out the current one', () => {
    // Wednesday 2026-09-23: the current week started Monday 2026-09-21.
    const weeks = completeWeekStarts(12, new Date('2026-09-23T12:00:00Z'))
    expect(weeks).toHaveLength(12)
    expect(weeks.at(-1)).toBe('2026-09-14')
    expect(weeks[0]).toBe('2026-06-29')
  })
})

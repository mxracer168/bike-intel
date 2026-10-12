import { describe, expect, it } from 'vitest'
import { demoOrders } from '@/demo/orders'
import { cashImpact } from '@/features/orders/cash'
import { sortForReview } from '@/features/orders/summarize'
import type { OrderLineView } from '@/features/orders/types'
import { applyRule, calculation, explanation, ruleLabel } from '@/features/orders/why'
import { adjustment } from '@/features/recommendations/Formula'

const line = (over: Partial<OrderLineView> = {}): OrderLineView => ({
  id: 'l', product: 'Chain tool', onHand: 0, onOrder: 0, quantity: 2, unitCost: 20, state: 'ok',
  supplier: { status: 'available', note: 'Available' }, reason: '', weeklySales: [1, 1, 1, 1], confidence: 'high',
  availability: '', assumptions: [], alternatives: [], ...over,
})

describe('ordering rules', () => {
  it('rounds a need up to whole cases, or up to the minimum', () => {
    expect(applyRule(5, { kind: 'case', size: 6 })).toBe(6)
    expect(applyRule(12, { kind: 'case', size: 6 })).toBe(12)
    expect(applyRule(13, { kind: 'case', size: 6 })).toBe(18)
    expect(applyRule(2, { kind: 'minimum', quantity: 3 })).toBe(3)
    expect(applyRule(4, { kind: 'minimum', quantity: 3 })).toBe(4)
    expect(applyRule(0, { kind: 'minimum', quantity: 3 })).toBe(0)
    expect(applyRule(5)).toBe(5)
    expect(ruleLabel({ kind: 'case', size: 6 })).toBe('Sold in cases of 6')
  })

  it('keeps target − current = need, and the recommendation separate when a rule changed it', () => {
    const c = calculation(line({ onHand: 2, need: 5, quantity: 6, orderRule: { kind: 'case', size: 6 } }))
    expect(c).toMatchObject({ expectedDemand: 7, onHand: 2, onOrder: 0, need: 5, recommended: 6, rule: { kind: 'case', size: 6 } })
    expect(adjustment({ target: 7, onHand: 2, onOrder: 0, recommendation: 6 })).toEqual({ current: 2, need: 5, adjusted: true })
    const plain = calculation(line({ onHand: 1, onOrder: 1, quantity: 3 }))
    expect(plain).toMatchObject({ expectedDemand: 5, need: 3, recommended: 3, rule: undefined })
    expect(adjustment({ target: 5, onHand: 1, onOrder: 1, recommendation: 3 }).adjusted).toBe(false)
  })

  it('says why the quantity differs from the need', () => {
    expect(explanation(line({ onHand: 2, need: 5, quantity: 6, orderRule: { kind: 'case', size: 6 } }), 'Northline'))
      .toContain('so 5 more would cover it. Northline sells these in cases of 6, so we rounded up to 6.')
    expect(explanation(line({ need: 2, quantity: 3, orderRule: { kind: 'minimum', quantity: 3 } }), 'Northline'))
      .toContain('expect you to need 2 before your next chance to restock. Northline’s minimum order is 3, so we suggest 3.')
  })

  it('keeps every example line consistent: quantity = need after the rule', () => {
    for (const o of demoOrders) for (const l of o.lines) {
      if (l.need !== undefined) expect(applyRule(l.need, l.orderRule)).toBe(l.quantity)
    }
  })

  it('opens the Northline order on a line whose order differs from its need (for demos)', () => {
    const first = sortForReview(demoOrders.find((o) => o.id === 'northline')!.lines)[0]!
    expect(first.need).toBeDefined()
    expect(first.quantity).not.toBe(first.need)
  })
})

describe('cash impact', () => {
  const cash = { startsOn: '2026-10-12', weeks: [42_000, 38_500, 35_200, 31_800, 27_400, 29_800], floor: 18_000, paysInWeek: 4 }

  it('pays the order in its week and keeps it out after, judging the lowest week against the floor', () => {
    const i = cashImpact(cash, 4_824)
    expect(i.after.slice(0, 4)).toEqual(cash.weeks.slice(0, 4))
    expect(i.after[4]).toBe(27_400 - 4_824)
    expect(i.lowestWeek).toBe(4)
    expect(i.headroom).toBe(27_400 - 4_824 - 18_000)
    expect(i.state).toBe('Moderate')
    expect(i.sentence).toBe('Cash stays above your normal operating range after this order. Adding more than $4,500 would make the week of Nov 9 tight.')
  })

  it('is comfortable with plenty to spare and tight below the floor', () => {
    expect(cashImpact(cash, 200).state).toBe('Comfortable')
    const tight = cashImpact(cash, 12_000)
    expect(tight.state).toBe('Tight')
    expect(tight.sentence).toBe('This order takes cash about $2,600 below your normal operating range in the week of Nov 9.')
    expect(tight.position).toBeGreaterThan(cashImpact(cash, 4_824).position)
  })
})

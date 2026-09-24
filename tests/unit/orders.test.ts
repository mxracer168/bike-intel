import { describe, expect, it } from 'vitest'
import { freightGap, orderTotal, sortForReview, summarizeOrder } from '@/features/orders/summarize'
import type { OrderLineView, ProposedOrderView } from '@/features/orders/types'

function line(id: string, over: Partial<OrderLineView> = {}): OrderLineView {
  return {
    id, product: id, onHand: 0, onOrder: 0, quantity: 1, unitCost: 10, state: 'ok', reason: '',
    weeklySales: [], confidence: 'high', availability: '', assumptions: [], alternatives: [], ...over,
  }
}

const order: ProposedOrderView = {
  id: 'o', supplier: 'S', currency: 'USD', leadTimeDays: 5, freeFreightAt: 100, orderBy: 'Friday',
  lines: [
    line('a', { quantity: 3, unitCost: 9.4 }),
    line('b', { state: 'review', confidence: 'medium' }),
    line('c', { state: 'question', confidence: 'low', quantity: 2, unitCost: 0.1 }),
    line('d', { confidence: 'medium' }),
  ],
}

describe('order summary', () => {
  it('counts lines by what they need from the buyer', () => {
    expect(summarizeOrder(order)).toMatchObject({ lineCount: 4, confident: 1, review: 1, questions: 1, orderBy: 'Friday' })
  })

  it('totals in cents, so money never drifts', () => {
    expect(orderTotal(order.lines)).toBe(48.4)
    expect(orderTotal(order.lines, { a: 0 })).toBe(20.2)
  })

  it('reports the free-freight gap only while short of it', () => {
    expect(freightGap(order, 48.4)).toBe(51.6)
    expect(freightGap(order, 100)).toBeUndefined()
    expect(freightGap({}, 10)).toBeUndefined()
  })

  it('puts questions first, then lines to review, keeping catalog order', () => {
    expect(sortForReview(order.lines).map((l) => l.id)).toEqual(['c', 'b', 'a', 'd'])
  })
})

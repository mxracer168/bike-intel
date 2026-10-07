import { describe, expect, it } from 'vitest'
import { demoHandoff, demoOrders } from '@/demo/orders'
import { compareToTypical, exactMoney, orderGlance, priceNote } from '@/features/orders/context'
import { handoffPlan, orderFile } from '@/features/orders/handoff'
import type { OrderLineView, ProposedOrderView } from '@/features/orders/types'

function line(id: string, over: Partial<OrderLineView> = {}): OrderLineView {
  return {
    id, product: id, onHand: 0, onOrder: 0, quantity: 1, unitCost: 10, state: 'ok', reason: '',
    supplier: { status: 'available', note: 'Available' },
    weeklySales: [], confidence: 'high', availability: '', assumptions: [], alternatives: [], ...over,
  }
}

const order: ProposedOrderView = {
  id: 'o', supplier: 'Northline Distribution', currency: 'USD', leadTimeDays: 5, freeFreightAt: 500,
  lines: [line('a', { quantity: 40 }), line('b', { quantity: 5, product: 'Stan’s sealant, "large"' }), line('c', { quantity: 2 })],
}

describe('what happens on submit', () => {
  const lightspeed = { name: 'Lightspeed', writeback: true }

  it('A: supplier takes orders electronically and the POS takes purchase orders', () => {
    const plan = handoffPlan({ supplier: 'supplier_api', pos: lightspeed }, 'Northline')
    expect(plan.action).toBe('Approve & submit')
    expect(plan.reaches).toBe('submitted')
    expect(plan.files).toEqual([])
    expect(plan.youDo).toEqual([])
    expect(plan.steps.map((s) => s.who)).toEqual(['Supplier', 'Point of sale', 'Before it’s sent'])
    expect(plan.done).toEqual(['Submitted electronically to Northline', 'Purchase order created in Lightspeed'])
  })

  it('B: no electronic ordering, so the order is approved and a file is prepared', () => {
    const plan = handoffPlan({ supplier: 'export', pos: lightspeed }, 'Summit')
    expect(plan.action).toBe('Approve & prepare order')
    expect(plan.reaches).toBe('approved')
    expect(plan.notice).toMatch(/doesn’t accept electronic orders/)
    expect(plan.files).toEqual(['supplier'])
    expect(plan.youDo.map((t) => t.side)).toEqual(['supplier'])
  })

  it('C: submitted electronically, purchase order made by hand from a file', () => {
    const plan = handoffPlan({ supplier: 'supplier_api', pos: { name: 'Lightspeed', writeback: false } }, 'Northline')
    expect(plan.reaches).toBe('submitted')
    expect(plan.files).toEqual(['pos'])
    expect(plan.youDo.map((t) => t.side)).toEqual(['pos'])
  })

  it('D: neither, and no POS at all', () => {
    const plan = handoffPlan({ supplier: 'export', pos: null }, 'Cascade')
    expect(plan.action).toBe('Approve order')
    expect(plan.files).toEqual(['supplier', 'pos'])
    expect(plan.steps.some((s) => s.who === 'Before it’s sent')).toBe(false)
    expect(plan.youDo[1]!.text).toMatch(/your point of sale/)
  })

  it('never says a recheck happened', () => {
    for (const h of ['a', 'b', 'c', 'd']) {
      expect(handoffPlan(demoHandoff(h)!, 'Northline').done.join(' ')).not.toMatch(/recheck/i)
    }
  })

  it('order files leave out zero lines, quote commas and quotes, and open in Excel', () => {
    const file = orderFile(order, { c: 0 }, 'supplier')
    expect(file.name).toBe('northline-distribution-order.csv')
    expect(file.content.startsWith('﻿Product,Variant,Quantity,Unit cost\r\n')).toBe(true)
    expect(file.content).toContain('"Stan’s sealant, ""large""",,5,10.00')
    expect(file.content).not.toMatch(/^c,/m)
    expect(orderFile(order, {}, 'pos').content).toContain('Supplier,Product')
  })
})

describe('order header', () => {
  it('shows the free-freight gap only while there is one', () => {
    expect(orderGlance(order, 470).freight).toEqual({ threshold: 500, gap: 30 })
    expect(orderGlance(order, 500).freight).toBeUndefined()
    expect(orderGlance({ ...order, freeFreightAt: undefined }, 10).freight).toBeUndefined()
  })

  it('compares this order with the typical one as a direction and a percentage', () => {
    expect(compareToTypical(4824.1, 3950)).toEqual({ direction: 'above', percent: 22 })
    expect(compareToTypical(220, 260)).toEqual({ direction: 'below', percent: 15 })
    expect(compareToTypical(4000, 3950)).toEqual({ direction: 'typical', percent: 1 })
    const glance = orderGlance({ ...order, context: { cadenceDays: 12, typicalOrder: 400 } }, 470)
    expect(glance.typical).toEqual({ amount: 400, cadenceDays: 12, comparison: { direction: 'above', percent: 18 } })
    expect(orderGlance(order, 470).typical).toBeUndefined()
  })

  it('calls out missing or stale prices', () => {
    expect(priceNote(order)).toBeNull()
    expect(priceNote({ ...order, context: { pricesUpdatedDaysAgo: 9 } })).toBe('Prices 9 days old')
    expect(priceNote({ ...order, lines: [...order.lines, line('x', { unitCost: 0 })] })).toBe('1 line has no price (not in total)')
  })

  it('shows the total exactly', () => {
    expect(exactMoney(4824.1)).toBe('$4,824.10')
    expect(exactMoney(4824)).toBe('$4,824.00')
  })

  it('example Northline order: $176 from free freight, 22% above typical, every ~12 days', () => {
    const northline = demoOrders.find((o) => o.id === 'northline')!
    const glance = orderGlance(northline, 4824.1)
    expect(Math.ceil(glance.freight!.gap)).toBe(176)
    expect(glance.typical).toMatchObject({ amount: 3950, cadenceDays: 12, comparison: { direction: 'above', percent: 22 } })
    expect(demoOrders.every((o) => o.handoff)).toBe(true)
  })
})

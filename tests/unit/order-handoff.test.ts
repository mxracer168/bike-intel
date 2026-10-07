import { describe, expect, it } from 'vitest'
import { demoHandoff, demoOrders } from '@/demo/orders'
import { contextRows, exactMoney, priceNote, promotionView } from '@/features/orders/context'
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

describe('order context', () => {
  it('says what the facts mean for this order', () => {
    const o = { ...order, context: { cadenceDays: 12, lastOrderDaysAgo: 9, typicalOrder: 400, terms: 'Net 30' } }
    const rows = contextRows(o, 470, {})
    expect(rows.map((r) => r.label)).toEqual(['Order cadence', 'Typical order', 'Freight', 'Terms'])
    expect(rows[0]).toMatchObject({ value: 'About every 12 days', detail: 'Last Northline order 9 days ago' })
    expect(rows[1]!.detail).toBe('This order is 18% larger than usual')
    expect(rows[2]).toMatchObject({ value: 'Free over $500', detail: '$30 away', emphasis: true })
  })

  it('shows only what is known', () => {
    expect(contextRows({ ...order, freeFreightAt: undefined }, 470, {})).toEqual([])
    expect(contextRows(order, 600, {})[0]!.detail).toBe('This order ships free')
  })

  it('values a promotion at the current quantities, and hides it when nothing qualifies', () => {
    const o = { ...order, context: { promotion: { name: 'Fall service', lineIds: ['a', 'c'], discountRate: 0.1 } } }
    expect(promotionView(o, {})).toEqual({ name: 'Fall service', lines: 2, benefit: 42 })
    expect(promotionView(o, { a: 0 })).toMatchObject({ lines: 1, benefit: 2 })
    expect(promotionView(o, { a: 0, c: 0 })).toBeNull()
  })

  it('calls out missing or stale prices', () => {
    expect(priceNote(order)).toBeNull()
    expect(priceNote({ ...order, context: { pricesUpdatedDaysAgo: 9 } })).toBe('Northline’s prices were last updated 9 days ago.')
    expect(priceNote({ ...order, lines: [...order.lines, line('x', { unitCost: 0 })] })).toMatch(/^1 line has no price yet/)
  })

  it('shows the total exactly', () => {
    expect(exactMoney(4824.1)).toBe('$4,824.10')
    expect(exactMoney(4824)).toBe('$4,824.00')
  })

  it('example orders: Northline is near free freight with a promotion; each has a handoff', () => {
    const northline = demoOrders.find((o) => o.id === 'northline')!
    const rows = contextRows(northline, 4824.1, {})
    expect(rows.find((r) => r.label === 'Freight')).toMatchObject({ detail: '$176 away', emphasis: true })
    expect(rows.find((r) => r.label === 'Fall service promotion')?.value).toBe('18 lines eligible')
    expect(demoOrders.every((o) => o.handoff)).toBe(true)
  })
})

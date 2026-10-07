import { formatMoney } from '@/domain/language/plain'
import { freightGap } from './summarize'
import type { OrderContextView, OrderLineView, ProposedOrderView } from './types'

/**
 * Order context, interpreted: each row says what it means for this order
 * ("$176 away"), not just the raw term. Rows exist only for what's known.
 */

export type ContextRow = { label: string; value: string; detail?: string; emphasis?: boolean }

export function contextRows(order: ProposedOrderView, total: number, quantities: Record<string, number>): ContextRow[] {
  const c: OrderContextView = order.context ?? {}
  const money = (n: number) => formatMoney(Math.round(n), order.currency)
  const rows: ContextRow[] = []
  const short = order.supplier.split(' ')[0]

  if (c.cadenceDays !== undefined) {
    rows.push({
      label: 'Order cadence',
      value: `About every ${c.cadenceDays} days`,
      detail: c.lastOrderDaysAgo !== undefined ? `Last ${short} order ${c.lastOrderDaysAgo === 0 ? 'today' : c.lastOrderDaysAgo === 1 ? 'yesterday' : `${c.lastOrderDaysAgo} days ago`}` : undefined,
    })
  }

  if (c.typicalOrder !== undefined && c.typicalOrder > 0) {
    const pct = Math.round(((total - c.typicalOrder) / c.typicalOrder) * 100)
    rows.push({
      label: 'Typical order',
      value: money(c.typicalOrder),
      detail: Math.abs(pct) < 5 ? 'This order is about usual size' : `This order is ${Math.abs(pct)}% ${pct > 0 ? 'larger' : 'smaller'} than usual`,
    })
  }

  if (order.freeFreightAt !== undefined) {
    const gap = freightGap(order, total)
    rows.push({
      label: 'Freight',
      value: `Free over ${money(order.freeFreightAt)}`,
      detail: gap === undefined ? 'This order ships free' : `${formatMoney(Math.ceil(gap), order.currency)} away`,
      emphasis: gap !== undefined && gap <= order.freeFreightAt * 0.1,
    })
  }

  if (order.orderBy) rows.push({ label: 'Order by', value: order.orderBy })

  if (c.terms) rows.push({ label: 'Terms', value: c.terms })

  const promo = promotionView(order, quantities)
  if (promo) rows.push({ label: promo.name, value: `${promo.lines} ${promo.lines === 1 ? 'line' : 'lines'} eligible`, detail: `Estimated benefit ${money(promo.benefit)}` })

  return rows
}

/**
 * A current program that applies to lines on this order, with its benefit at
 * the current quantities. Hidden when no line on the order qualifies.
 */
export function promotionView(order: ProposedOrderView, quantities: Record<string, number>): { name: string; lines: number; benefit: number } | null {
  const p = order.context?.promotion
  if (!p) return null
  const eligible = order.lines.filter((l: OrderLineView) => p.lineIds.includes(l.id) && (quantities[l.id] ?? l.quantity) > 0)
  if (eligible.length === 0) return null
  const subtotal = eligible.reduce((s, l) => s + l.unitCost * (quantities[l.id] ?? l.quantity), 0)
  return { name: p.name, lines: eligible.length, benefit: subtotal * p.discountRate }
}

/** Prices older than this many days are called out next to the total. */
export const STALE_PRICE_DAYS = 3

/**
 * Said next to the total when it can't be trusted to the cent: lines without
 * a price (left out of the total) or prices that haven't been updated lately.
 */
export function priceNote(order: ProposedOrderView): string | null {
  const unpriced = order.lines.filter((l) => !(l.unitCost > 0)).length
  if (unpriced > 0) return `${unpriced} ${unpriced === 1 ? 'line has' : 'lines have'} no price yet, so the total leaves ${unpriced === 1 ? 'it' : 'them'} out.`
  const days = order.context?.pricesUpdatedDaysAgo
  if (days !== undefined && days > STALE_PRICE_DAYS) return `${order.supplier.split(' ')[0]}’s prices were last updated ${days} days ago.`
  return null
}

/** Exact money for the order total: cents always shown. */
export function exactMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

import type { OrderLineView, OrderSummary, ProposedOrderView } from './types'

export function lineTotal(line: Pick<OrderLineView, 'unitCost'>, quantity: number): number {
  return Math.round(line.unitCost * quantity * 100) / 100
}

/** Order total for the given quantities (defaults to the suggested ones). */
export function orderTotal(lines: OrderLineView[], quantities: Record<string, number> = {}): number {
  const cents = lines.reduce((sum, l) => sum + Math.round(l.unitCost * (quantities[l.id] ?? l.quantity) * 100), 0)
  return cents / 100
}

export function freightGap(order: Pick<ProposedOrderView, 'freeFreightAt'>, total: number): number | undefined {
  if (order.freeFreightAt === undefined || total >= order.freeFreightAt) return undefined
  return Math.round((order.freeFreightAt - total) * 100) / 100
}

/** Supplier-level summary: counts and money only, never line evidence. */
export function summarizeOrder(order: ProposedOrderView): OrderSummary {
  const total = orderTotal(order.lines)
  const count = (state: OrderLineView['state']) => order.lines.filter((l) => l.state === state).length
  return {
    id: order.id,
    supplier: order.supplier,
    currency: order.currency,
    lineCount: order.lines.length,
    total,
    confident: order.lines.filter((l) => l.state === 'ok' && l.confidence === 'high').length,
    review: count('review'),
    questions: count('question'),
    freightGap: freightGap(order, total),
    orderBy: order.orderBy,
  }
}

const rank = { question: 0, review: 1, ok: 2 } as const

/** Lines that need the buyer first, then everything else in catalog order. */
export function sortForReview(lines: OrderLineView[]): OrderLineView[] {
  return lines.map((l, i) => ({ l, i })).sort((a, b) => rank[a.l.state] - rank[b.l.state] || a.i - b.i).map(({ l }) => l)
}

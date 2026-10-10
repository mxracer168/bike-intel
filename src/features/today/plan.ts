import { formatMoney, plural } from '@/domain/language/plain'
import type { OrderSummary } from '@/features/orders/types'

/**
 * Today's replenishment plan: the proposed supplier orders taken together.
 * Products are order lines (one Variant each), so "products" counts what
 * would be bought, across suppliers. The one piece of reasoning is the most
 * useful fact the orders already hold: the order closest to free freight.
 * Nothing here estimates freight cost or savings; that waits for sourcing
 * plans (docs/catalog.md).
 */
export type ReplenishmentPlanView = {
  products: number
  suppliers: number
  total: string
  headline: string
  lead: string
  reason?: string
}

export function buildPlan(orders: OrderSummary[]): ReplenishmentPlanView | null {
  if (orders.length === 0) return null
  const currency = orders[0]!.currency
  const products = orders.reduce((n, o) => n + o.lineCount, 0)
  const total = orders.reduce((n, o) => n + o.total, 0)
  const closest = orders
    .filter((o) => o.freightGap !== undefined && o.freightGap > 0)
    .sort((a, b) => (a.freightGap ?? 0) - (b.freightGap ?? 0))[0]
  return {
    products,
    suppliers: orders.length,
    total: formatMoney(Math.round(total), currency),
    headline: 'Your replenishment plan is ready',
    lead: `${plural(products, 'product')} to restock across ${plural(orders.length, 'supplier')}.`,
    reason: closest
      ? `Your ${closest.supplier} order is ${formatMoney(Math.ceil(closest.freightGap!), currency)} short of free freight, so a few more items there could ship free.`
      : undefined,
  }
}

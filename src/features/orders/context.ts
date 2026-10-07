import { freightGap } from './summarize'
import type { ProposedOrderView } from './types'

/**
 * Order-level facts at a glance, for the order header. Each is shorthand for
 * what the fact means for *this* order ("$176 away", "▲ 22%"), and exists
 * only when it's known.
 */

/** Within this share of the typical order, an order counts as typical. */
export const TYPICAL_BAND = 0.05

export type Comparison = { direction: 'above' | 'below' | 'typical'; percent: number }

/** How this order compares with the typical order to this supplier. */
export function compareToTypical(total: number, typical: number): Comparison {
  const share = (total - typical) / typical
  const percent = Math.round(Math.abs(share) * 100)
  if (Math.abs(share) < TYPICAL_BAND) return { direction: 'typical', percent }
  return { direction: share > 0 ? 'above' : 'below', percent }
}

export type OrderGlance = {
  /** Free freight still to reach. Absent when there's no threshold or this order already ships free. */
  freight?: { threshold: number; gap: number }
  /**
   * The typical order to this supplier and how often it's placed. "Typical"
   * is product language: today it's an example value, and the calculation
   * behind it may change.
   */
  typical?: { amount: number; cadenceDays?: number; comparison: Comparison }
}

export function orderGlance(order: ProposedOrderView, total: number): OrderGlance {
  const c = order.context ?? {}
  const gap = freightGap(order, total)
  return {
    freight: order.freeFreightAt !== undefined && gap !== undefined ? { threshold: order.freeFreightAt, gap } : undefined,
    typical: c.typicalOrder !== undefined && c.typicalOrder > 0
      ? { amount: c.typicalOrder, cadenceDays: c.cadenceDays, comparison: compareToTypical(total, c.typicalOrder) }
      : undefined,
  }
}

/** Prices older than this many days are called out next to the total. */
export const STALE_PRICE_DAYS = 3

/**
 * Said next to the total when it can't be trusted to the cent: lines without
 * a price (left out of the total) or prices that haven't been updated lately.
 */
export function priceNote(order: ProposedOrderView): string | null {
  const unpriced = order.lines.filter((l) => !(l.unitCost > 0)).length
  if (unpriced > 0) return `${unpriced} ${unpriced === 1 ? 'line has' : 'lines have'} no price (not in total)`
  const days = order.context?.pricesUpdatedDaysAgo
  if (days !== undefined && days > STALE_PRICE_DAYS) return `Prices ${days} days old`
  return null
}

/** Exact money for the order total: cents always shown. */
export function exactMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

import { average } from '@/domain/language/plain'
import type { OrderLineView, SupplierCondition } from './types'

/**
 * "Why N?": the answer, the reason, then the evidence. Everything here is
 * worded from the line's own numbers so a retailer understands the quantity
 * before looking at the chart. Nothing here forecasts; it explains what the
 * recommendation already decided.
 *
 * Two things are kept apart on purpose (docs/recommendations.md):
 *   the recommended QUANTITY  ("3 units"), and
 *   the recommended ACTION    ("order when the supplier has them again, or
 *                              use another supplier if you need them sooner").
 */

/** Pace as a person says it: "about 1 per week", "less than 1 per week". */
export function paceWords(perWeek: number): string {
  if (perWeek <= 0) return 'no recent sales'
  if (perWeek < 0.75) return 'less than 1 per week'
  return `about ${Math.round(perWeek)} per week`
}

/** "1.0", "0.9": the average, to one decimal. */
export const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

export type Calculation = {
  expectedDemand: number
  onHand: number
  onOrder: number
  recommended: number
  /** "~1 per week for the next 3 weeks", when there's a pace to go by. */
  demandNote: string
}

/**
 * Expected demand − on hand − already ordered = recommended. Expected demand
 * is what the recommendation covered, so the arithmetic always reconciles
 * with the quantity shown.
 */
export function calculation(line: OrderLineView): Calculation {
  const perWeek = average(line.weeklySales)
  const expectedDemand = line.quantity + line.onHand + line.onOrder
  const weeks = perWeek > 0 ? Math.max(1, Math.round(expectedDemand / perWeek)) : 0
  const pace = perWeek >= 0.75 ? `~${Math.round(perWeek)} per week` : 'Under 1 per week'
  return {
    expectedDemand,
    onHand: line.onHand,
    onOrder: line.onOrder,
    recommended: line.quantity,
    demandNote: weeks > 0 ? `${pace} for the next ${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : 'A small starting quantity',
  }
}

/** The plain-language answer: two sentences, before any evidence. */
export function explanation(line: OrderLineView): string {
  const perWeek = average(line.weeklySales)
  const sold = line.weeklySales.reduce((a, b) => a + b, 0)
  const selling = perWeek >= 0.25
    ? `You sell ${paceWords(perWeek)}`
    : sold > 0 ? `You’ve sold ${sold} in the last ${line.weeklySales.length} weeks` : 'This hasn’t sold recently'
  const onHand = line.onHand > 0 ? `have ${line.onHand} on hand` : 'have none on hand'
  const onOrder = line.onOrder > 0 ? `have ${line.onOrder} on order` : 'don’t have anything on order'
  const { expectedDemand } = calculation(line)
  const need = line.onHand + line.onOrder > 0
    ? `We expect you to need about ${expectedDemand} before your next chance to restock, so we suggest ${line.quantity} more.`
    : `We expect you to need ${line.quantity} before your next chance to restock.`
  return `${selling}, ${onHand}, and ${onOrder}. ${need}`
}

/**
 * A line with something unusual keeps its own reason as a follow-up sentence,
 * unless the evidence below already says it (seasonality, a supplier wait).
 */
export function extraReason(line: OrderLineView): string | null {
  if (line.state === 'ok') return null
  if (line.seasonalPace !== undefined || supplierWaiting(line.supplier)) return null
  return line.reason
}

/** Supplier can't ship now: out of stock or delayed. */
export const supplierWaiting = (s: SupplierCondition) => s.status === 'out' || s.status === 'delayed'

export type SupplierView = {
  /** The headline value: "Expected in 18 days", "Available", "2 left". */
  value: string
  /** The line under it: "Currently out of stock". */
  detail: string
  /** Worth the caution color. */
  attention: boolean
  /** The evidence sentence on the left. */
  sentence: string
  /** Days until it can be on the shelf, when we know when the supplier has it again. */
  toShelfDays?: number
}

export function supplierView(line: OrderLineView, supplier: string, leadTimeDays: number): SupplierView {
  const s = line.supplier
  const delivery = `Typical delivery ${supplierWaiting(s) ? 'after it’s available ' : ''}is about ${leadTimeDays} days.`
  if (supplierWaiting(s)) {
    const when = s.expectedInDays !== undefined ? `Expected in ${s.expectedInDays} days` : s.note
    return {
      value: when,
      detail: s.status === 'out' ? 'Currently out of stock' : 'Delayed',
      attention: true,
      sentence: `${s.status === 'out' ? `Out of stock at ${supplier}` : `Delayed at ${supplier}`}. ${when}. ${delivery}`,
      toShelfDays: s.expectedInDays !== undefined ? s.expectedInDays + leadTimeDays : undefined,
    }
  }
  if (s.status === 'limited') {
    return { value: s.note, detail: 'Limited stock', attention: true, sentence: `${supplier} has ${s.note}. ${delivery}` }
  }
  return { value: 'Available', detail: 'In stock now', attention: false, sentence: `${supplier} has it in stock. ${delivery}` }
}

/** Seasonality in words, if we have a view on it. */
export function seasonView(line: OrderLineView): { value: string; detail: string; sentence: string } | null {
  if (line.seasonalPace !== undefined && line.seasonalPace !== 0) {
    const pct = Math.round(Math.abs(line.seasonalPace) * 100)
    const dir = line.seasonalPace > 0 ? 'faster' : 'slower'
    return {
      value: `~${pct}% ${dir}`,
      detail: 'Than normal for this time of year',
      sentence: `Sales are running about ${pct}% ${dir} than normal for this time of year, based on the last 2 years.`,
    }
  }
  if (line.season) return { value: line.season, detail: 'Seasonal pattern', sentence: `${line.season}, based on your past sales.` }
  return null
}

/**
 * The recommended ACTION, which isn't always "order it now": when the
 * supplier can't ship, the quantity stands but the timing or source changes.
 */
export function nextStep(line: OrderLineView, supplier: string, orderBy?: string): string {
  const s = line.supplier
  const units = `${line.quantity} ${line.quantity === 1 ? 'unit' : 'units'}`
  if (supplierWaiting(s)) {
    const when = s.expectedInDays !== undefined ? ` (expected in ${s.expectedInDays} days)` : ''
    return `Order ${units} when ${supplier} has them again${when}, or consider another supplier if you need them sooner.`
  }
  if (s.status === 'limited') return `Order ${units} with this order: ${supplier} has only ${s.note}.`
  return `Order ${units} with this ${supplier} order${orderBy ? ` by ${orderBy}` : ''}.`
}

/**
 * Start dates of the last `count` complete weeks (Mondays, oldest first),
 * as ISO dates. The current, unfinished week is left out.
 */
export function completeWeekStarts(count: number, today: Date): string[] {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const sinceMonday = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - sinceMonday - 7 * count)
  return [...Array(count)].map((_, i) => {
    const w = new Date(d)
    w.setUTCDate(d.getUTCDate() + 7 * i)
    return w.toISOString().slice(0, 10)
  })
}

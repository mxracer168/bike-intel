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

/**
 * The plain-language answer, as one paragraph: what's selling and on hand,
 * then what we expect them to need. A reason that shaped the quantity (new
 * to the store) is said inside the sentence; any other unusual reason
 * follows in the same paragraph.
 */
export function explanation(line: OrderLineView): string {
  const perWeek = average(line.weeklySales)
  const sold = line.weeklySales.reduce((a, b) => a + b, 0)
  const selling = perWeek >= 0.25
    ? `You sell ${paceWords(perWeek)}`
    : sold > 0 ? `You’ve sold ${sold} in the last ${line.weeklySales.length} weeks` : 'This hasn’t sold recently'
  const onHand = line.onHand > 0 ? `have ${line.onHand} on hand` : 'have none on hand'
  const onOrder = line.onOrder > 0 ? `have ${line.onOrder} on order` : 'don’t have anything on order'
  const { expectedDemand } = calculation(line)
  const stocked = line.onHand + line.onOrder > 0
  const expect = stocked
    ? `expect you to need about ${expectedDemand} before your next chance to restock, so we suggest ${line.quantity} more`
    : `expect you to need ${line.quantity} before your next chance to restock`
  const need = line.newToStore
    ? `Because this item is new to your store, we started small and ${expect}.`
    : `We ${expect}.`
  const extra = extraReason(line)
  return [`${selling}, ${onHand}, and ${onOrder}.`, need, extra].filter(Boolean).join(' ')
}

/**
 * Another unusual reason, said after the expectation, unless the screen
 * already shows it (new to the store, seasonality, a supplier wait).
 */
export function extraReason(line: OrderLineView): string | null {
  if (line.state === 'ok' || line.newToStore) return null
  if (line.seasonalPace !== undefined || supplierWaiting(line.supplier)) return null
  return line.reason
}

/** Supplier can't ship now: out of stock or delayed. */
export const supplierWaiting = (s: SupplierCondition) => s.status === 'out' || s.status === 'delayed'

export type SupplierView = {
  /** The one-line value: "25+ available", "12 available", "2 left", "Back in ~18 days". */
  value: string
  /** Worth the caution color. */
  attention: boolean
  /** Warehouse rows, only when the supplier reports them. */
  warehouses: { name: string; available: number }[]
  /** One sentence for the expanded view when there are no warehouse rows. */
  note: string
}

const units = (n: number) => `${n} available`

export function supplierView(line: OrderLineView, leadTimeDays: number): SupplierView {
  const s = line.supplier
  const stock = s.stock
  const warehouses = stock?.warehouses?.filter((w) => w.available > 0) ?? []
  if (supplierWaiting(s)) {
    const known = s.expectedInDays !== undefined
    return {
      value: known ? `Back in ~${s.expectedInDays} days` : s.note,
      attention: true,
      warehouses: [],
      note: known
        ? `None in stock. Expected back in about ${s.expectedInDays} days, so about ${s.expectedInDays! + leadTimeDays} days to your shelf.`
        : `${s.status === 'out' ? 'None in stock' : 'Delayed'}. ${s.note}.`,
    }
  }
  const quantity = stock?.total !== undefined ? units(stock.total) : stock?.atLeast !== undefined ? `${stock.atLeast}+ available` : null
  if (s.status === 'limited') {
    return { value: stock?.total !== undefined ? `${stock.total} left` : s.note, attention: true, warehouses, note: 'Only a few left.' }
  }
  return {
    value: quantity ?? 'In stock',
    attention: false,
    warehouses,
    note: stock?.atLeast !== undefined ? `Reports “${stock.atLeast}+” rather than an exact count.`
      : stock?.total !== undefined ? 'Reports a total, not stock by warehouse.' : 'Reports in stock, without a quantity.',
  }
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

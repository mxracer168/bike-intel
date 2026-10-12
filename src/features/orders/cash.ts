import { formatMoney } from '@/domain/language/plain'
import type { CashOutlook } from './types'

/**
 * What paying for this order does to cash (Figma reference: cash impact).
 * The projection is the retailer's expected weekly cash balance without this
 * order; the order is paid in one week (its terms) and stays out from then
 * on. The state compares the lowest balance after the order with the normal
 * operating floor: half the floor again or more to spare is comfortable,
 * above the floor is moderate, below it is tight.
 */
export type CashImpact = {
  state: 'Comfortable' | 'Moderate' | 'Tight'
  /** Where the marker sits on the comfortable-to-tight scale, 0–100. */
  position: number
  before: number[]
  after: number[]
  floor: number
  /** The lowest week after the order, and what's left above the floor then (negative: below it). */
  lowestWeek: number
  headroom: number
  sentence: string
}

const DAY = 86_400_000

export function weekLabel(startsOn: string, index: number): string {
  const d = new Date(Date.parse(`${startsOn}T00:00:00Z`) + index * 7 * DAY)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function cashImpact(cash: CashOutlook, total: number, currency = 'USD'): CashImpact {
  const before = cash.weeks
  const after = before.map((b, i) => (i >= cash.paysInWeek ? b - total : b))
  const lowestWeek = after.reduce((low, v, i) => (v < after[low]! ? i : low), cash.paysInWeek)
  const headroom = Math.round(after[lowestWeek]! - cash.floor)
  const ratio = headroom / cash.floor
  const state = ratio >= 0.5 ? 'Comfortable' : ratio >= 0 ? 'Moderate' : 'Tight'
  const position = Math.min(96, Math.max(4, 10 + ((1 - ratio) / 1.25) * 85))
  const week = `the week of ${weekLabel(cash.startsOn, lowestWeek)}`
  const room = formatMoney(Math.max(0, Math.floor(headroom / 100) * 100), currency)
  const sentence = headroom >= 0
    ? `Cash stays above your normal operating range after this order. Adding more than ${room} would make ${week} tight.`
    : `This order takes cash about ${formatMoney(Math.ceil(-headroom / 100) * 100, currency)} below your normal operating range in ${week}.`
  return { state, position, before, after, floor: cash.floor, lowestWeek, headroom, sentence }
}

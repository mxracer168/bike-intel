/**
 * Turn numbers into the way an experienced buyer would say them.
 * "about 2 a week", "about a week left" - never "velocity 2.14" or "WOS 0.93".
 */

/** Average of a series, e.g. weekly unit sales. */
export function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

/** "about 2 a week", "about 1 a week", "less than 1 a week". */
export function describeWeeklyRate(perWeek: number): string {
  if (perWeek <= 0) return 'no recent sales'
  if (perWeek < 0.75) return 'less than 1 a week'
  return `about ${Math.round(perWeek)} a week`
}

/** How long stock on hand lasts at the current rate, in words. */
export function describeCover(onHand: number, perWeek: number): string {
  if (onHand <= 0) return 'none left'
  if (perWeek <= 0) return 'no recent sales to go by'
  const weeks = onHand / perWeek
  if (weeks < 0.75) return 'less than a week'
  if (weeks < 1.5) return 'about a week'
  if (weeks < 6) return `about ${Math.round(weeks)} weeks`
  const months = Math.round(weeks / 4.345)
  return months <= 1 ? 'about a month' : `about ${months} months`
}

/** Money for people: "$56.40", "$1,284". */
export function formatMoney(amount: number, currency = 'USD'): string {
  const whole = Number.isInteger(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
  }).format(amount)
}

/** "1 location", "3 locations". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}


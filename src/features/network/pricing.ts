/**
 * Network price against Wholesale Market Value (docs/network.md). A
 * comparison, not a judgment: below isn't "good" and above isn't "bad".
 */

export const WMV_TERM = 'Wholesale Market Value'

/** Said once, where the term first appears on a screen. */
export const WMV_HELP = 'Estimated current wholesale replacement value, based on available supplier pricing and market intelligence.'

export type PriceComparison = { direction: 'below' | 'equal' | 'above'; percent: number }

/** To the nearest percent; anything that rounds to 0% reads as equal. */
export function compareToMarket(price: number, wholesaleMarketValue: number): PriceComparison {
  if (wholesaleMarketValue <= 0) return { direction: 'equal', percent: 0 }
  const percent = Math.round((Math.abs(price - wholesaleMarketValue) / wholesaleMarketValue) * 100)
  if (percent === 0) return { direction: 'equal', percent: 0 }
  return { direction: price < wholesaleMarketValue ? 'below' : 'above', percent }
}

/** "8% below Wholesale Market Value", or null when equal. */
export function describeComparison(c: PriceComparison, term = WMV_TERM): string | null {
  return c.direction === 'equal' ? null : `${c.percent}% ${c.direction} ${term}`
}

/** Unit prices always show cents. */
export function unitPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

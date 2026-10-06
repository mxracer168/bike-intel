/**
 * A participating retailer's reputation on the network: rating, reviews and
 * completed transactions. Example data only today; no scoring exists. No
 * ranks, tiers or badges (docs/network.md).
 */
export type Reputation = {
  /** Average stars out of 5; absent with no reviews. */
  rating?: number
  reviews: number
  completed: number
}

/** The words, for screen readers and plain text. */
export function describeReputation(r: Reputation): string {
  const completed = r.completed === 0 ? 'No completed transactions yet'
    : `${r.completed} completed ${r.completed === 1 ? 'transaction' : 'transactions'}`
  if (r.reviews === 0 || r.rating === undefined) return `No reviews yet · ${completed}`
  return `Rated ${r.rating.toFixed(1)} out of 5 from ${r.reviews} ${r.reviews === 1 ? 'review' : 'reviews'} · ${completed}`
}

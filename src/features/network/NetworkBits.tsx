import { Icon } from '@/ui/Icon'
import { describeComparison, WMV_TERM, type PriceComparison } from './pricing'
import { describeReputation, type Reputation } from './reputation'
import styles from './Network.module.css'

/**
 * A small arrow and the difference from Wholesale Market Value. Color only
 * reinforces the arrow and words; equal shows nothing.
 */
export function PriceVsMarket({ comparison, short = false }: { comparison: PriceComparison; short?: boolean }) {
  const words = describeComparison(comparison)
  if (!words) return null
  return (
    <span className={[styles.vs, styles[comparison.direction]].join(' ')}>
      <Icon name={comparison.direction === 'below' ? 'arrow-down' : 'arrow-up'} size={12} />
      {short ? <><span aria-hidden="true">{comparison.percent}% {comparison.direction}</span><span className="visually-hidden">{words}</span></> : words}
    </span>
  )
}

/** "4.8 ★ · 23 reviews · 79 completed transactions": trust, not a score to compete on. */
export function ReputationLine({ reputation }: { reputation: Reputation }) {
  const { rating, reviews, completed } = reputation
  return (
    <span className={styles.reputation}>
      <span aria-hidden="true">
        {reviews > 0 && rating !== undefined
          ? <><b>{rating.toFixed(1)} <span className={styles.star}>★</span></b> · {reviews} {reviews === 1 ? 'review' : 'reviews'}</>
          : 'No reviews yet'}
        {' · '}
        {completed === 0 ? 'New to the network' : `${completed} completed ${completed === 1 ? 'transaction' : 'transactions'}`}
      </span>
      <span className="visually-hidden">{describeReputation(reputation)}</span>
    </span>
  )
}

export { WMV_TERM }

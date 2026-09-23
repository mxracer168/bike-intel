import styles from './Confidence.module.css'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

const label: Record<ConfidenceLevel, string> = {
  high: 'Confident',
  medium: 'Fairly confident',
  low: 'Less confident',
}
const filled: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 }

/** Discoverable, not dominant: three quiet dots and words. */
export function ConfidenceMark({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={[styles.conf, level === 'low' && styles.low].filter(Boolean).join(' ')}>
      <span className={styles.dots} aria-hidden="true">
        {[0, 1, 2].map((i) => <i key={i} className={i < filled[level] ? styles.on : undefined} />)}
      </span>
      {label[level]}
    </span>
  )
}

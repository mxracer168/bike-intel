import { MAX_METRICS, type HealthMetric } from './types'
import styles from './Today.module.css'

/** A few figures, read left to right. No tiles, no charts, no trend arrows. */
export function HealthSnapshot({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <dl className={styles.health}>
      {metrics.slice(0, MAX_METRICS).map((m) => (
        <div key={m.label} className={styles.metric}>
          <dt className={styles.metricLabel}>{m.label}</dt>
          <dd className={styles.metricValue}>{m.value}</dd>
          {m.note && <dd className={styles.metricNote}>{m.note}</dd>}
        </div>
      ))}
    </dl>
  )
}

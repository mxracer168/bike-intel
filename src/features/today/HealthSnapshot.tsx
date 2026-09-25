import { Icon } from '@/ui/Icon'
import { MAX_METRICS, type HealthMetric } from './types'
import styles from './Today.module.css'

/**
 * Business health: a few cards, one figure each. The value leads; a small
 * arrow shows the change, colored by whether it's good for the business (not
 * by whether the number went up).
 */
export function HealthSnapshot({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <ul className={styles.health}>
      {metrics.slice(0, MAX_METRICS).map((m) => (
        <li key={m.label} className={styles.card}>
          <p className={styles.metricLabel}>{m.label}</p>
          <p className={styles.metricValue}>{m.value}</p>
          {m.note && <p className={styles.metricNote}>{m.note}</p>}
          {m.trend && (
            <p className={[styles.trend, m.trend.good ? styles.good : styles.bad].join(' ')}>
              <span className={m.trend.direction === 'down' ? styles.arrowDown : undefined} aria-hidden="true">
                <Icon name="arrow-up" size={13} />
              </span>
              <span className="visually-hidden">{m.trend.direction === 'up' ? 'Up' : 'Down'} </span>
              {m.trend.text}
              <span className="visually-hidden">{m.trend.good ? ' (good)' : ' (worth a look)'}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

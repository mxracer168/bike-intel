import { Icon } from '@/ui/Icon'
import { MAX_METRICS, type HealthMetric } from './types'
import styles from './Today.module.css'

/**
 * Business health: a quiet band of figures, side by side. The value leads; a
 * small arrow shows the change, colored by whether it's good for the business
 * (not by whether the number went up).
 */
export function HealthSnapshot({ metrics, label, variant = 'band' }: {
  metrics: HealthMetric[]; label?: string
  /** band: between hairlines (Today, Inventory). panel: on its own surface (Insights). */
  variant?: 'band' | 'panel'
}) {
  const shown = metrics.slice(0, MAX_METRICS)
  const vars = { '--cards': shown.length, '--cards-md': Math.min(shown.length, 3) } as React.CSSProperties
  return (
    <ul className={[styles.health, shown.length <= 3 && styles.few, variant === 'panel' && styles.panel].filter(Boolean).join(' ')} aria-label={label} style={vars}>
      {shown.map((m) => (
        <li key={m.label} className={styles.card}>
          <p className={styles.metricLabel}>{m.label}</p>
          <p className={styles.metricValue}>{m.value}</p>
          {m.note && <p className={styles.metricNote}>{m.note}</p>}
          {m.trend && (
            <p className={[styles.trend, m.trend.good ? styles.good : styles.bad].join(' ')}>
              <span className={m.trend.direction === 'down' ? styles.arrowDown : undefined} aria-hidden="true">
                <Icon name="arrow-up" size={12} />
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

import Link from 'next/link'
import type { ReplenishmentPlanView } from './plan'
import styles from './Today.module.css'

const NODES: [number, number, number, string][] = [
  [390, 32, 4, ''], [516, 106, 6, 'a'], [624, 44, 4, ''], [742, 148, 6, 'b'], [874, 88, 4, ''],
  [438, 222, 5, 'c'], [546, 222, 3, ''], [694, 280, 6, 'a'], [626, 356, 4, ''], [874, 362, 5, 'b'],
]

/**
 * The replenishment plan as one quiet piece of intelligence: what it covers,
 * the figures that size it, the most useful reason in it, and the way in.
 * A faint network sits behind it, the same idea as the sidebar's.
 */
export function ReplenishmentPlan({ plan, href, freshness }: { plan: ReplenishmentPlanView; href: string; freshness?: string }) {
  return (
    <Link href={href} className={styles.plan} aria-labelledby="plan-title">
      <svg className={styles.planNetwork} aria-hidden="true" fill="none" preserveAspectRatio="xMaxYMid slice" viewBox="0 0 900 420">
        <g className={styles.planLinks}>
          <path d="m390 32 126 74 108-62 118 104 132-60" />
          <path d="m516 106 30 116 148 58 48-132" />
          <path d="m390 32 48 190 108 0 80 134 68-76 180 82" />
          <path d="m438 222-76 112 264 22 116-208" />
          <path d="m546 222 148 58 180-192" />
        </g>
        <g className={styles.planSignals}>
          <path d="m390 32 126 74 108-62 118 104 132-60" />
          <path d="m438 222 108 0 80 134 116-208" />
        </g>
        <g className={styles.planNodes}>
          {NODES.map(([cx, cy, r, v], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} className={v ? [styles.planNode, styles[`planNode_${v}`]].join(' ') : styles.planQuietNode} />
          ))}
        </g>
      </svg>
      <span className={styles.planShade} aria-hidden="true" />

      <span className={styles.planBody}>
        <span className={styles.planTop}>
          <span className={styles.planEyebrow}>Replenishment plan</span>
          {freshness && <span className={styles.planFresh}>{freshness}</span>}
        </span>
        <span id="plan-title" className={styles.planTitle}>{plan.headline}</span>
        <span className={styles.planLead}>{plan.lead}</span>
        <span className={styles.planFacts}>
          <span><b>{plan.products}</b>products</span>
          <span><b>{plan.suppliers}</b>suppliers</span>
          <span><b>{plan.total}</b>proposed</span>
        </span>
        {plan.reason && <span className={styles.planReason}>{plan.reason}</span>}
        <span className={styles.planGo}>Review plan <span aria-hidden="true">→</span></span>
      </span>
    </Link>
  )
}

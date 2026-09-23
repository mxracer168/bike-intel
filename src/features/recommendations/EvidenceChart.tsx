'use client'

import { useState } from 'react'
import { average, describeWeeklyRate } from '@/domain/language/plain'
import styles from './EvidenceChart.module.css'

const W = 520
const H = 132
const M = { top: 8, right: 4, bottom: 2, left: 4 }
const innerW = W - M.left - M.right
const innerH = H - M.top - M.bottom

function weeksAgoLabel(weeksAgo: number) {
  if (weeksAgo === 0) return 'This week'
  if (weeksAgo === 1) return 'Last week'
  return `${weeksAgo} weeks ago`
}

/** Column with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  const b = y + h
  return `M${x},${b}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${b}Z`
}

/**
 * Weekly unit sales (oldest first). Single series: the caption names it, no
 * legend. Every value is also in the screen-reader table; the tooltip only
 * enhances.
 */
export function EvidenceChart({ weeklySales }: { weeklySales: number[] }) {
  const [active, setActive] = useState<number | null>(null)
  const n = weeklySales.length
  const avg = average(weeklySales)
  const max = Math.max(1, ...weeklySales, avg) * 1.15
  const slot = innerW / n
  const barW = Math.min(24, slot * 0.62)
  const y = (v: number) => M.top + innerH - (v / max) * innerH
  const refY = y(avg)
  const rate = describeWeeklyRate(avg)
  const summary = `Weekly sales over the last ${n} weeks: ${rate} on average.`

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>Weekly sales, last {n} weeks</figcaption>
      <div className={styles.plot}>
        <div className={styles.canvas}>
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={summary}>
          <line className={styles.baseline} x1={M.left} x2={W - M.right} y1={M.top + innerH} y2={M.top + innerH} />
          {avg > 0 && <line className={styles.reference} x1={M.left} x2={W - M.right} y1={refY} y2={refY} />}
          {weeklySales.map((v, i) => {
            const cx = M.left + slot * i + slot / 2
            const top = y(v)
            const weeksAgo = n - 1 - i
            const label = `${weeksAgoLabel(weeksAgo)}: ${v} sold`
            return (
              <g
                key={i}
                className={styles.mark}
                tabIndex={0}
                role="img"
                aria-label={label}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <rect className={styles.hit} x={cx - slot / 2 + 1} y={M.top} width={slot - 2} height={innerH} rx={4} />
                <path className={[styles.bar, weeksAgo === 0 && styles.current].filter(Boolean).join(' ')}
                  d={columnPath(cx - barW / 2, top, barW, M.top + innerH - top)} />
              </g>
            )
          })}
        </svg>
        {avg > 0 && (
          <span className={styles.refLabel} style={{ top: `calc(${(refY / H) * 100}% - 20px)` }} aria-hidden="true">
            {rate.charAt(0).toUpperCase() + rate.slice(1)}
          </span>
        )}
        {active !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: `${((M.left + slot * active + slot / 2) / W) * 100}%`,
              top: `calc(${(y(weeklySales[active] ?? 0) / H) * 100}% - 6px)`,
            }}
            aria-hidden="true"
          >
            <b>{weeklySales[active]} sold</b>{weeksAgoLabel(n - 1 - active)}
          </div>
        )}
        </div>
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>{weeksAgoLabel(n - 1)}</span>
        <span>This week</span>
      </div>
      <table className="visually-hidden">
        <caption>{summary}</caption>
        <thead><tr><th scope="col">Week</th><th scope="col">Sold</th></tr></thead>
        <tbody>
          {weeklySales.map((v, i) => (
            <tr key={i}><th scope="row">{weeksAgoLabel(n - 1 - i)}</th><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

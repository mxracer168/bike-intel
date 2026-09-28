'use client'

import { useState } from 'react'
import { average } from '@/domain/language/plain'
import styles from './WeeklySalesChart.module.css'

const dayMonth = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

/** Whole-unit axis: steps of 1 up to 5, then 2, 5, 10… so there are never more than about five lines. */
export function unitTicks(max: number): number[] {
  const top = Math.max(1, Math.ceil(max))
  const step = top <= 5 ? 1 : [2, 5, 10, 20, 25, 50, 100, 200, 500].find((s) => top / s <= 5) ?? Math.ceil(top / 5)
  const last = Math.ceil(top / step) * step
  return [...Array(last / step + 1)].map((_, i) => i * step)
}

/**
 * Units sold in each of the last complete weeks (oldest first); the current,
 * unfinished week isn't included. One series in one hue: the heading names
 * it, so no legend. Weeks with no sales say "0" rather than leaving a gap.
 * A dashed line marks the average. Every value is also in the screen-reader
 * table; the tooltip only enhances.
 */
export function WeeklySalesChart({ weeklySales, weekStarts, titleId }: {
  weeklySales: number[]
  /** ISO dates each week starts on, oldest first. */
  weekStarts?: string[]
  titleId: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const n = weeklySales.length
  const avg = average(weeklySales)
  const ticks = unitTicks(Math.max(...weeklySales, avg))
  const top = ticks[ticks.length - 1]!
  const pct = (v: number) => `${(v / top) * 100}%`
  const label = (i: number) => {
    const start = weekStarts?.[i]
    return start ? dayMonth.format(new Date(`${start}T00:00:00Z`)) : `Week ${i + 1}`
  }
  const weekName = (i: number) => (weekStarts?.[i] ? `Week of ${label(i)}` : label(i))
  const avgText = (Math.round(avg * 10) / 10).toFixed(1)

  return (
    <figure className={styles.figure} aria-labelledby={titleId}>
      <div className={styles.chart} aria-hidden="true">
        <div className={styles.yAxis}>
          {ticks.map((t) => <span key={t} style={{ bottom: pct(t) }}>{t}</span>)}
        </div>
        <div className={styles.plot}>
          {ticks.map((t) => <i key={t} className={t === 0 ? styles.baseline : styles.grid} style={{ bottom: pct(t) }} />)}
          {avg > 0 && (
            <div className={styles.avg} style={{ bottom: pct(avg) }}>
              <span className={styles.avgLabel}>Avg {avgText}</span>
            </div>
          )}
          <ol className={styles.bars}>
            {weeklySales.map((v, i) => (
              <li key={i} className={styles.slot}
                onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
                {v > 0
                  ? <span className={styles.bar} style={{ height: pct(v) }} />
                  : <span className={styles.zero}>0</span>}
                {active === i && (
                  <span className={styles.tooltip} style={{ bottom: `calc(${pct(v)} + 6px)` }}>
                    <b>{v} sold</b>{weekName(i)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
        <ol className={styles.xAxis}>
          {weeklySales.map((_, i) => <li key={i}>{label(i)}</li>)}
        </ol>
      </div>
      {/* Wrapped: a table ignores the 1px width of visually-hidden and would widen the page. */}
      <div className="visually-hidden">
      <table>
        <caption>Units sold each week, last {n} complete weeks. Average {avgText} per week.</caption>
        <thead><tr><th scope="col">Week</th><th scope="col">Sold</th></tr></thead>
        <tbody>
          {weeklySales.map((v, i) => <tr key={i}><th scope="row">{weekName(i)}</th><td>{v}</td></tr>)}
        </tbody>
      </table>
      </div>
    </figure>
  )
}

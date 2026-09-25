'use client'

import { useId, useState } from 'react'
import { formatMoney } from '@/domain/language/plain'
import { formatCoverage, topWithOther, type Group } from './summarize'
import type { CoverageUnit, Measure } from './types'
import styles from './Inventory.module.css'

const TOP = 6

const units = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'unit' : 'units'}`
const pct = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)

/**
 * Where inventory is concentrated, as ranked horizontal bars (one series, one
 * hue; the title names it, so no legend). Each bar is also a filter for the
 * table below: choose one to see the items behind it.
 */
export function CompositionChart({ title, noun, groups, measure, onMeasure, selected, onSelect, expanded, onExpand, coverageUnit }: {
  title: string
  /** "brand" or "category", for labels. */
  noun: string
  /** All groups, largest first for `measure`. */
  groups: Group[]
  measure: Measure
  onMeasure: (m: Measure) => void
  /** The group names currently filtering the table. */
  selected: string[]
  onSelect: (group: Group | null) => void
  expanded: boolean
  onExpand: (expanded: boolean) => void
  coverageUnit: CoverageUnit
}) {
  const [active, setActive] = useState<string | null>(null)
  const titleId = useId()
  const shown = expanded ? groups : topWithOther(groups, TOP)
  const max = Math.max(1, ...shown.map((g) => g[measure]))
  const isSelected = (g: Group) => selected.length > 0 && g.members.length === selected.length && g.members.every((m) => selected.includes(m))
  const valueText = (g: Group) => (measure === 'dollars' ? formatMoney(Math.round(g.dollars)) : units(g.units))

  return (
    <section className={[styles.panel, expanded && styles.panelWide].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <div className={styles.chartHead}>
        <h3 id={titleId} className={styles.chartTitle}>{title}</h3>
        <div className={styles.segmented} role="group" aria-label={`${title}: show`}>
          <button type="button" aria-pressed={measure === 'dollars'} onClick={() => onMeasure('dollars')}>Dollars</button>
          <button type="button" aria-pressed={measure === 'units'} onClick={() => onMeasure('units')}>Units</button>
        </div>
      </div>

      <ol className={styles.bars} onMouseLeave={() => setActive(null)}>
        {shown.map((g, i) => {
          const on = isSelected(g)
          const tipBelow = i < 2
          return (
            <li key={g.name} className={styles.barRow}>
              <button
                type="button"
                className={[styles.barButton, on && styles.barOn, g.name === 'Other' && !expanded && styles.barOther].filter(Boolean).join(' ')}
                aria-pressed={on}
                aria-label={`${g.name}: ${valueText(g)}, ${pct(g.share)} of ${measure === 'dollars' ? 'inventory value' : 'units'}. ${on ? 'Showing its items below; press to clear.' : 'Show its items below.'}`}
                onClick={() => onSelect(on ? null : g)}
                onMouseEnter={() => setActive(g.name)}
                onFocus={() => setActive(g.name)}
                onBlur={() => setActive(null)}
              >
                <span className={styles.barName}>{g.name}</span>
                <span className={styles.barTrack} aria-hidden="true">
                  <span className={styles.bar} style={{ width: `${Math.max(1.5, (g[measure] / max) * 100)}%` }} />
                </span>
                <span className={styles.barValue} aria-hidden="true">{valueText(g)}</span>
                <span className={styles.barShare} aria-hidden="true">{pct(g.share)}</span>
              </button>
              {active === g.name && (
                <div className={[styles.tip, tipBelow && styles.tipBelow].filter(Boolean).join(' ')} aria-hidden="true">
                  <b>{g.name}</b>
                  <span>Inventory value</span><span>{formatMoney(Math.round(g.dollars))}</span>
                  <span>Units on hand</span><span>{g.units.toLocaleString('en-US')}</span>
                  <span>Share of {measure === 'dollars' ? 'value' : 'units'}</span><span>{pct(g.share)}</span>
                  <span>{coverageUnit === 'weeks' ? 'Weeks of supply' : 'Supply'}</span><span>{formatCoverage(g.weeksOfSupply, coverageUnit)}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {groups.length > TOP + 1 && (
        <button type="button" className={styles.textButton} aria-expanded={expanded} onClick={() => onExpand(!expanded)}>
          {expanded ? `Show top ${TOP}` : `View all ${groups.length} ${noun === 'category' ? 'categories' : 'brands'}`}
        </button>
      )}
    </section>
  )
}

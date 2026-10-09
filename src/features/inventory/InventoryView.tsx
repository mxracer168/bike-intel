'use client'

import Link from 'next/link'
import { Fragment, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { average, formatMoney } from '@/domain/language/plain'
import { EvidenceChart } from '@/features/recommendations/EvidenceChart'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import type { HealthMetric, HealthTrend } from '@/features/today/types'
import { Icon } from '@/ui/Icon'
import motion from '@/ui/Motion.module.css'
import { CompositionChart } from './CompositionChart'
import {
  condition, conditionLabel, coverWeeks, demandLabel, demandTrend, formatCoverage, groupBy, inventoryStatus, matchesSearch,
  onHandAt, perWeekAt, sortItems, valueAt, type DemandTrend, type Group, type Sort, type SortKey,
} from './summarize'
import type { Condition, CoverageUnit, InventoryItemView, InventoryLocation, Measure } from './types'
import { SortHeader } from '@/ui/SortHeader'
import { nextSort } from '@/ui/sorting'
import styles from './Inventory.module.css'

const NARROW = '(max-width: 640px)'
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => { const mq = window.matchMedia(NARROW); mq.addEventListener('change', onChange); return () => mq.removeEventListener('change', onChange) },
    () => window.matchMedia(NARROW).matches,
    () => false,
  )
}

type Filters = { brand: string[]; category: string[]; supplier: string | null; condition: Condition | null }
const NONE: Filters = { brand: [], category: [], supplier: null, condition: null }

const money = (n: number) => formatMoney(Math.round(n))
const dateText = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : '–')
const sortLabel: Record<SortKey, string> = { product: 'Product', demand: 'Demand', onHand: 'On hand', onOrder: 'On order', value: 'Value', coverage: 'Coverage' }

/** Columns hidden on phones (the detail row must span only the visible ones). */
const WIDE: SortKey[] = ['demand', 'onOrder']

/** Recent demand as a small line and a word; the line's shape says the direction, so color is never the only cue. */
function DemandMark({ trend }: { trend: DemandTrend }) {
  const points = trend === 'rising' ? '2,11 10,10 18,8 26,6 38,3'
    : trend === 'slowing' ? '2,3 10,4 18,6 26,8 38,11'
    : trend === 'none' ? '' : '2,7 10,7 18,6.5 26,7 38,7'
  return (
    <span className={[styles.demand, styles[`demand_${trend}`]].join(' ')}>
      <svg viewBox="0 0 40 14" width="40" height="14" aria-hidden="true">{points && <polyline points={points} />}</svg>
      {demandLabel[trend]}
    </span>
  )
}

/** An opened item: its sales, the few facts not already in the row, and where it sits. */
function ItemDetail({ item, locationId, locations, coverageUnit }: {
  item: InventoryItemView; locationId: string | null; locations: InventoryLocation[]; coverageUnit: CoverageUnit
}) {
  const multi = locations.length > 1
  const avg = average(item.weeklySales)
  return (
    <div className={[styles.detail, motion.reveal].join(' ')}>
      <div className={styles.detailGrid}>
        <section className={[styles.whitePanel, motion.surface].join(' ')} aria-label="Weekly sales">
          <EvidenceChart weeklySales={item.weeklySales} />
        </section>
        <section className={[styles.whitePanel, styles.factsPanel].join(' ')} aria-label="Details">
          <div>
            <h3 className={styles.factsTitle}>Stock</h3>
            <dl className={styles.facts}>
              <div><dt>Average cost</dt><dd>{formatMoney(item.unitCost)}</dd></div>
              <div><dt>On order</dt><dd>{item.onOrder || 'None'}</dd></div>
              <div><dt>Supplier</dt><dd>{item.supplier}</dd></div>
            </dl>
          </div>
          <div>
            <h3 className={styles.factsTitle}>Activity</h3>
            <dl className={styles.facts}>
              <div><dt>Average weekly sales</dt><dd>{avg > 0 ? avg.toFixed(1) : 'None recently'}</dd></div>
              <div><dt>Last sale</dt><dd>{dateText(item.lastSale)}</dd></div>
              <div><dt>Last receipt</dt><dd>{dateText(item.lastReceipt)}</dd></div>
              <div><dt>Last purchase</dt><dd>{item.lastPurchaseQty ? `${item.lastPurchaseQty} units` : '–'}</dd></div>
            </dl>
          </div>
          {multi && (
            <div>
              <h3 className={styles.factsTitle}>By location</h3>
              <dl className={styles.facts}>
                {item.byLocation.map((l) => (
                  <div key={l.locationId} className={l.locationId === locationId ? styles.here : undefined}>
                    <dt>{l.name}</dt><dd>{l.onHand} · {formatCoverage(coverWeeks(l.onHand, perWeekAt(item, l.locationId)), coverageUnit)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * The Inventory page's working area: how inventory stands in one sentence,
 * its health figures, where the value sits (by brand or by category), and the
 * item table the chart filters. All local state over example data; no
 * forecasting or real calculations.
 */
export function InventoryView({ items, locations, trends, initialQuery = '' }: {
  items: InventoryItemView[]
  locations: InventoryLocation[]
  trends: { weeksOfSupply: HealthTrend; turn: { value: string; trend: HealthTrend } }
  /** Search to start with, e.g. from global search. */
  initialQuery?: string
}) {
  const [locationId, setLocationId] = useState<string | null>(null)
  const [dimension, setDimension] = useState<'brand' | 'category'>('brand')
  const [measure, setMeasure] = useState<Measure>('dollars')
  const [expanded, setExpanded] = useState(false)
  const [filters, setFilters] = useState<Filters>(NONE)
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [sort, setSort] = useState<Sort>({ key: 'value', dir: 'desc' })
  const [coverageUnit, setCoverageUnit] = useState<CoverageUnit>('weeks')
  const [open, setOpen] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const detailRef = useRef<HTMLElement>(null)
  const filtersId = useId()
  const narrow = useNarrow()
  const multi = locations.length > 1

  const stocked = useMemo(() => items.filter((i) => onHandAt(i, locationId) > 0), [items, locationId])
  const groups = useMemo(() => groupBy(stocked, dimension, measure, locationId), [stocked, dimension, measure, locationId])
  const status = useMemo(() => inventoryStatus(items, locationId), [items, locationId])

  const totalValue = stocked.reduce((s, i) => s + valueAt(i, locationId), 0)
  const weeklyValue = stocked.reduce((s, i) => s + perWeekAt(i, locationId) * i.unitCost, 0)
  const everywhere = locationId === null
  const health: HealthMetric[] = [
    { label: 'Inventory value', value: money(totalValue), note: multi && everywhere ? `Across ${locations.length} locations` : undefined },
    { label: 'Weeks of supply', value: `${(totalValue / Math.max(1, weeklyValue)).toFixed(1)} weeks`, trend: everywhere ? trends.weeksOfSupply : undefined },
    { label: 'Inventory turn', value: trends.turn.value, trend: everywhere ? trends.turn.trend : undefined },
  ]

  const rows = useMemo(() => sortItems(stocked.filter((i) =>
    (filters.brand.length === 0 || filters.brand.includes(i.brand))
    && (filters.category.length === 0 || filters.category.includes(i.category))
    && (!filters.supplier || i.supplier === filters.supplier)
    && (!filters.condition || condition(i, locationId) === filters.condition)
    && matchesSearch(i, query)), sort, locationId), [stocked, filters, query, sort, locationId])

  const brands = useMemo(() => [...new Set(items.map((i) => i.brand))].sort(), [items])
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items])
  const suppliers = useMemo(() => [...new Set(items.map((i) => i.supplier))].sort(), [items])

  function selectFromChart(g: Group | null) {
    setFilters((f) => ({ ...f, [dimension]: g ? g.members : [] }))
    setOpen(null)
    if (g) {
      setAnnouncement(`Showing ${g.name} items.`)
      // Charts are navigation: go to the items behind the bar.
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  // The platform standard: descending first, then toggle.
  const toggleSort = (key: SortKey) => setSort((s) => nextSort(s, key))

  const chips: { label: string; clear: () => void }[] = [
    ...(filters.brand.length > 0 ? [{ label: filters.brand.length === 1 ? `Brand: ${filters.brand[0]}` : `Brand: Other (${filters.brand.length})`, clear: () => setFilters((f) => ({ ...f, brand: [] })) }] : []),
    ...(filters.category.length > 0 ? [{ label: filters.category.length === 1 ? `Category: ${filters.category[0]}` : `Category: Other (${filters.category.length})`, clear: () => setFilters((f) => ({ ...f, category: [] })) }] : []),
    ...(filters.supplier ? [{ label: `Supplier: ${filters.supplier}`, clear: () => setFilters((f) => ({ ...f, supplier: null })) }] : []),
    ...(filters.condition ? [{ label: `Condition: ${conditionLabel[filters.condition]}`, clear: () => setFilters((f) => ({ ...f, condition: null })) }] : []),
  ]
  const one = (list: string[]) => (list.length === 1 ? list[0]! : '')
  // The heading names what the table shows when one brand or category is chosen.
  const only = [one(filters.brand), one(filters.category)].filter(Boolean)
  const heading = only.length === 1 && chips.length === 1 ? `${only[0]} inventory` : chips.length > 0 ? 'Filtered inventory' : 'All inventory'
  const shownValue = rows.reduce((s, i) => s + valueAt(i, locationId), 0)
  const columns: SortKey[] = ['product', 'demand', 'onHand', 'onOrder', 'value', 'coverage']

  return (
    <>
      <section className={[styles.status, status.tone === 'caution' && styles.statusCaution].filter(Boolean).join(' ')} aria-label="Inventory status">
        <span className={styles.statusIcon} aria-hidden="true"><Icon name={status.tone === 'good' ? 'check' : 'alert'} size={16} /></span>
        <p className={styles.statusText}>
          <b>{status.title}</b>{' '}
          <span>{status.detail}</span>
        </p>
        {status.excessItems > 0 && <Link href="/inventory/excess" className={styles.statusLink}>Excess inventory<Icon name="chevron-right" size={13} /></Link>}
        {multi && (
          <label className={styles.control}>
            <span className="visually-hidden">Location</span>
            <select value={locationId ?? ''} onChange={(e) => { setLocationId(e.target.value || null); setOpen(null) }}>
              <option value="">All locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
      </section>

      <section aria-labelledby="inventory-health">
        <h2 id="inventory-health" className="visually-hidden">Inventory health</h2>
        <HealthSnapshot metrics={health} variant="panel" />
      </section>

      <section className={styles.zone} aria-labelledby="inventory-composition">
        <div className={styles.zoneHead}>
          <div>
            <h2 id="inventory-composition" className={styles.zoneTitle}>Inventory composition</h2>
            <p className={styles.zoneLead}>Select a {dimension} to see the items behind it.</p>
          </div>
          <div className={styles.switches}>
            <div className={styles.segmented} role="group" aria-label="Group inventory by">
              <button type="button" aria-pressed={dimension === 'brand'} onClick={() => { setDimension('brand'); setExpanded(false) }}>Brand</button>
              <button type="button" aria-pressed={dimension === 'category'} onClick={() => { setDimension('category'); setExpanded(false) }}>Category</button>
            </div>
            <div className={styles.segmented} role="group" aria-label="Measure">
              <button type="button" aria-pressed={measure === 'dollars'} onClick={() => setMeasure('dollars')}>Dollars</button>
              <button type="button" aria-pressed={measure === 'units'} onClick={() => setMeasure('units')}>Units</button>
            </div>
          </div>
        </div>
        <CompositionChart key={dimension} title={`Inventory by ${dimension}`} noun={dimension} groups={groups} measure={measure}
          selected={filters[dimension]} onSelect={selectFromChart} expanded={expanded} onExpand={setExpanded} coverageUnit={coverageUnit} />
      </section>

      <section ref={detailRef} className={[styles.zone, styles.scrollTarget].join(' ')} aria-labelledby="inventory-items">
        <div className={styles.zoneHead}>
          <div>
            <p className={styles.eyebrow}>Items</p>
            <h2 id="inventory-items" className={styles.itemsTitle}>{heading}</h2>
            <p className={styles.zoneLead} role="status">
              {rows.length === stocked.length ? `${rows.length} items` : `${rows.length} of ${stocked.length} items`}
              {rows.length > 0 && ` · ${money(shownValue)} on hand`}
            </p>
          </div>
          {chips.length > 0 && (
            <button type="button" className={styles.clear} onClick={() => setFilters(NONE)}>
              Clear {chips.length === 1 ? 'filter' : 'filters'}<Icon name="close" size={13} />
            </button>
          )}
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Icon name="search" size={15} />
            <span className="visually-hidden">Search inventory</span>
            <input type="search" placeholder="Search this inventory" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className={styles.toolbarEnd}>
            <button type="button" className={styles.control} aria-expanded={showFilters} aria-controls={filtersId}
              onClick={() => setShowFilters((v) => !v)}>
              Filters{chips.length > 0 && <span className={styles.count}> · {chips.length}</span>}
              <Icon name="chevron-down" size={14} />
            </button>
            <label className={styles.control}>
              <span>Coverage</span>
              <select value={coverageUnit} onChange={(e) => setCoverageUnit(e.target.value as CoverageUnit)}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </label>
          </div>
        </div>

        <div id={filtersId} hidden={!showFilters} className={styles.filterPanel}>
          <label><span>Brand</span>
            <select value={one(filters.brand)} onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value ? [e.target.value] : [] }))}>
              <option value="">Any brand</option>{brands.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label><span>Category</span>
            <select value={one(filters.category)} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value ? [e.target.value] : [] }))}>
              <option value="">Any category</option>{categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label><span>Supplier</span>
            <select value={filters.supplier ?? ''} onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value || null }))}>
              <option value="">Any supplier</option>{suppliers.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label><span>Condition</span>
            <select value={filters.condition ?? ''} onChange={(e) => setFilters((f) => ({ ...f, condition: (e.target.value || null) as Condition | null }))}>
              <option value="">Any condition</option>
              {(Object.keys(conditionLabel) as Condition[]).map((c) => <option key={c} value={c}>{conditionLabel[c]}</option>)}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className={styles.chips}>
            {chips.map((c) => (
              <button key={c.label} type="button" className={styles.chip} onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
                {c.label}<Icon name="close" size={12} />
              </button>
            ))}
          </div>
        )}

        <div className={styles.tableCard}>
          <table className={styles.table} aria-label="Inventory items">
            <thead>
              <tr>
                {columns.map((k) => (
                  <SortHeader key={k} sortKey={k} sort={sort} onSort={toggleSort} numeric={k !== 'product' && k !== 'demand'}
                    className={[k !== 'product' && k !== 'demand' && styles.num, styles[`c_${k}`], WIDE.includes(k) && styles.wide].filter(Boolean).join(' ') || undefined}>
                    {sortLabel[k]}
                  </SortHeader>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const isOpen = open === item.id
                const here = onHandAt(item, locationId)
                return (
                  <Fragment key={item.id}>
                    <tr className={[styles.row, isOpen && styles.openRow].filter(Boolean).join(' ')} onClick={() => setOpen(isOpen ? null : item.id)}>
                      <th scope="row" className={styles.product}>
                        <button type="button" className={styles.lineButton} aria-expanded={isOpen} aria-controls={`${item.id}-detail`}
                          onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : item.id) }}>
                          <span className={styles.caret} aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
                          <span className={styles.lineText}>
                            <span className={styles.lineName}>{item.product}{item.variant && <>{' '}<span className={styles.variant}>{item.variant}</span></>}</span>
                            <span className={styles.lineSub}>{item.brand} · {item.category}</span>
                          </span>
                        </button>
                      </th>
                      <td className={styles.wide}><DemandMark trend={demandTrend(item)} /></td>
                      <td className={styles.num}>{here.toLocaleString('en-US')}</td>
                      <td className={[styles.num, styles.wide].join(' ')}>{item.onOrder ? item.onOrder.toLocaleString('en-US') : <span className={styles.none}>–</span>}</td>
                      <td className={[styles.num, styles.value].join(' ')}>{money(valueAt(item, locationId))}</td>
                      <td className={[styles.num, styles.coverage].join(' ')}>{formatCoverage(coverWeeks(here, perWeekAt(item, locationId)), coverageUnit)}</td>
                    </tr>
                    {isOpen && (
                      <tr className={styles.detailRow} id={`${item.id}-detail`}>
                        <td colSpan={narrow ? columns.length - WIDE.length : columns.length}>
                          <ItemDetail item={item} locationId={locationId} locations={locations} coverageUnit={coverageUnit} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No matching items</p>
              <p>Try clearing the chart selection or changing your search. <button type="button" className={styles.textButton} onClick={() => { setFilters(NONE); setQuery('') }}>Clear search and filters</button></p>
            </div>
          )}
        </div>
      </section>
      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
    </>
  )
}

'use client'

import { Fragment, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { average, formatMoney } from '@/domain/language/plain'
import { EvidenceChart } from '@/features/recommendations/EvidenceChart'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import type { HealthMetric, HealthTrend } from '@/features/today/types'
import { Icon } from '@/ui/Icon'
import { CompositionChart } from './CompositionChart'
import {
  condition, conditionLabel, coverWeeks, formatCoverage, groupBy, matchesSearch, onHandAt, perWeekAt, sortItems, valueAt,
  type Group, type Sort, type SortKey,
} from './summarize'
import type { Condition, CoverageUnit, InventoryItemView, InventoryLocation, Measure } from './types'
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
const sortLabel: Record<SortKey, string> = { product: 'Product', onHand: 'On hand', value: 'Value', coverage: 'Coverage' }
/** The first press of a numeric column shows the largest first; Product and Coverage start from the top of the alphabet / soonest to run out. */
const firstDir: Record<SortKey, Sort['dir']> = { product: 'asc', onHand: 'desc', value: 'desc', coverage: 'asc' }

/** An opened item: its sales, the few facts not already in the row, and where it sits. */
function ItemDetail({ item, locationId, locations, coverageUnit }: {
  item: InventoryItemView; locationId: string | null; locations: InventoryLocation[]; coverageUnit: CoverageUnit
}) {
  const multi = locations.length > 1
  const avg = average(item.weeklySales)
  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <section className={styles.whitePanel} aria-label="Weekly sales">
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
 * The Inventory page's working area: health cards, where the value sits (by
 * brand and by category), and the item table the charts filter. All local
 * state over example data; no forecasting or real calculations.
 */
export function InventoryView({ items, locations, trends }: {
  items: InventoryItemView[]
  locations: InventoryLocation[]
  trends: { weeksOfSupply: HealthTrend; turn: { value: string; trend: HealthTrend } }
}) {
  const [locationId, setLocationId] = useState<string | null>(null)
  const [measure, setMeasure] = useState<{ brand: Measure; category: Measure }>({ brand: 'dollars', category: 'dollars' })
  const [expanded, setExpanded] = useState<'brand' | 'category' | null>(null)
  const [filters, setFilters] = useState<Filters>(NONE)
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'value', dir: 'desc' })
  const [coverageUnit, setCoverageUnit] = useState<CoverageUnit>('weeks')
  const [open, setOpen] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const detailRef = useRef<HTMLElement>(null)
  const filtersId = useId()
  const narrow = useNarrow()
  const multi = locations.length > 1

  const stocked = useMemo(() => items.filter((i) => onHandAt(i, locationId) > 0), [items, locationId])
  const byBrand = useMemo(() => groupBy(stocked, 'brand', measure.brand, locationId), [stocked, measure.brand, locationId])
  const byCategory = useMemo(() => groupBy(stocked, 'category', measure.category, locationId), [stocked, measure.category, locationId])

  const totalValue = stocked.reduce((s, i) => s + valueAt(i, locationId), 0)
  const weeklyValue = stocked.reduce((s, i) => s + perWeekAt(i, locationId) * i.unitCost, 0)
  const everywhere = locationId === null
  const health: HealthMetric[] = [
    { label: 'Inventory value', value: money(totalValue) },
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

  function selectFromChart(key: 'brand' | 'category', g: Group | null) {
    setFilters((f) => ({ ...f, [key]: g ? g.members : [] }))
    setOpen(null)
    if (g) {
      setAnnouncement(`Showing ${g.name} items.`)
      // Charts are navigation: go to the items behind the bar.
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: firstDir[key] }))
  }

  const chips: { label: string; clear: () => void }[] = [
    ...(filters.brand.length > 0 ? [{ label: filters.brand.length === 1 ? `Brand: ${filters.brand[0]}` : `Brand: Other (${filters.brand.length})`, clear: () => setFilters((f) => ({ ...f, brand: [] })) }] : []),
    ...(filters.category.length > 0 ? [{ label: filters.category.length === 1 ? `Category: ${filters.category[0]}` : `Category: Other (${filters.category.length})`, clear: () => setFilters((f) => ({ ...f, category: [] })) }] : []),
    ...(filters.supplier ? [{ label: `Supplier: ${filters.supplier}`, clear: () => setFilters((f) => ({ ...f, supplier: null })) }] : []),
    ...(filters.condition ? [{ label: `Condition: ${conditionLabel[filters.condition]}`, clear: () => setFilters((f) => ({ ...f, condition: null })) }] : []),
  ]
  const one = (list: string[]) => (list.length === 1 ? list[0]! : '')

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Inventory</h1>
        {multi && (
          <label className={styles.control}>
            <span className="visually-hidden">Location</span>
            <select value={locationId ?? ''} onChange={(e) => { setLocationId(e.target.value || null); setOpen(null) }}>
              <option value="">All locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
      </header>

      <div className={styles.zones}>
        <section aria-labelledby="inventory-health">
          <h2 id="inventory-health" className="visually-hidden">Inventory health</h2>
          <HealthSnapshot metrics={health} />
        </section>

        <section className={styles.zone} aria-labelledby="inventory-composition">
          <h2 id="inventory-composition" className="visually-hidden">Inventory composition</h2>
          <div className={styles.charts}>
            <CompositionChart title="Inventory by brand" noun="brand" groups={byBrand} measure={measure.brand}
              onMeasure={(m) => setMeasure((s) => ({ ...s, brand: m }))} selected={filters.brand}
              onSelect={(g) => selectFromChart('brand', g)} expanded={expanded === 'brand'}
              onExpand={(e) => setExpanded(e ? 'brand' : null)} coverageUnit={coverageUnit} />
            <CompositionChart title="Inventory by category" noun="category" groups={byCategory} measure={measure.category}
              onMeasure={(m) => setMeasure((s) => ({ ...s, category: m }))} selected={filters.category}
              onSelect={(g) => selectFromChart('category', g)} expanded={expanded === 'category'}
              onExpand={(e) => setExpanded(e ? 'category' : null)} coverageUnit={coverageUnit} />
          </div>
        </section>

        <section ref={detailRef} className={[styles.zone, styles.scrollTarget].join(' ')} aria-labelledby="inventory-items">
          <h2 id="inventory-items" className={styles.zoneTitle}>Items</h2>

          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon name="search" size={15} />
              <span className="visually-hidden">Search inventory</span>
              <input type="search" placeholder="Search inventory…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="button" className={styles.control} aria-expanded={showFilters} aria-controls={filtersId}
              onClick={() => setShowFilters((v) => !v)}>
              Filters{chips.length > 0 && <span className={styles.count}> · {chips.length}</span>}
              <Icon name="chevron-down" size={14} />
            </button>
            <label className={styles.control}>
              <span>Coverage:</span>
              <select value={coverageUnit} onChange={(e) => setCoverageUnit(e.target.value as CoverageUnit)}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </label>
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
                <option value="">Any supplier</option>{suppliers.map((s) => <option key={s}>{s}</option>)}
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
              {chips.length > 1 && <button type="button" className={styles.textButton} onClick={() => setFilters(NONE)}>Clear all</button>}
            </div>
          )}

          <p className={styles.resultCount} role="status">
            {rows.length === stocked.length ? `${rows.length} items` : `${rows.length} of ${stocked.length} items`}
            {rows.length > 0 && rows.length !== stocked.length && ` · ${money(rows.reduce((s, i) => s + valueAt(i, locationId), 0))}`}
          </p>

          <table className={styles.table} aria-label="Inventory items">
            <thead>
              <tr>
                <th scope="col" className={[styles.cGo, styles.wide].join(' ')}><span className="visually-hidden">Open</span></th>
                {(['product', 'onHand', 'value', 'coverage'] as SortKey[]).map((k) => (
                  <th key={k} scope="col" className={k === 'product' ? undefined : [styles.num, styles[`c_${k}`]].join(' ')}
                    aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    <button type="button" className={styles.sortButton} onClick={() => toggleSort(k)}>
                      {sortLabel[k]}
                      <span className={styles.sortMark} aria-hidden="true">{sort.key === k ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
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
                      <td className={[styles.go, styles.wide].join(' ')} aria-hidden="true"><Icon name="chevron-right" size={14} /></td>
                      <th scope="row" className={styles.product}>
                        <button type="button" className={styles.lineButton} aria-expanded={isOpen} aria-controls={`${item.id}-detail`}
                          onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : item.id) }}>
                          {item.product}{item.variant && <>{' '}<span className={styles.variant}>{item.variant}</span></>}
                        </button>
                      </th>
                      <td className={styles.num}>{here.toLocaleString('en-US')}</td>
                      <td className={styles.num}>{money(valueAt(item, locationId))}</td>
                      <td className={[styles.num, styles.coverage].join(' ')}>{formatCoverage(coverWeeks(here, perWeekAt(item, locationId)), coverageUnit)}</td>
                    </tr>
                    {isOpen && (
                      <tr className={styles.detailRow} id={`${item.id}-detail`}>
                        <td colSpan={narrow ? 4 : 5}>
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
            <p className={styles.empty}>
              Nothing matches. <button type="button" className={styles.textButton} onClick={() => { setFilters(NONE); setQuery('') }}>Clear search and filters</button>
            </p>
          )}
        </section>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
    </>
  )
}

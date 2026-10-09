'use client'

import { Fragment, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { describeWeeklyRate, formatMoney } from '@/domain/language/plain'
import { PriceVsMarket } from '@/features/network/NetworkBits'
import { describeComparison, unitPrice, WMV_HELP, WMV_TERM } from '@/features/network/pricing'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import type { HealthMetric } from '@/features/today/types'
import { Icon } from '@/ui/Icon'
import { InfoTip } from '@/ui/InfoTip'
import {
  EXCESS_RULE_OPTIONS, excessRows, excessSortLabel, excessSortPreset, excessViewLabel, matchesView, presetFor, sortExcess, summarizeExcess,
  type ExcessRow, type ExcessSort, type ExcessSortKey, type ExcessView as ExcessViewKey, type NetworkOffer,
} from './excess'
import { matchesSearch } from './summarize'
import type { InventoryItemView } from './types'
import inv from './Inventory.module.css'
import { SortHeader } from '@/ui/SortHeader'
import { nextSort, type SortState } from '@/ui/sorting'
import styles from './Excess.module.css'

const PAGE = 60

/** Columns hide as the screen narrows; a detail row must span only the visible ones. */
function useMatches(query: string) {
  return useSyncExternalStore(
    (onChange) => { const mq = window.matchMedia(query); mq.addEventListener('change', onChange); return () => mq.removeEventListener('change', onChange) },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** "+$18.00", "−$6.00"; a value that rounds to zero carries no sign. */
const signed = (n: number, text: string) => (Math.abs(n) < 0.005 ? text : n > 0 ? `+${text}` : `−${text}`)
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const weeksText = (w: number | null) => (w === null ? 'Not selling' : `${Math.round(w)} weeks`)

/**
 * An opened excess line, in two cards. Left, why it's excess: the facts
 * behind the rule. Right, the retailer network: whether other retailers can
 * see it (a switch), what it's worth there against average cost, and the
 * network price (Wholesale Market Value unless changed here). Exceptions
 * only: nothing needs doing to share it.
 */
function ExcessDetail({ row, ruleWeeks, onPrice, onExclude }: {
  row: ExcessRow
  ruleWeeks: number
  onPrice: (price: number | undefined) => void
  onExclude: (excluded: boolean) => void
}) {
  const [draft, setDraft] = useState(row.networkPrice.toFixed(2))
  const [problem, setProblem] = useState<string | null>(null)
  const inputId = useId()
  const units = `${row.excessQty} excess ${row.excessQty === 1 ? 'unit' : 'units'}`
  const compare = describeComparison(row.comparison)
  const shared = !row.excluded
  const total = row.gainPerUnit * row.excessQty
  const loss = row.gainPerUnit < -0.005

  function save() {
    const value = Number(draft.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return setProblem('Enter a price per unit, like 92.50.')
    setProblem(null)
    onPrice(Math.round(value * 100) / 100)
  }

  return (
    <div className={styles.detail}>
      <section className={styles.card} aria-labelledby={`${inputId}-why`}>
        <div>
          <h3 id={`${inputId}-why`} className={styles.cardTitle}>Why this inventory is excess</h3>
          <p className={styles.cardText}>
            Coverage is over your {ruleWeeks}-week rule. Only the units above it count as excess.
          </p>
        </div>
        <dl className={styles.facts}>
          <div><dt>Average cost</dt><dd>{unitPrice(row.item.unitCost)}</dd></div>
          <div><dt>Excess units</dt><dd>{row.excessQty}</dd></div>
          <div><dt>Excess value</dt><dd>{unitPrice(row.excessCost)}</dd></div>
          <div><dt>Current coverage</dt><dd>{weeksText(row.weeksOfSupply)}</dd></div>
          <div><dt>Selling</dt><dd>{capitalize(describeWeeklyRate(row.item.perWeek))}</dd></div>
          <div><dt>Supplier</dt><dd>{row.item.supplier}</dd></div>
        </dl>
        <p className={styles.callout}>
          {row.weeksOfSupply === null
            ? 'No recent sales'
            : `${Math.max(0, Math.round(row.weeksOfSupply - ruleWeeks))} weeks above your excess rule · ${row.item.onHand} on hand`}
        </p>
      </section>

      <section className={[styles.card, !shared && styles.cardOff].filter(Boolean).join(' ')} aria-labelledby={`${inputId}-net`}>
        <div className={styles.cardHead}>
          <div>
            <h3 id={`${inputId}-net`} className={styles.cardTitle}>Retailer network</h3>
            <p className={styles.cardText}>
              {shared
                ? `Other retailers can see ${units} at ${unitPrice(row.networkPrice)} each. Your stock levels, sales and cost stay private.`
                : 'Excluded. Other retailers can’t see it; it stays on this list as excess.'}
            </p>
          </div>
          <button type="button" role="switch" aria-checked={shared} className={styles.switch}
            aria-label={`Offer ${row.item.product} to other retailers`} onClick={() => onExclude(shared)}>
            <span aria-hidden="true" />
          </button>
        </div>

        <dl className={styles.money3}>
          <div><dt>{WMV_TERM}</dt><dd>{unitPrice(row.wholesaleMarketValue)}</dd></div>
          <div>
            <dt>Gain / loss per unit</dt>
            <dd className={loss ? styles.loss : styles.gainText}>
              {signed(row.gainPerUnit, unitPrice(Math.abs(row.gainPerUnit)))}
              <span className={styles.pct}>{signed(Math.round(row.gainPercent), `${Math.abs(Math.round(row.gainPercent))}%`)}</span>
            </dd>
          </div>
          <div>
            <dt>Total if all sell</dt>
            <dd className={total < -0.005 ? styles.loss : styles.gainText}>{signed(total, unitPrice(Math.abs(total)))}</dd>
          </div>
        </dl>

        <form className={styles.priceForm} onSubmit={(e) => { e.preventDefault(); save() }}>
          <label htmlFor={inputId} className={styles.priceLabel}>Your network price</label>
          <span className={styles.priceRow}>
            <span className={styles.money}>
              <span aria-hidden="true">$</span>
              <input id={inputId} inputMode="decimal" value={draft} onChange={(e) => { setDraft(e.target.value); setProblem(null) }}
                aria-invalid={problem ? true : undefined} aria-describedby={`${inputId}-note`} />
            </span>
            <button type="submit" className={styles.dark}>Save price</button>
            {row.overridden && (
              <button type="button" className={styles.textButton}
                onClick={() => { onPrice(undefined); setDraft(row.wholesaleMarketValue.toFixed(2)) }}>
                Use {WMV_TERM}
              </button>
            )}
          </span>
        </form>
        {problem && <p className={styles.problem} role="alert">{problem}</p>}
        <p id={`${inputId}-note`} className={styles.cardText}>
          {row.overridden ? 'You set this price.' : `Set to ${WMV_TERM}; it follows that value until you change it.`}
          {compare ? <> <PriceVsMarket comparison={row.comparison} />.</> : null}
          {' '}Selling all {units} brings in {formatMoney(Math.round(row.recovery))}.
        </p>
      </section>
    </div>
  )
}

/**
 * Excess inventory: what the system thinks is excess under the retailer's
 * rule, why, and what another retailer would pay. Opted-in excess is offered
 * at Wholesale Market Value automatically; the retailer manages only
 * exceptions (a different price, or excluding an item). Changes here are
 * held on the page; nothing is saved yet.
 */
export function ExcessView({ items, offers: initialOffers, initialRuleWeeks }: {
  items: InventoryItemView[]
  offers: Record<string, NetworkOffer>
  initialRuleWeeks: number
}) {
  const [ruleWeeks, setRuleWeeks] = useState(initialRuleWeeks)
  const [editingRule, setEditingRule] = useState(false)
  const [ruleDraft, setRuleDraft] = useState(initialRuleWeeks)
  const [offers, setOffers] = useState(initialOffers)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ExcessViewKey>('all')
  const [brand, setBrand] = useState('')
  // One sort for the table: set by a column header or by a ready-made sort.
  const [sort, setSort] = useState<SortState<ExcessSortKey>>(excessSortPreset.investment)
  const onSort = (key: ExcessSortKey) => setSort((s) => nextSort(s, key))
  const preset = presetFor(sort)
  const [open, setOpen] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const ruleId = useId()
  const narrow = useMatches('(max-width: 640px)')
  const columns = narrow ? 3 : 5

  const all = useMemo(() => excessRows(items, ruleWeeks, offers), [items, ruleWeeks, offers])
  const summary = summarizeExcess(all)
  const brands = useMemo(() => [...new Set(all.map((r) => r.item.brand))].sort(), [all])
  const rows = useMemo(() => sortExcess(all.filter((r) =>
    matchesView(r, view) && (!brand || r.item.brand === brand) && matchesSearch(r.item, query)), sort), [all, view, brand, query, sort])
  const filtered = view !== 'all' || brand !== '' || query.trim() !== ''

  const update = (id: string, change: Partial<NetworkOffer>) =>
    setOffers((o) => ({ ...o, [id]: { ...o[id]!, ...change } }))

  const figures: HealthMetric[] = [
    { label: 'Excess items', value: summary.skus.toLocaleString('en-US'), note: `Over ${ruleWeeks} weeks of supply` },
    { label: 'Excess units', value: summary.units.toLocaleString('en-US'), note: 'Above the rule' },
    { label: 'Cost tied up', value: formatMoney(Math.round(summary.cost)), note: 'At average cost' },
    { label: 'At network prices', value: formatMoney(Math.round(summary.recovery)), note: `${summary.shared} of ${summary.skus} items shared` },
  ]

  return (
    <>
      <section className={styles.rule} aria-labelledby="excess-title">
        <h2 id="excess-title" className="visually-hidden">Excess inventory</h2>
        {editingRule ? (
          <form className={styles.ruleForm} onSubmit={(e) => { e.preventDefault(); setRuleWeeks(ruleDraft); setEditingRule(false); setOpen(null) }}>
            <label htmlFor={ruleId}>Flag inventory with more than</label>
            <select id={ruleId} className={styles.select} value={ruleDraft} onChange={(e) => setRuleDraft(Number(e.target.value))}>
              {EXCESS_RULE_OPTIONS.map((w) => <option key={w} value={w}>{w} weeks</option>)}
            </select>
            <span>of projected supply.</span>
            <button type="submit" className={styles.dark}>Apply</button>
            <button type="button" className={styles.textButton} onClick={() => { setRuleDraft(ruleWeeks); setEditingRule(false) }}>Cancel</button>
          </form>
        ) : (
          <>
            <div className={styles.ruleText}>
              <p className={styles.ruleTitle}>Inventory with more than {ruleWeeks} weeks of projected supply is flagged as excess.</p>
              <p className={styles.policy}>
                Excess is offered privately to other retailers at {WMV_TERM}
                <InfoTip term={WMV_TERM}>{`${WMV_TERM}: ${WMV_HELP}`}</InfoTip>
                {' '}unless you change a price or exclude an item.
              </p>
            </div>
            <button type="button" className={styles.textButton} onClick={() => setEditingRule(true)}>Change excess rule</button>
          </>
        )}
      </section>

      {all.length === 0 ? (
        <p className={styles.empty}>
          Nothing is over {ruleWeeks} weeks of supply right now. When something is, it shows here with what another retailer would pay for it.
        </p>
      ) : (
        <>
          <section aria-labelledby="excess-glance">
            <h2 id="excess-glance" className="visually-hidden">Excess at a glance</h2>
            <HealthSnapshot metrics={figures} variant="panel" />
          </section>

          <section className={styles.items} aria-labelledby="excess-items">
            <h2 id="excess-items" className="visually-hidden">Excess items</h2>
            <div className={styles.toolbar}>
              <label className={[inv.search, styles.search].join(' ')}>
                <Icon name="search" size={15} />
                <span className="visually-hidden">Search excess inventory</span>
                <input type="search" placeholder="Search excess inventory" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }} />
              </label>
              <div className={styles.controls}>
                <label className={inv.control}>
                  <span className="visually-hidden">Show</span>
                  <select value={view} onChange={(e) => { setView(e.target.value as ExcessViewKey); setShown(PAGE) }}>
                    {(Object.keys(excessViewLabel) as ExcessViewKey[]).map((k) => <option key={k} value={k}>{excessViewLabel[k]}</option>)}
                  </select>
                </label>
                <label className={inv.control}>
                  <span className="visually-hidden">Brand</span>
                  <select value={brand} onChange={(e) => { setBrand(e.target.value); setShown(PAGE) }}>
                    <option value="">All brands</option>
                    {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label className={inv.control}>
                  <span className="visually-hidden">Sort</span>
                  <select value={preset ?? ''} onChange={(e) => e.target.value && setSort(excessSortPreset[e.target.value as ExcessSort])}>
                    {!preset && <option value="">Sorted by column</option>}
                    {(Object.keys(excessSortLabel) as ExcessSort[]).map((k) => <option key={k} value={k}>{excessSortLabel[k]}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {filtered && <p className={styles.count} role="status">{rows.length} of {all.length} excess items</p>}

            <div className={inv.tableCard}>
              {rows.length === 0 ? <p className={inv.empty}>No excess items match.</p> : (
                <table className={[inv.table, styles.table].join(' ')} aria-label="Excess inventory">
                  <thead>
                    <tr>
                      <SortHeader sortKey="product" sort={sort} onSort={onSort}>Product</SortHeader>
                      <SortHeader sortKey="onHand" sort={sort} onSort={onSort} numeric className={[inv.num, styles.cQty, styles.wide].join(' ')}>On hand</SortHeader>
                      <SortHeader sortKey="excess" sort={sort} onSort={onSort} numeric className={[inv.num, styles.cQty].join(' ')}>Excess</SortHeader>
                      <SortHeader sortKey="weeks" sort={sort} onSort={onSort} numeric className={[inv.num, styles.cWeeks, styles.wide].join(' ')}>Coverage</SortHeader>
                      <SortHeader sortKey="tiedUp" sort={sort} onSort={onSort} numeric className={[inv.num, styles.cMoney].join(' ')}>Excess value</SortHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, shown).map((r) => {
                      const isOpen = open === r.item.id
                      const toggle = () => setOpen(isOpen ? null : r.item.id)
                      return (
                        <Fragment key={r.item.id}>
                          <tr className={[inv.row, isOpen && inv.openRow, r.excluded && styles.excludedRow].filter(Boolean).join(' ')} onClick={toggle}>
                            <th scope="row" className={inv.product}>
                              <button type="button" className={inv.lineButton} aria-expanded={isOpen}
                                aria-controls={`${r.item.id}-excess`} onClick={(e) => { e.stopPropagation(); toggle() }}>
                                <span className={inv.caret} aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
                                <span className={inv.lineText}>
                                  <span className={inv.lineName}>{r.item.product}</span>
                                  <span className={inv.lineSub}>
                                    {[r.item.variant, r.item.identifiers[0]].filter(Boolean).join(' · ')}
                                    {r.excluded && <span className={styles.excludedTag}> · Not shared</span>}
                                  </span>
                                </span>
                              </button>
                            </th>
                            <td className={[inv.num, styles.wide].join(' ')}>{r.item.onHand}</td>
                            <td className={inv.num}>{r.excessQty}</td>
                            <td className={[inv.num, styles.wide].join(' ')}>{weeksText(r.weeksOfSupply)}</td>
                            <td className={[inv.num, styles.value].join(' ')}>{unitPrice(r.excessCost)}</td>
                          </tr>
                          {isOpen && (
                            <tr className={inv.detailRow} id={`${r.item.id}-excess`}>
                              <td colSpan={columns}>
                                <ExcessDetail row={r} ruleWeeks={ruleWeeks}
                                  onPrice={(price) => update(r.item.id, { priceOverride: price })}
                                  onExclude={(excluded) => update(r.item.id, { excluded })} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {rows.length > shown && (
              <button type="button" className={inv.textButton} onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}
              </button>
            )}
          </section>
        </>
      )}
    </>
  )
}

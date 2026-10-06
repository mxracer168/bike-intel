'use client'

import { Fragment, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { describeWeeklyRate, formatMoney } from '@/domain/language/plain'
import { PriceVsMarket } from '@/features/network/NetworkBits'
import { describeComparison, unitPrice, WMV_HELP, WMV_TERM } from '@/features/network/pricing'
import { Icon } from '@/ui/Icon'
import { InfoTip } from '@/ui/InfoTip'
import {
  EXCESS_RULE_OPTIONS, excessRows, excessSortLabel, excessViewLabel, matchesView, sortExcess, summarizeExcess,
  type ExcessRow, type ExcessSort, type ExcessView as ExcessViewKey, type NetworkOffer,
} from './excess'
import { matchesSearch } from './summarize'
import type { InventoryItemView } from './types'
import inv from './Inventory.module.css'
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
const weeksText = (w: number | null) => (w === null ? 'Not selling' : `${Math.round(w)} wk`)

/** Gain or loss against average cost, per unit and as a share of cost. */
function GainLoss({ row }: { row: ExcessRow }) {
  const loss = row.gainPerUnit < -0.005
  return (
    <span className={[styles.gain, loss && styles.loss].filter(Boolean).join(' ')}>
      <span>{signed(row.gainPerUnit, unitPrice(Math.abs(row.gainPerUnit)))}</span>
      <span className={styles.sub}>{signed(Math.round(row.gainPercent), `${Math.abs(Math.round(row.gainPercent))}%`)}</span>
    </span>
  )
}

/**
 * An opened excess line: the network price (Wholesale Market Value unless
 * changed here), what that means against average cost, and whether other
 * retailers can see it. Exceptions only: nothing needs doing to share it.
 */
function ExcessDetail({ row, onPrice, onExclude }: {
  row: ExcessRow
  onPrice: (price: number | undefined) => void
  onExclude: (excluded: boolean) => void
}) {
  const [draft, setDraft] = useState(row.networkPrice.toFixed(2))
  const [problem, setProblem] = useState<string | null>(null)
  const inputId = useId()
  const units = `${row.excessQty} excess ${row.excessQty === 1 ? 'unit' : 'units'}`
  const compare = describeComparison(row.comparison)

  function save() {
    const value = Number(draft.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return setProblem('Enter a price per unit, like 92.50.')
    setProblem(null)
    onPrice(Math.round(value * 100) / 100)
  }

  return (
    <div className={styles.detail}>
      <section className={styles.detailBlock} aria-label="Network price">
        <h3 className={styles.detailTitle}>Network price</h3>
        <p className={styles.detailText}>
          {row.overridden ? 'You set this price.' : `Set to ${WMV_TERM}. It follows that value until you change it.`}
          {' '}{WMV_TERM}: <b>{unitPrice(row.wholesaleMarketValue)}</b>.
        </p>
        <form className={styles.priceForm} onSubmit={(e) => { e.preventDefault(); save() }}>
          <label htmlFor={inputId} className="visually-hidden">Network price per unit for {row.item.product}</label>
          <span className={styles.money}>
            <span aria-hidden="true">$</span>
            <input id={inputId} inputMode="decimal" value={draft} onChange={(e) => { setDraft(e.target.value); setProblem(null) }}
              aria-invalid={problem ? true : undefined} />
          </span>
          <button type="submit" className={styles.secondary}>Save price</button>
          {row.overridden && (
            <button type="button" className={styles.textButton}
              onClick={() => { onPrice(undefined); setDraft(row.wholesaleMarketValue.toFixed(2)) }}>
              Use {WMV_TERM}
            </button>
          )}
        </form>
        {problem && <p className={styles.problem} role="alert">{problem}</p>}
        <p className={styles.detailText}>
          {compare ? <><PriceVsMarket comparison={row.comparison} />. </> : null}
          Against your average cost of {unitPrice(row.item.unitCost)}, that’s {row.gainPerUnit >= 0 ? 'a gain' : 'a loss'} of{' '}
          <b>{unitPrice(Math.abs(row.gainPerUnit))}</b> per unit ({Math.abs(Math.round(row.gainPercent))}%). Selling all {units}{' '}
          brings in {formatMoney(Math.round(row.recovery))}.
        </p>
      </section>

      <section className={styles.detailBlock} aria-label="Other retailers">
        <h3 className={styles.detailTitle}>Other retailers</h3>
        {row.excluded ? (
          <p className={styles.detailText}>Excluded. Other retailers can’t see it; it stays on this list as excess.</p>
        ) : (
          <p className={styles.detailText}>
            Other retailers can see {units} at {unitPrice(row.networkPrice)} each. Your stock levels, sales and cost stay private.
          </p>
        )}
        <button type="button" className={styles.secondary} onClick={() => onExclude(!row.excluded)}>
          {row.excluded ? 'Make available again' : 'Exclude from network'}
        </button>
        <dl className={styles.facts}>
          <div><dt>On hand</dt><dd>{row.item.onHand}</dd></div>
          <div><dt>Selling</dt><dd>{capitalize(describeWeeklyRate(row.item.perWeek))}</dd></div>
          <div><dt>Weeks of supply</dt><dd>{row.weeksOfSupply === null ? '—' : Math.round(row.weeksOfSupply)}</dd></div>
          <div><dt>Supplier</dt><dd>{row.item.supplier}</dd></div>
        </dl>
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
  const [sort, setSort] = useState<ExcessSort>('investment')
  const [open, setOpen] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const ruleId = useId()
  const narrow = useMatches('(max-width: 760px)')
  const mid = useMatches('(max-width: 960px)')
  const medium = useMatches('(max-width: 1100px)')
  const columns = narrow ? 4 : mid ? 7 : medium ? 9 : 10

  const all = useMemo(() => excessRows(items, ruleWeeks, offers), [items, ruleWeeks, offers])
  const summary = summarizeExcess(all)
  const brands = useMemo(() => [...new Set(all.map((r) => r.item.brand))].sort(), [all])
  const rows = useMemo(() => sortExcess(all.filter((r) =>
    matchesView(r, view) && (!brand || r.item.brand === brand) && matchesSearch(r.item, query)), sort), [all, view, brand, query, sort])
  const filtered = view !== 'all' || brand !== '' || query.trim() !== ''

  const update = (id: string, change: Partial<NetworkOffer>) =>
    setOffers((o) => ({ ...o, [id]: { ...o[id]!, ...change } }))

  return (
    <div className={inv.zones}>
      <section className={styles.intro} aria-labelledby="excess-title">
        <h2 id="excess-title" className="visually-hidden">Excess inventory</h2>
        {editingRule ? (
          <form className={styles.ruleForm} onSubmit={(e) => { e.preventDefault(); setRuleWeeks(ruleDraft); setEditingRule(false); setOpen(null) }}>
            <label htmlFor={ruleId}>Flag inventory with more than</label>
            <select id={ruleId} className={styles.select} value={ruleDraft} onChange={(e) => setRuleDraft(Number(e.target.value))}>
              {EXCESS_RULE_OPTIONS.map((w) => <option key={w} value={w}>{w} weeks</option>)}
            </select>
            <span>of projected supply.</span>
            <button type="submit" className={styles.secondary}>Apply</button>
            <button type="button" className={styles.textButton} onClick={() => { setRuleDraft(ruleWeeks); setEditingRule(false) }}>Cancel</button>
          </form>
        ) : (
          <p className={styles.rule}>
            We currently flag inventory with more than <b>{ruleWeeks} weeks</b> of projected supply.{' '}
            <button type="button" className={styles.textButton} onClick={() => setEditingRule(true)}>Change rule</button>
          </p>
        )}
        <p className={styles.policy}>
          Excess is offered to other retailers at {WMV_TERM}
          <InfoTip term={WMV_TERM}>{`${WMV_TERM}: ${WMV_HELP}`}</InfoTip>
          {' '}unless you change a price or exclude an item.
        </p>
      </section>

      {all.length === 0 ? (
        <p className={styles.empty}>
          Nothing is over {ruleWeeks} weeks of supply right now. When something is, it shows here with what another retailer would pay for it.
        </p>
      ) : (
        <>
          <dl className={styles.summary} aria-label="Excess at a glance">
            <div><dt>Excess items</dt><dd>{summary.skus.toLocaleString('en-US')}</dd></div>
            <div><dt>Excess units</dt><dd>{summary.units.toLocaleString('en-US')}</dd></div>
            <div><dt>Cost tied up</dt><dd>{formatMoney(Math.round(summary.cost))}</dd></div>
            <div><dt>At network prices</dt><dd>{formatMoney(Math.round(summary.recovery))}
              {summary.shared < summary.skus && <span className={styles.sub}> {summary.shared} of {summary.skus} items shared</span>}
            </dd></div>
          </dl>

          <section className={inv.zone} aria-labelledby="excess-items">
            <h2 id="excess-items" className="visually-hidden">Excess items</h2>
            <div className={inv.toolbar}>
              <label className={inv.search}>
                <Icon name="search" size={15} />
                <span className="visually-hidden">Search excess inventory</span>
                <input type="search" placeholder="Search excess…" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }} />
              </label>
              <label className={inv.control}>
                <span className={styles.controlLabel}>Show</span>
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
                <span className={styles.controlLabel}>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as ExcessSort)}>
                  {(Object.keys(excessSortLabel) as ExcessSort[]).map((k) => <option key={k} value={k}>{excessSortLabel[k]}</option>)}
                </select>
              </label>
            </div>
            {filtered && <p className={inv.resultCount} role="status">{rows.length} of {all.length} excess items</p>}

            {rows.length === 0 ? <p className={inv.empty}>No excess items match.</p> : (
              <table className={[inv.table, styles.table].join(' ')} aria-label="Excess inventory">
                <thead>
                  <tr>
                    <th scope="col" className={[inv.cGo, styles.wide].join(' ')}><span className="visually-hidden">Open</span></th>
                    <th scope="col">Product</th>
                    <th scope="col" className={[inv.num, styles.cQty, styles.mid].join(' ')}>On hand</th>
                    <th scope="col" className={[inv.num, styles.cQty].join(' ')}>Excess</th>
                    <th scope="col" className={[inv.num, styles.cWeeks, styles.mid].join(' ')}><span className={styles.headWrap}>Weeks of supply</span></th>
                    <th scope="col" className={[inv.num, styles.cMoney, styles.wide].join(' ')}>Avg. cost</th>
                    <th scope="col" className={[inv.num, styles.cMoney, styles.wider].join(' ')}>
                      <span className={styles.headWrap}>{WMV_TERM}</span>
                    </th>
                    <th scope="col" className={[inv.num, styles.cPrice].join(' ')}><span className={styles.headWrap}>Network price</span></th>
                    <th scope="col" className={[inv.num, styles.cGain].join(' ')}>Gain / loss <span className={styles.perUnit}>per unit</span></th>
                    <th scope="col" className={[styles.cStatus, styles.wide].join(' ')}>Network</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, shown).map((r) => {
                    const isOpen = open === r.item.id
                    const toggle = () => setOpen(isOpen ? null : r.item.id)
                    return (
                      <Fragment key={r.item.id}>
                        <tr className={[inv.row, isOpen && inv.openRow, r.excluded && styles.excludedRow].filter(Boolean).join(' ')} onClick={toggle}>
                          <td className={[inv.go, styles.wide].join(' ')} aria-hidden="true"><Icon name="chevron-right" size={14} /></td>
                          <th scope="row" className={inv.product}>
                            <button type="button" className={[inv.lineButton, styles.productButton].join(' ')} aria-expanded={isOpen}
                              aria-controls={`${r.item.id}-excess`} onClick={(e) => { e.stopPropagation(); toggle() }}>
                              {r.item.product}
                            </button>
                            <span className={styles.productSub}>
                              {[r.item.variant, r.item.identifiers[0]].filter(Boolean).join(' · ')}
                              {r.excluded && <span className={styles.narrowOnly}> · Excluded</span>}
                            </span>
                          </th>
                          <td className={[inv.num, styles.mid].join(' ')}>{r.item.onHand}</td>
                          <td className={inv.num}>{r.excessQty}</td>
                          <td className={[inv.num, styles.mid].join(' ')}>{weeksText(r.weeksOfSupply)}</td>
                          <td className={[inv.num, styles.wide].join(' ')}>{unitPrice(r.item.unitCost)}</td>
                          <td className={[inv.num, styles.wider].join(' ')}>{unitPrice(r.wholesaleMarketValue)}</td>
                          <td className={inv.num}>
                            <span className={styles.price}>
                              <span>{unitPrice(r.networkPrice)}</span>
                              <PriceVsMarket comparison={r.comparison} short />
                            </span>
                          </td>
                          <td className={inv.num}><GainLoss row={r} /></td>
                          <td className={[styles.status, r.excluded && styles.statusOff, styles.wide].filter(Boolean).join(' ')}>
                            {r.excluded ? 'Excluded' : 'Available'}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className={inv.detailRow} id={`${r.item.id}-excess`}>
                            <td colSpan={columns}>
                              <ExcessDetail row={r}
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
            {rows.length > shown && (
              <button type="button" className={inv.textButton} onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}

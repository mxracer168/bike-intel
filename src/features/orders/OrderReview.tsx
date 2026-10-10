'use client'

import Link from 'next/link'
import { Fragment, useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { average } from '@/domain/language/plain'
import { WeeklySalesChart } from '@/features/recommendations/WeeklySalesChart'
import { AnchoredQuestion } from '@/features/intelligence/AnchoredQuestion'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { PriceVsMarket, ReputationLine } from '@/features/network/NetworkBits'
import { compareToMarket, unitPrice, WMV_HELP, WMV_TERM } from '@/features/network/pricing'
import { ConfidenceMark } from '@/ui/Confidence'
import { Icon } from '@/ui/Icon'
import { InfoTip } from '@/ui/InfoTip'
import { Changed } from '@/ui/Changed'
import motion from '@/ui/Motion.module.css'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { networkMatch, networkSignal, retailerLabel, supplierShort, type NetworkMatch } from './network'
import { ActionBar, HandoffStatus, OrderGlance, OrderHeader, SubmitDialog, type OrderProgress } from './OrderHeader'
import { addedTotal, setAddedQuantity, setLineQuantity, useDrafts, type AddedItem } from './drafts'
import { lineTotal, orderTotal, sortForReview } from './summarize'
import type { NetworkListing, OrderLineView, ProposedOrderView } from './types'
import { calculation, explanation, nextStep, oneDecimal, seasonView, supplierView } from './why'
import { SortHeader } from '@/ui/SortHeader'
import { nextSort, sortRows, type SortState, type SortValue } from '@/ui/sorting'
import styles from './OrderReview.module.css'

const NARROW = '(max-width: 760px)'
const MID = '(max-width: 1279px)'

/**
 * Which columns are hidden at this width (On order and Unit cost on phones,
 * Unit cost up to 1279px); a detail row must span only the visible ones.
 */
function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Line costs always show cents so the column lines up. */
function cost(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

/**
 * One piece of evidence behind a recommendation: a name, what it covers, the
 * value, and (when there's more to say) the detail on request. Evidence steps
 * back: quiet rows under the answer.
 */
function Evidence({ title, sub, value, graphic, children }: {
  title: string; sub: string; value: ReactNode; graphic?: ReactNode; children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const head = (
    <>
      <span className={styles.evidenceName}>
        <span className={styles.evidenceTitle}>{title}</span>
        <span className={styles.evidenceSub}>{sub}</span>
      </span>
      <span className={styles.evidenceGraphic}>{graphic}</span>
      <span className={styles.evidenceValue}>{value}</span>
    </>
  )
  if (!children) return <div className={styles.evidence}><div className={styles.evidenceHead}>{head}<span className={styles.evidenceCaret} /></div></div>
  return (
    <div className={styles.evidence}>
      <button type="button" className={styles.evidenceHead} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        {head}<span className={styles.evidenceCaret}><Icon name="chevron-down" size={14} /></span>
      </button>
      {open && <div id={id} className={[styles.evidenceBody, motion.reveal].join(' ')}>{children}</div>}
    </div>
  )
}

/** Twelve weeks as tiny bars: the shape of demand at a glance. */
function Spark({ weeks }: { weeks: number[] }) {
  const max = Math.max(1, ...weeks)
  return (
    <span className={styles.spark} aria-hidden="true">
      {weeks.map((n, i) => <i key={i} style={{ height: `${Math.max(2, (n / max) * 22)}px` }} />)}
    </span>
  )
}

/**
 * An opened line, as one recommendation: the answer (order N), the reason in
 * a paragraph, how the quantity covers expected demand, other retailers when
 * they have it, then the evidence behind it, each piece on request, and the
 * recommended next step (docs/recommendations.md).
 */
function Recommendation({ line, quantity, setQuantity, order, weekStarts, locked }: {
  line: OrderLineView; quantity: number; setQuantity: (n: number) => void; order: ProposedOrderView; weekStarts?: string[]
  /** Approved or submitted: quantities can no longer change. */
  locked?: boolean
}) {
  const intelligence = useIntelligence()
  const calc = calculation(line)
  const avg = average(line.weeklySales)
  const sup = supplierView(line, order.leadTimeDays)
  const season = seasonView(line)
  const salesId = `${line.id}-sales`
  const label = [line.product, line.variant].filter(Boolean).join(' ')
  const match = networkMatch(line.network, quantity)
  const share = (n: number) => `${calc.expectedDemand > 0 ? (n / calc.expectedDemand) * 100 : 0}%`
  return (
    <section className={[styles.rec, motion.reveal, motion.surface].join(' ')} aria-labelledby={`${line.id}-why`}>
      <div className={styles.recMain}>
        <div className={styles.recHead}>
          <div>
            <p className={styles.recEyebrow}>Recommendation</p>
            <h2 id={`${line.id}-why`} className={styles.recTitle}>Order {line.quantity}</h2>
          </div>
          <div className={styles.recMeta}>
            <ConfidenceMark level={line.confidence} />
            <span className={styles.recDot} aria-hidden="true">·</span>
            <span><Changed value={quantity}>{cost(lineTotal(line, quantity), order.currency)}</Changed> at {quantity}</span>
            {intelligence && (
              <button type="button" className={styles.addContext} aria-haspopup="dialog"
                onClick={() => intelligence.open({ about: { label, productId: line.productId } })}>
                <Icon name="plus" size={14} />Add context
              </button>
            )}
          </div>
        </div>

        <p className={styles.explanation}>{explanation(line)}</p>

        <section className={styles.coverage} aria-label="How we got there">
          <div className={styles.coverageHead}>
            <p>
              <span className={styles.coverageLabel}>Expected demand before your next chance to restock</span>
              <span className={styles.coverageValue}>{calc.expectedDemand} {calc.expectedDemand === 1 ? 'unit' : 'units'}</span>
            </p>
            <p className={styles.coverageNote}>{calc.demandNote}</p>
          </div>
          <span className={styles.coverageBar} aria-hidden="true">
            {calc.onHand > 0 && <i className={styles.barHand} style={{ width: share(calc.onHand) }} />}
            {calc.onOrder > 0 && <i className={styles.barOrdered} style={{ width: share(calc.onOrder) }} />}
            {calc.recommended > 0 && <i className={styles.barOrder} style={{ width: share(calc.recommended) }} />}
          </span>
          <dl className={styles.coverageParts}>
            <div><dt>On hand</dt><dd>{calc.onHand} covered</dd></div>
            <div><dt>Already ordered</dt><dd>{calc.onOrder} incoming</dd></div>
            <div className={styles.coverageOrder}><dt>Recommended</dt><dd>{calc.recommended} to order</dd></div>
          </dl>
        </section>

        {match.kind !== 'none' && (
          <NetworkPanel id={`${line.id}-network`} match={match} wholesaleMarketValue={line.wholesaleMarketValue}
            strong={supplierShort(line.supplier.status)} />
        )}

        <div className={styles.evidenceList}>
          <Evidence title="Demand" sub={`Last ${line.weeklySales.length} weeks, excluding the current week`}
            graphic={<Spark weeks={line.weeklySales} />} value={`${oneDecimal(avg)} / week`}>
            <section aria-labelledby={salesId}>
              <div className={styles.salesHead}>
                <h3 id={salesId}>Recent weekly sales</h3>
                <span className={styles.salesAvg}>{line.weeklySales.length}-week average: <b>{oneDecimal(avg)}</b> per week</span>
              </div>
              <WeeklySalesChart weeklySales={line.weeklySales} weekStarts={weekStarts} titleId={salesId} />
            </section>
          </Evidence>
          <Evidence title="Supply" sub={`${supplierShortName(order.supplier)} availability and expected delivery`}
            value={<><b className={sup.attention ? styles.attention : undefined}>{sup.value}</b> · about {order.leadTimeDays} days</>}>
            <div className={styles.supplierDetail}>
              {sup.warehouses.length > 0 ? (
                <ul>{sup.warehouses.map((w) => <li key={w.name}><span>{w.name}</span><span>{w.available}</span></li>)}</ul>
              ) : <p>{sup.note}</p>}
              <p>Delivery usually takes about {order.leadTimeDays} days after the order is placed.</p>
            </div>
          </Evidence>
          {season && (
            <Evidence title="Seasonal trend" sub={season.detail} value={season.value}>
              <p className={styles.evidenceText}>{season.sentence}</p>
            </Evidence>
          )}
          <Evidence title="Confidence" sub="How strongly the evidence supports this quantity" value={<ConfidenceMark level={line.confidence} />} />
        </div>

        {line.alternatives.length > 0 && (
          <section className={styles.notes}>
            <h3 className={styles.notesTitle}>Other options</h3>
            <ul>{line.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>
          </section>
        )}
      </div>

      <footer className={styles.recFoot}>
        <div>
          <h3 className={styles.recFootLabel}>Recommended next step</h3>
          <p>{nextStep(line, supplierShortName(order.supplier), order.orderBy)}</p>
          {!locked && quantity !== line.quantity && (
            <p className={styles.changed}>
              You changed this to {quantity}.{' '}
              <button type="button" className={styles.textButton} onClick={() => setQuantity(line.quantity)}>Back to {line.quantity}</button>
            </p>
          )}
        </div>
        <p className={styles.recFootTotal}><Changed value={quantity}>{cost(lineTotal(line, quantity), order.currency)}</Changed></p>
      </footer>
    </section>
  )
}

/** "Northline Distribution" → "Northline" in running text. */
const supplierShortName = (name: string) => name.split(' ')[0] ?? name

/**
 * One other retailer's offer: who they are and their reputation, how many,
 * and their network price against Wholesale Market Value, so the trade is
 * understandable before anyone is contacted. The introduction is mocked.
 */
function NetworkRow({ listing, wholesaleMarketValue }: { listing: NetworkListing; wholesaleMarketValue?: number }) {
  const [requested, setRequested] = useState(false)
  const who = retailerLabel(listing)
  return (
    <li className={styles.networkRow}>
      <span className={styles.networkWho}>
        <span className={styles.networkName}>{who.name}</span>
        <span className={styles.networkPlace}>{who.place}</span>
        <ReputationLine reputation={who.reputation} />
      </span>
      <span className={styles.networkQty}>{listing.available} available</span>
      <span className={styles.networkPrice}>
        <span><b>{unitPrice(listing.price)}</b> each</span>
        {wholesaleMarketValue !== undefined && <PriceVsMarket comparison={compareToMarket(listing.price, wholesaleMarketValue)} short />}
      </span>
      <span className={styles.networkAct}>
        {requested
          ? <span className={styles.networkDone} role="status">Requested · you’ll arrange payment and shipping directly</span>
          : <button type="button" className={styles.textButton} onClick={() => setRequested(true)}
              aria-label={`Contact ${who.name}`}>Contact retailer</button>}
      </span>
    </li>
  )
}

/**
 * Other retailers who made this item available: those who can cover it all
 * first, then those with some, cheapest first within each. Prominence follows
 * relevance (docs/network.md): the list stays closed until asked for, and the
 * panel is only emphasized when the supplier can't reasonably fill the line.
 * Wholesale Market Value is the same for every offer, so it's said once.
 */
function NetworkPanel({ id, match, wholesaleMarketValue, strong }: {
  id: string; match: Exclude<NetworkMatch, { kind: 'none' }>; wholesaleMarketValue?: number; strong?: boolean
}) {
  const [open, setOpen] = useState(false)
  const row = (l: NetworkListing) => <NetworkRow key={l.id} listing={l} wholesaleMarketValue={wholesaleMarketValue} />
  const available = [...(match.kind === 'full' ? match.cover : []), ...match.some].reduce((n, l) => n + l.available, 0)
  return (
    <section className={[styles.networkPanel, strong && styles.networkStrong].filter(Boolean).join(' ')} aria-labelledby={`${id}-title`}>
      <div className={styles.networkHead}>
        <div className={styles.networkIntro}>
          <p className={styles.networkEyebrow}>Other retailers</p>
          <h3 id={`${id}-title`} className={styles.networkTitle}>{networkSignal(match)}</h3>
          <p className={styles.networkLead}>{available} available from retailers in the network, if you want to replace or add to part of this supplier order.</p>
        </div>
        <div className={styles.networkSide}>
          {wholesaleMarketValue !== undefined && (
            <p className={styles.networkMarket}>
              {WMV_TERM} <b>{unitPrice(wholesaleMarketValue)}</b>
              <InfoTip term={WMV_TERM}>{`${WMV_TERM}: ${WMV_HELP}`}</InfoTip>
            </p>
          )}
          <button type="button" className={styles.disclosure} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide retailers' : 'Show retailers'}<Caret />
          </button>
        </div>
      </div>
      {open && (
        <div id={id} className={styles.networkBody}>
          {match.kind === 'full' ? (
            <>
              <ul className={styles.networkList} aria-label={`Can cover all ${match.needed}`}>{match.cover.map(row)}</ul>
              {match.some.length > 0 && (
                <>
                  <p className={styles.networkGroup}>Other retailers with some</p>
                  <ul className={styles.networkList}>{match.some.map(row)}</ul>
                </>
              )}
            </>
          ) : (
            <ul className={styles.networkList} aria-label="Retailers with some">{match.some.map(row)}</ul>
          )}
        </div>
      )}
    </section>
  )
}

/** Products added to this order from the Catalog (example only): quantity, unit cost, line total. */
function AddedFromCatalog({ orderId, items, currency, locked }: { orderId: string; items: AddedItem[]; currency: string; locked: boolean }) {
  return (
    <section className={styles.added} aria-labelledby={`${orderId}-added`}>
      <h3 id={`${orderId}-added`} className={styles.addedTitle}>Added from the Catalog</h3>
      <ul className={styles.addedList}>
        {items.map((a) => (
          <li key={a.key} className={styles.addedRow}>
            <Link href={`/catalog/${encodeURIComponent(a.productId)}?option=${encodeURIComponent(a.optionId)}`} className={styles.addedName}>
              {a.product}{a.variant && <>{' '}<span className={styles.variant}>{a.variant}</span></>}
            </Link>
            {locked
              ? <span className={styles.lockedQty}>{a.quantity}</span>
              : <QuantityStepper compact value={a.quantity} onChange={(n) => setAddedQuantity(orderId, a.key, n)} label={`Quantity for ${a.product}${a.variant ? ` ${a.variant}` : ''}`} />}
            <span className={styles.addedUnit}>{cost(a.unitCost, currency)}</span>
            <span className={styles.addedTotal}>{cost(lineTotal(a, a.quantity), currency)}</span>
            {!locked && (
              <button type="button" className={styles.textButton} onClick={() => setAddedQuantity(orderId, a.key, 0)}
                aria-label={`Remove ${a.product}${a.variant ? ` ${a.variant}` : ''}`}>Remove</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

const Caret = () => <span className={styles.caret} aria-hidden="true"><Icon name="chevron-down" size={14} /></span>

type LineSortKey = 'product' | 'onHand' | 'onOrder' | 'quantity' | 'unitCost' | 'cost'

/** A quiet filter tab: the label, then a muted count; the current one is underlined. */
function FilterTab({ current, onClick, label, count }: { current: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button type="button" aria-pressed={current} onClick={onClick}>
      {label}<span className={styles.count}>{count}</span>
    </button>
  )
}

/**
 * One supplier's proposed order: the order's intelligence on top, then every
 * line as a row of facts (product, stock, the quantity you can change, unit
 * and line cost). Built to scan hundreds of lines; each reason opens in
 * place. Quantities change locally only.
 */
export function OrderReview({ order, backHref, weekStarts, example, openLine }: {
  order: ProposedOrderView; backHref?: string; example?: boolean
  /** A line to open on arrival (from search or a notification). */
  openLine?: string
  /** Start dates of the complete weeks in each line's weekly sales, oldest first. */
  weekStarts?: string[]
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  // Example orders keep their changes and Catalog additions in this browser (drafts.ts).
  const drafts = useDrafts()
  const draft = example ? drafts.orders[order.id] : undefined
  const [open, setOpen] = useState<string | null>(() => (openLine && order.lines.some((l) => l.id === openLine) ? openLine : null))
  const [filter, setFilter] = useState<'all' | 'attention' | 'network'>('all')
  const [progress, setProgress] = useState<OrderProgress>({ status: 'draft' })
  // Arriving with a line to open: bring it into view once.
  useEffect(() => {
    if (openLine) document.getElementById(`${openLine}-detail`)?.previousElementSibling?.scrollIntoView({ block: 'center' })
  }, [openLine])
  const [reviewing, setReviewing] = useState(false)
  const locked = progress.status !== 'draft'
  const narrow = useMedia(NARROW)
  const mid = useMedia(MID)

  const sorted = sortForReview(order.lines)
  const attention = sorted.filter((l) => l.state !== 'ok')
  const qty = (l: OrderLineView) => quantities[l.id] ?? draft?.lines[l.id] ?? l.quantity
  const setQty = (id: string, n: number) => {
    setQuantities((prev) => ({ ...prev, [id]: n }))
    if (example) setLineQuantity(order.id, id, n)
  }
  const merged = { ...draft?.lines, ...quantities }
  const added = draft?.added ?? []
  // Compared against what we'd order now, so it follows quantity changes.
  const fromNetwork = sorted.filter((l) => networkMatch(l.network, qty(l)).kind !== 'none')
  const filtered = filter === 'all' ? sorted : filter === 'attention' ? attention : fromNetwork
  // Review order (questions, then lines worth a look) until a column is chosen.
  const [lineSort, setLineSort] = useState<SortState<LineSortKey> | null>(null)
  const onSort = (key: LineSortKey) => setLineSort((s) => nextSort(s, key))
  const lineValue: Record<LineSortKey, (l: OrderLineView) => SortValue> = {
    product: (l) => [l.product, l.variant].filter(Boolean).join(' '),
    onHand: (l) => l.onHand,
    onOrder: (l) => l.onOrder,
    quantity: (l) => qty(l),
    unitCost: (l) => (l.unitCost > 0 ? l.unitCost : null),
    cost: (l) => lineTotal(l, qty(l)),
  }
  const shown = lineSort ? sortRows(filtered, lineValue[lineSort.key], lineSort.dir) : filtered
  const total = Math.round((orderTotal(order.lines, merged) + addedTotal(draft)) * 100) / 100
  const ordering = order.lines.filter((l) => qty(l) > 0).length + added.length
  const toggle = (id: string) => setOpen((current) => (current === id ? null : id))
  const columns = narrow ? 4 : mid ? 5 : 6

  return (
    <>
      <OrderHeader order={order} backHref={backHref} total={total} lineCount={ordering}
        progress={progress} onProgress={setProgress} onReview={() => setReviewing(true)} />
      <OrderGlance order={order} total={total} lineCount={ordering} progress={progress} />
      <HandoffStatus order={order} quantities={merged} progress={progress} example={example} />

      <div className={[styles.work, progress.status !== 'submitted' && order.handoff && styles.withBar].filter(Boolean).join(' ')}>
        <div className={styles.linesHead}>
          <div>
            <h2 className={styles.linesTitle}>Recommended lines</h2>
            <p className={styles.linesLead}>Change a quantity and the order total updates immediately. Open a line to see why.</p>
          </div>
          <div className={styles.filter} role="group" aria-label="Show">
            <FilterTab current={filter === 'all'} onClick={() => setFilter('all')} label="All" count={order.lines.length} />
            {attention.length > 0 && (
              <FilterTab current={filter === 'attention'} onClick={() => setFilter('attention')} label="Needs a look" count={attention.length} />
            )}
            {fromNetwork.length > 0 && (
              <FilterTab current={filter === 'network'} onClick={() => setFilter('network')} label="Other retailers" count={fromNetwork.length} />
            )}
          </div>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table} aria-label={`Proposed order from ${order.supplier}`}>
            <thead>
              <tr>
                <SortHeader sortKey="product" sort={lineSort} onSort={onSort}>Product</SortHeader>
                <SortHeader sortKey="onHand" sort={lineSort} onSort={onSort} numeric className={[styles.num, styles.cStock].join(' ')}>On hand</SortHeader>
                <SortHeader sortKey="onOrder" sort={lineSort} onSort={onSort} numeric className={[styles.num, styles.wide, styles.cStock].join(' ')}>On order</SortHeader>
                <SortHeader sortKey="quantity" sort={lineSort} onSort={onSort} numeric className={[styles.num, styles.cQty].join(' ')}>Order qty</SortHeader>
                <SortHeader sortKey="unitCost" sort={lineSort} onSort={onSort} numeric className={[styles.num, styles.wide, styles.mid, styles.cUnit].join(' ')}>Unit cost</SortHeader>
                <SortHeader sortKey="cost" sort={lineSort} onSort={onSort} numeric className={[styles.num, styles.cCost].join(' ')}>Line total</SortHeader>
              </tr>
            </thead>
            <tbody>
              {shown.map((line) => {
                const isOpen = open === line.id
                const q = qty(line)
                return (
                  <Fragment key={line.id}>
                    {/* The whole row opens the line; the button inside is the keyboard and screen-reader control. */}
                    <tr className={[styles.row, isOpen && styles.openRow].filter(Boolean).join(' ')} onClick={() => toggle(line.id)}>
                      <th scope="row" className={styles.product}>
                        <button type="button" className={styles.lineButton} aria-expanded={isOpen}
                          aria-controls={`${line.id}-detail`} onClick={(e) => { e.stopPropagation(); toggle(line.id) }}>
                          <span className={styles.lineName}>
                            {line.product}
                            {line.variant && <>{' '}<span className={styles.variant}>{line.variant}</span></>}
                          </span>
                          <span className={styles.lineSub}>
                            <span className={styles.why}>{isOpen ? 'Hide reasoning' : `Why ${line.quantity}?`}<Caret /></span>
                          </span>
                        </button>
                      </th>
                      <td className={styles.num}>{line.onHand}</td>
                      <td className={[styles.num, styles.wide].join(' ')}>{line.onOrder || <span className={styles.none}>–</span>}</td>
                      <td className={[styles.num, styles.qty].join(' ')} onClick={(e) => e.stopPropagation()}>
                        {locked
                          ? <span className={styles.lockedQty}>{q}</span>
                          : <QuantityStepper compact value={q} onChange={(n) => setQty(line.id, n)} label={`Quantity for ${line.product}${line.variant ? ` ${line.variant}` : ''}`} />}
                        {q !== line.quantity && <span className={styles.was}>was {line.quantity}</span>}
                      </td>
                      <td className={[styles.num, styles.muted, styles.wide, styles.mid].join(' ')}>{line.unitCost > 0 ? cost(line.unitCost, order.currency) : <span className={styles.none}>–</span>}</td>
                      <td className={[styles.num, styles.lineTotal].join(' ')}><Changed value={q}>{cost(lineTotal(line, q), order.currency)}</Changed></td>
                    </tr>
                    {isOpen && (
                      <tr className={styles.detailRow} id={`${line.id}-detail`}>
                        <td colSpan={columns}>
                          <Recommendation line={line} quantity={q} order={order} weekStarts={weekStarts} locked={locked}
                            setQuantity={(n) => setQty(line.id, n)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={columns - 1}>Total</th>
                <td className={styles.num}><Changed value={total}>{cost(total, order.currency)}</Changed></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {added.length > 0 && <AddedFromCatalog orderId={order.id} items={added} currency={order.currency} locked={locked} />}

        {order.intelligenceQuestionId && (
          <AnchoredQuestion questionId={order.intelligenceQuestionId} headline="1 question could change this order" />
        )}
      </div>

      <ActionBar order={order} total={total} lineCount={ordering}
        progress={progress} onProgress={setProgress} onReview={() => setReviewing(true)} />
      <SubmitDialog order={order} total={total} lineCount={ordering} open={reviewing} onClose={() => setReviewing(false)}
        onProgress={setProgress} example={example} />
    </>
  )
}

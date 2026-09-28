'use client'

import { Fragment, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { average, formatMoney, plural } from '@/domain/language/plain'
import { WeeklySalesChart } from '@/features/recommendations/WeeklySalesChart'
import { AnchoredQuestion } from '@/features/intelligence/AnchoredQuestion'
import { ConfidenceMark } from '@/ui/Confidence'
import { Icon } from '@/ui/Icon'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { networkMatch, networkSignal, retailerLabel, supplierShort, type NetworkMatch } from './network'
import { orderNote } from './OrderList'
import { freightGap, lineTotal, orderTotal, sortForReview } from './summarize'
import type { NetworkListing, OrderLineView, ProposedOrderView } from './types'
import { calculation, explanation, extraReason, nextStep, oneDecimal, paceWords, seasonView, supplierView, supplierWaiting } from './why'
import page from './Orders.module.css'
import styles from './OrderReview.module.css'

const NARROW = '(max-width: 760px)'

/** On narrow screens the chevron and On order columns are hidden; a detail row must span only the visible ones. */
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  )
}

/** Line costs always show cents so the column lines up. */
function cost(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** An evidence row: a quiet icon, a title and one sentence, and an optional "View details" disclosure. */
function EvidenceRow({ icon, title, sentence, details }: { icon: ReactNode; title: string; sentence: string; details?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <li className={styles.evidenceRow}>
      <span className={styles.evidenceIcon} aria-hidden="true">{icon}</span>
      <div className={styles.evidenceText}>
        <h4>{title}</h4>
        <p>{sentence}</p>
        {open && details && <p id={id} className={styles.evidenceMore}>{details}</p>}
      </div>
      {details && (
        <button type="button" className={styles.viewDetails} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide details' : 'View details'}<Icon name={open ? 'chevron-down' : 'arrow-right'} size={14} />
        </button>
      )}
    </li>
  )
}

/**
 * "Why N?": the answer first (a plain explanation and the arithmetic), then
 * the evidence (weekly sales, seasonality, supplier). Beside it, what we
 * considered and the recommended next step, which can differ from "order N
 * now" when the supplier can't ship (docs/recommendations.md).
 */
function WhyPanel({ line, supplier, leadTimeDays, orderBy, weekStarts }: {
  line: OrderLineView; supplier: string; leadTimeDays: number; orderBy?: string; weekStarts?: string[]
}) {
  const calc = calculation(line)
  const extra = extraReason(line)
  const avg = average(line.weeklySales)
  const sup = supplierView(line, supplierShortName(supplier), leadTimeDays)
  const season = seasonView(line)
  const salesId = `${line.id}-sales`
  return (
    <section className={[styles.panel, styles.whyPanel].join(' ')} aria-labelledby={`${line.id}-why`}>
      <div className={styles.whyLayout}>
        <div className={styles.whyMain}>
          <h2 id={`${line.id}-why`} className={styles.whyTitle}>Why {line.quantity}?</h2>
          <p className={styles.explanation}>{explanation(line)}</p>
          {extra && <p className={styles.extra}>{extra}</p>}

          <dl className={styles.calc} aria-label="How we got there">
            <div>
              <dt>Expected demand</dt>
              <dd><b>{calc.expectedDemand}</b><span>{calc.demandNote}</span></dd>
            </div>
            <div>
              <dt><span className={styles.op} aria-hidden="true">−</span>On hand</dt>
              <dd><b>{calc.onHand}</b><span>Available to sell</span></dd>
            </div>
            <div>
              <dt><span className={styles.op} aria-hidden="true">−</span>Already ordered</dt>
              <dd><b>{calc.onOrder}</b><span>On purchase orders</span></dd>
            </div>
            <div className={styles.calcResult}>
              <dt><span className={styles.op} aria-hidden="true">=</span>Recommended</dt>
              <dd><b>{calc.recommended}</b><span>{calc.recommended === 1 ? 'Unit' : 'Units'} to order</span></dd>
            </div>
          </dl>

          <section className={styles.sales} aria-labelledby={salesId}>
            <div className={styles.salesHead}>
              <h3 id={salesId}>Recent weekly sales</h3>
              <span className={styles.salesNote}>Last {line.weeklySales.length} weeks (excluding current week)</span>
              <span className={styles.salesAvg}>{line.weeklySales.length}-week average: <b>{oneDecimal(avg)}</b> per week</span>
            </div>
            <WeeklySalesChart weeklySales={line.weeklySales} weekStarts={weekStarts} titleId={salesId} />
          </section>

          <ul className={styles.evidence}>
            {season && (
              <EvidenceRow icon={<Icon name="trend-up" size={16} />} title="Seasonality" sentence={season.sentence}
                // Deeper seasonal evidence (the same weeks in past years) isn't built yet.
                details={line.seasonalPace !== undefined ? 'A week-by-week comparison with the same weeks in past years will show here.' : undefined} />
            )}
            <EvidenceRow icon={<Icon name={sup.attention ? 'alert' : 'check'} size={16} />} title="Supplier availability"
              sentence={sup.sentence} details={line.availability} />
          </ul>
        </div>

        <aside className={styles.whyAside} aria-label="What we considered">
          <section className={styles.considered} aria-labelledby={`${line.id}-considered`}>
            <h3 id={`${line.id}-considered`}>What we considered</h3>
            <dl>
              <div><dt>Recent sales</dt><dd><b>{capitalize(paceWords(avg))}</b><span>{line.weeklySales.length}-week average</span></dd></div>
              <div><dt>Supplier availability</dt><dd>
                <b className={sup.attention ? styles.attention : undefined}>{sup.value}</b><span>{sup.detail}</span>
              </dd></div>
              <div><dt>Typical delivery time</dt><dd>
                <b>~{leadTimeDays} days</b><span>{supplierWaiting(line.supplier) ? 'After it becomes available' : 'After you order'}</span>
              </dd></div>
              {sup.toShelfDays !== undefined && (
                <div><dt>Lead time to stock</dt><dd>
                  <b>~{sup.toShelfDays} days</b><span>{line.supplier.expectedInDays} days + {leadTimeDays} days</span>
                </dd></div>
              )}
              {season && <div><dt>Seasonal trend</dt><dd><b>{season.value}</b><span>{season.detail}</span></dd></div>}
              <div><dt>Confidence</dt><dd><ConfidenceMark level={line.confidence} /></dd></div>
            </dl>
          </section>
          <section className={styles.nextStep} aria-labelledby={`${line.id}-next`}>
            <h3 id={`${line.id}-next`}>Recommended next step</h3>
            <p>{nextStep(line, supplierShortName(supplier), orderBy)}</p>
          </section>
        </aside>
      </div>
    </section>
  )
}

/** "Northline Distribution" → "Northline" in running text. */
const supplierShortName = (name: string) => name.split(' ')[0] ?? name

/** Under the Why panel: other options, if any. What we assumed is now said in the explanation. */
function Notes({ line }: { line: OrderLineView }) {
  if (line.alternatives.length === 0) return null
  return (
    <div className={styles.notes}>
      <section className={styles.panel}>
        <h2 className={styles.notesTitle}>Other options</h2>
        <ul>{line.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>
      </section>
    </div>
  )
}

/** One other retailer and a (mocked) introduction. No price: that's between the two stores. */
function NetworkRow({ listing }: { listing: NetworkListing }) {
  const [requested, setRequested] = useState(false)
  const who = retailerLabel(listing)
  return (
    <li className={styles.networkRow}>
      <span className={styles.networkName}>{who.name}</span>
      <span className={styles.networkQty}>{listing.available} available</span>
      <span className={styles.networkPlace}>{who.place}</span>
      {requested
        ? <span className={styles.networkDone} role="status">Requested · you’ll agree price and shipping directly</span>
        : <button type="button" className={styles.textButton} onClick={() => setRequested(true)}
            aria-label={`Request connection with ${who.name}`}>Request connection</button>}
    </li>
  )
}

/** Other retailers who made this item available: those who can cover it all first, then those with some. */
function NetworkPanel({ id, match }: { id: string; match: Exclude<NetworkMatch, { kind: 'none' }> }) {
  return (
    <section id={id} className={[styles.panel, styles.networkPanel].join(' ')} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.panelTitle}>Other retailers</h2>
      {match.kind === 'full' ? (
        <>
          <ul className={styles.networkList} aria-label={`Can cover all ${match.needed}`}>
            {match.cover.map((l) => <NetworkRow key={l.id} listing={l} />)}
          </ul>
          {match.some.length > 0 && (
            <>
              <p className={styles.networkGroup}>Other retailers with some</p>
              <ul className={styles.networkList}>{match.some.map((l) => <NetworkRow key={l.id} listing={l} />)}</ul>
            </>
          )}
        </>
      ) : (
        <ul className={styles.networkList} aria-label="Retailers with some">{match.some.map((l) => <NetworkRow key={l.id} listing={l} />)}</ul>
      )}
    </section>
  )
}

const Caret = () => <span className={styles.caret} aria-hidden="true"><Icon name="chevron-down" size={14} /></span>

/**
 * An opened line: one short reason and a strip of controls (quantity, "Why
 * N?", other retailers). Each disclosure opens its own zone: Why on the left
 * (about two thirds), other retailers on the right; whichever is open alone
 * takes the full width. Assumptions and options sit underneath.
 */
function LineDetail({ line, quantity, setQuantity, order, weekStarts }: {
  line: OrderLineView; quantity: number; setQuantity: (n: number) => void; order: ProposedOrderView; weekStarts?: string[]
}) {
  const [why, setWhy] = useState(false)
  const [showNetwork, setShowNetwork] = useState(false)
  const whyId = useId()
  const networkId = useId()
  const match = networkMatch(line.network, quantity)
  const network = showNetwork && match.kind !== 'none' ? match : null
  return (
    <div className={styles.detail}>
      <div className={styles.controls}>
        <QuantityStepper compact value={quantity} onChange={setQuantity} label={`Quantity for ${line.product}`} />
        <button type="button" className={styles.disclosure} aria-expanded={why} aria-controls={whyId} onClick={() => setWhy((v) => !v)}>
          Why {line.quantity}?<Caret />
        </button>
        {match.kind !== 'none' && (
          <button type="button" aria-expanded={showNetwork} aria-controls={networkId} onClick={() => setShowNetwork((v) => !v)}
            className={[styles.disclosure, supplierShort(line.supplier.status) && styles.disclosureStrong].filter(Boolean).join(' ')}>
            {networkSignal(match)}<Caret />
          </button>
        )}
        {quantity !== line.quantity && (
          <button type="button" className={styles.textButton} onClick={() => setQuantity(line.quantity)}>Back to {line.quantity}</button>
        )}
      </div>
      {(why || network) && (
        <div className={[styles.zones, why && network && styles.zonesBoth].filter(Boolean).join(' ')}>
          {why && <div id={whyId} className={styles.whyZone}><WhyPanel line={line} supplier={order.supplier} leadTimeDays={order.leadTimeDays} orderBy={order.orderBy} weekStarts={weekStarts} /></div>}
          {network && <NetworkPanel id={networkId} match={network} />}
          {why && <Notes line={line} />}
        </div>
      )}
    </div>
  )
}

/**
 * One supplier's order as a plain table of facts: product, on hand, on order,
 * quantity, cost. Built to scan hundreds of lines; every reason lives behind a
 * click on the row. Quantities change locally only.
 */
export function OrderReview({ order, eyebrow, weekStarts }: {
  order: ProposedOrderView; eyebrow?: ReactNode; example?: boolean
  /** Start dates of the complete weeks in each line's weekly sales, oldest first. */
  weekStarts?: string[]
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'attention' | 'network'>('all')
  const narrow = useNarrow()

  const sorted = sortForReview(order.lines)
  const attention = sorted.filter((l) => l.state !== 'ok')
  const qty = (l: OrderLineView) => quantities[l.id] ?? l.quantity
  // Compared against what we'd order now, so it follows quantity changes.
  const fromNetwork = sorted.filter((l) => networkMatch(l.network, qty(l)).kind !== 'none')
  const shown = filter === 'all' ? sorted : filter === 'attention' ? attention : fromNetwork
  const total = orderTotal(order.lines, quantities)
  const note = orderNote({ orderBy: order.orderBy, freightGap: freightGap(order, total), currency: order.currency })
  const toggle = (id: string) => setOpen((current) => (current === id ? null : id))

  return (
    <>
      <header className={page.head}>
        {eyebrow && <p className={page.eyebrow}>{eyebrow}</p>}
        <h1 className={page.title}>{order.supplier}</h1>
        <p className={page.lead}>
          {plural(order.lines.length, 'line')}, about {formatMoney(Math.round(total), order.currency)}.
          {note && <span className={styles.note}> {note}.</span>}
        </p>
      </header>

      <div className={styles.work}>
        <div className={styles.filter} role="group" aria-label="Show">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {order.lines.length}</button>
          {attention.length > 0 && (
            <button type="button" aria-pressed={filter === 'attention'} onClick={() => setFilter('attention')}>
              Needs a look {attention.length}
            </button>
          )}
          {fromNetwork.length > 0 && (
            <button type="button" aria-pressed={filter === 'network'} onClick={() => setFilter('network')}>
              Other retailers {fromNetwork.length}
            </button>
          )}
        </div>

        <table className={styles.table} aria-label={`Proposed order from ${order.supplier}`}>
          <thead>
            <tr>
              <th scope="col" className={[styles.cGo, styles.wide].join(' ')}><span className="visually-hidden">Open</span></th>
              <th scope="col">Product</th>
              <th scope="col" className={[styles.num, styles.cStock].join(' ')}>On hand</th>
              <th scope="col" className={[styles.num, styles.wide, styles.cStock].join(' ')}>On order</th>
              <th scope="col" className={[styles.num, styles.cQty].join(' ')}>Order</th>
              <th scope="col" className={[styles.num, styles.cCost].join(' ')}>Cost</th>
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
                    <td className={[styles.go, styles.wide].join(' ')} aria-hidden="true"><Icon name="chevron-right" size={14} /></td>
                    <th scope="row" className={styles.product}>
                      <button type="button" className={styles.lineButton} aria-expanded={isOpen}
                        aria-controls={`${line.id}-detail`} onClick={(e) => { e.stopPropagation(); toggle(line.id) }}>
                        {line.product}
                        {line.variant && <>{' '}<span className={styles.variant}>{line.variant}</span></>}
                      </button>
                    </th>
                    <td className={styles.num}>{line.onHand}</td>
                    <td className={[styles.num, styles.wide].join(' ')}>{line.onOrder || <span className={styles.none}>–</span>}</td>
                    <td className={[styles.num, styles.qty].join(' ')}>
                      {q}
                      {q !== line.quantity && <span className={styles.was}> was {line.quantity}</span>}
                    </td>
                    <td className={styles.num}>{cost(lineTotal(line, q), order.currency)}</td>
                  </tr>
                  {isOpen && (
                    <tr className={styles.detailRow} id={`${line.id}-detail`}>
                      <td colSpan={narrow ? 4 : 6}>
                        <LineDetail line={line} quantity={q} order={order} weekStarts={weekStarts}
                          setQuantity={(n) => setQuantities((prev) => ({ ...prev, [line.id]: n }))} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={narrow ? 3 : 5}>Estimated total</th>
              <td className={styles.num}>{cost(total, order.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.intelligenceQuestionId && (
        <AnchoredQuestion questionId={order.intelligenceQuestionId} headline="1 question could change this order" />
      )}
    </>
  )
}

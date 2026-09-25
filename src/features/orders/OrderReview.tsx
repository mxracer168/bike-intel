'use client'

import { Fragment, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { average, describeCover, describeWeeklyRate, formatMoney, plural } from '@/domain/language/plain'
import { EvidenceChart } from '@/features/recommendations/EvidenceChart'
import { InlineQuestion } from '@/features/intelligence/InlineQuestion'
import { ConfidenceMark } from '@/ui/Confidence'
import { Icon } from '@/ui/Icon'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { networkMatch, networkSignal, retailerLabel, supplierShort, type NetworkMatch } from './network'
import { orderNote } from './OrderList'
import { freightGap, lineTotal, orderTotal, sortForReview } from './summarize'
import type { NetworkListing, OrderLineView, ProposedOrderView } from './types'
import page from './Orders.module.css'
import styles from './OrderReview.module.css'

const NARROW = '(max-width: 760px)'

/** On narrow screens the On order column is hidden; a detail row must span only the visible ones. */
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

const supplierLabel = { available: 'Available', limited: 'Limited', delayed: 'Delayed', out: 'Out of stock' } as const

/** The target the quantity was sized to (delivery has its own place in the evidence). */
const targetOf = (line: OrderLineView) => line.assumptions.find((a) => !a.startsWith('Delivery'))

/** Evidence: the full analysis, only at the deepest level. */
function Evidence({ line, leadTimeDays }: { line: OrderLineView; leadTimeDays: number }) {
  const perWeek = average(line.weeklySales)
  return (
    <div className={styles.evidence}>
      <EvidenceChart weeklySales={line.weeklySales} />
      <dl className={styles.facts}>
        <div><dt>You sell</dt><dd>{describeWeeklyRate(perWeek)}</dd></div>
        <div><dt>On hand</dt><dd>{line.onHand > 0 ? `${line.onHand}, lasting ${describeCover(line.onHand, perWeek)}` : 'None'}</dd></div>
        <div><dt>Supplier stock</dt><dd>
          {line.supplier.status === 'available' ? line.availability : `${supplierLabel[line.supplier.status]} · ${line.supplier.note}`}
        </dd></div>
        <div><dt>Delivery</dt><dd>About {leadTimeDays} days</dd></div>
        {line.season && <div><dt>Season</dt><dd>{line.season}</dd></div>}
        <div><dt>Confidence</dt><dd><ConfidenceMark level={line.confidence} /></dd></div>
      </dl>
      <p className={styles.evidenceReason}>{line.reason}</p>
      <div className={styles.notes}>
        <div>
          <h2 className={styles.notesTitle}>What we assumed</h2>
          <ul>{line.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
        {line.alternatives.length > 0 && (
          <div>
            <h2 className={styles.notesTitle}>Other options</h2>
            <ul>{line.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

/** One other retailer and a (mocked) introduction. No price: that's between the two stores. */
function NetworkRow({ listing }: { listing: NetworkListing }) {
  const [requested, setRequested] = useState(false)
  const who = retailerLabel(listing)
  return (
    <li className={styles.networkRow}>
      <span className={styles.networkWho}>
        <span className={styles.networkName}>{who.name}</span>
        <span className={styles.networkPlace}>{who.place}</span>
      </span>
      <span className={styles.networkQty}>{listing.available} available</span>
      {requested
        ? <span className={styles.networkDone} role="status">Requested · you’ll agree price and shipping directly</span>
        : <button type="button" className={styles.textButton} onClick={() => setRequested(true)}
            aria-label={`Request connection with ${who.name}`}>Request connection</button>}
    </li>
  )
}

/** Other retailers' stock: one short signal, the list only when asked for. */
function Network({ match, prominent }: { match: Exclude<NetworkMatch, { kind: 'none' }>; prominent: boolean }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  return (
    <div className={styles.network}>
      <button type="button" className={[styles.more, prominent && styles.morePrimary].filter(Boolean).join(' ')}
        aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
        {networkSignal(match)}<span className={styles.caret} aria-hidden="true"><Icon name="chevron-right" size={13} /></span>
      </button>
      <div id={listId} hidden={!open}>
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
      </div>
    </div>
  )
}

/**
 * An opened line. First: the decision and one short reason. "Why N?" adds the
 * few facts behind the number; "View evidence" the full analysis. Other
 * retailers stay one collapsed line, raised only when the supplier is short.
 */
function LineDetail({ line, quantity, setQuantity, leadTimeDays }: {
  line: OrderLineView; quantity: number; setQuantity: (n: number) => void; leadTimeDays: number
}) {
  const [why, setWhy] = useState(false)
  const [evidence, setEvidence] = useState(false)
  const whyId = useId()
  const evidenceId = useId()
  const match = networkMatch(line.network, quantity)
  const short = supplierShort(line.supplier.status)
  const network = match.kind !== 'none' && <Network match={match} prominent={short} />
  const target = targetOf(line)
  return (
    <div className={styles.detail}>
      <p className={styles.answer}>{line.quantity === 0 ? 'Skip for now' : `Order ${line.quantity}`}</p>
      <p className={styles.reason}>{line.signal.reason}.</p>
      {short && network}
      <div className={styles.controls}>
        <QuantityStepper compact value={quantity} onChange={setQuantity} label={`Quantity for ${line.product}`} />
        {quantity !== line.quantity && (
          <button type="button" className={styles.more} onClick={() => setQuantity(line.quantity)}>Back to {line.quantity}</button>
        )}
        <button type="button" className={styles.more} aria-expanded={why} aria-controls={whyId} onClick={() => setWhy((v) => !v)}>
          Why {line.quantity}?<span className={styles.caret} aria-hidden="true"><Icon name="chevron-right" size={13} /></span>
        </button>
      </div>
      <div id={whyId} hidden={!why} className={styles.why}>
        <ul className={styles.whyList}>
          <li>{line.signal.proof}</li>
          <li>{line.onHand} on hand</li>
          <li>{line.onOrder || 'None'} already on order</li>
          {target && <li>{target}</li>}
        </ul>
        <button type="button" className={styles.more} aria-expanded={evidence} aria-controls={evidenceId} onClick={() => setEvidence((v) => !v)}>
          {evidence ? 'Hide evidence' : 'View evidence'}
        </button>
        <div id={evidenceId} hidden={!evidence}>
          {evidence && <Evidence line={line} leadTimeDays={leadTimeDays} />}
        </div>
      </div>
      {!short && network}
    </div>
  )
}

/**
 * One supplier's order as a plain table of facts: product, on hand, on order,
 * quantity, cost. Built to scan hundreds of lines; every reason lives behind a
 * click on the row. Quantities change locally only.
 */
export function OrderReview({ order, eyebrow }: { order: ProposedOrderView; eyebrow?: ReactNode; example?: boolean }) {
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

      {order.intelligenceQuestionId && (
        <InlineQuestion questionId={order.intelligenceQuestionId} lead={order.intelligenceQuestionLead} />
      )}

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
                      <td colSpan={narrow ? 4 : 5}>
                        <LineDetail line={line} quantity={q} leadTimeDays={order.leadTimeDays}
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
              <th scope="row" colSpan={narrow ? 3 : 4}>Estimated total</th>
              <td className={styles.num}>{cost(total, order.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

'use client'

import { Fragment, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { average, describeCover, describeWeeklyRate, formatMoney, plural } from '@/domain/language/plain'
import { EvidenceChart } from '@/features/recommendations/EvidenceChart'
import { InlineQuestion } from '@/features/intelligence/InlineQuestion'
import { QuickAnswer } from '@/features/work/QuickAnswer'
import { ConfidenceMark } from '@/ui/Confidence'
import { Icon } from '@/ui/Icon'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { networkMatch, networkSignal, retailerLabel, type NetworkMatch } from './network'
import { orderNote } from './OrderList'
import { freightGap, lineTotal, orderTotal, sortForReview } from './summarize'
import type { NetworkListing, OrderLineView, ProposedOrderView } from './types'
import page from './Orders.module.css'
import styles from './OrderReview.module.css'

const NARROW = '(max-width: 760px)'

/** On narrow screens three columns are hidden; a detail row must span only the visible ones. */
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

const stateText = { ok: '', review: 'Worth a look', question: 'Needs your answer' } as const

/** Level 3, on request: the evidence behind one line. */
function Evidence({ line, supplier, leadTimeDays }: { line: OrderLineView; supplier: string; leadTimeDays: number }) {
  const perWeek = average(line.weeklySales)
  return (
    <div className={styles.evidence}>
      <EvidenceChart weeklySales={line.weeklySales} />
      <dl className={styles.facts}>
        <div><dt>You sell</dt><dd>{describeWeeklyRate(perWeek)}</dd></div>
        <div><dt>On hand</dt><dd>{line.onHand > 0 ? `${line.onHand}, lasting ${describeCover(line.onHand, perWeek)}` : 'None'}</dd></div>
        <div><dt>On order</dt><dd>{line.onOrder || 'None'}</dd></div>
        <div><dt>Delivery</dt><dd>About {leadTimeDays} days from {supplier}</dd></div>
        <div><dt>Supplier stock</dt><dd>{line.availability}</dd></div>
        {line.season && <div><dt>Season</dt><dd>{line.season}</dd></div>}
        <div><dt>How sure we are</dt><dd><ConfidenceMark level={line.confidence} /></dd></div>
      </dl>
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

/** One other retailer and a (mocked) way to be introduced. No price: that's between the two stores. */
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
        ? <span className={styles.networkDone} role="status">Connection requested</span>
        : <button type="button" className={styles.textButton} onClick={() => setRequested(true)}
            aria-label={`Request connection with ${who.name}`}>Request connection</button>}
    </li>
  )
}

/** Before buying from the supplier: other retailers may already have what you need. */
function NetworkSection({ match }: { match: Exclude<NetworkMatch, { kind: 'none' }> }) {
  const titleId = useId()
  return (
    <section className={styles.network} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.notesTitle}>Available from other retailers</h2>
      {match.kind === 'full' ? (
        <>
          <p className={styles.networkGroup}>Can cover all {match.needed}</p>
          <ul className={styles.networkList}>{match.cover.map((l) => <NetworkRow key={l.id} listing={l} />)}</ul>
          {match.some.length > 0 && (
            <>
              <p className={styles.networkGroup}>Have some available</p>
              <ul className={styles.networkList}>{match.some.map((l) => <NetworkRow key={l.id} listing={l} />)}</ul>
            </>
          )}
        </>
      ) : (
        <>
          <p className={styles.networkGroup}>No single retailer has all {match.needed}, but these have some</p>
          <ul className={styles.networkList}>{match.some.map((l) => <NetworkRow key={l.id} listing={l} />)}</ul>
        </>
      )}
      <p className={styles.networkNote}>You agree price and shipping with them directly.</p>
    </section>
  )
}

/** Level 3: the answer, then one reason. Evidence waits behind a button. */
function LineDetail({ line, quantity, setQuantity, order, example }: {
  line: OrderLineView; quantity: number; setQuantity: (n: number) => void; order: ProposedOrderView; example: boolean
}) {
  const [showEvidence, setShowEvidence] = useState(false)
  const evidenceId = useId()
  const changed = quantity !== line.quantity
  const match = networkMatch(line.network, quantity)
  return (
    <div className={styles.detail}>
      <p className={styles.answer}>{line.quantity === 0 ? 'Skip for now' : `Order ${line.quantity}`}</p>
      <p className={styles.reason}>{line.reason}</p>
      {line.question && (
        <div className={styles.question}>
          <p className={styles.questionText}>{line.question.prompt}</p>
          <QuickAnswer name={`q-${line.id}`} prompt={line.question.prompt} choices={line.question.choices} example={example} />
        </div>
      )}
      {match.kind !== 'none' && <NetworkSection match={match} />}
      <div className={styles.adjust}>
        <QuantityStepper value={quantity} onChange={setQuantity} label={`Quantity for ${line.product}`} />
        {changed && (
          <button type="button" className={styles.textButton} onClick={() => setQuantity(line.quantity)}>
            Back to {line.quantity}
          </button>
        )}
        <button type="button" className={styles.textButton} aria-expanded={showEvidence} aria-controls={evidenceId}
          onClick={() => setShowEvidence((v) => !v)}>
          {showEvidence ? 'Hide the evidence' : 'Show the evidence'}
        </button>
      </div>
      <div id={evidenceId} hidden={!showEvidence}>
        {showEvidence && <Evidence line={line} supplier={order.supplier} leadTimeDays={order.leadTimeDays} />}
      </div>
    </div>
  )
}

/**
 * Level 2: what to buy from this supplier. A dense purchasing table; lines
 * that need the buyer come first. Quantities change locally only.
 */
export function OrderReview({ order, eyebrow, example = false }: { order: ProposedOrderView; eyebrow?: ReactNode; example?: boolean }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'attention' | 'network'>('all')
  const narrow = useNarrow()

  const sorted = sortForReview(order.lines)
  const attention = sorted.filter((l) => l.state !== 'ok')
  const qty = (l: OrderLineView) => quantities[l.id] ?? l.quantity
  // Compared against what we'd order now, so it follows quantity changes.
  const matches = new Map(order.lines.map((l) => [l.id, networkMatch(l.network, qty(l))]))
  const fromNetwork = sorted.filter((l) => matches.get(l.id)?.kind !== 'none')
  const shown = filter === 'all' ? sorted : filter === 'attention' ? attention : fromNetwork
  const total = orderTotal(order.lines, quantities)
  const note = orderNote({ orderBy: order.orderBy, freightGap: freightGap(order, total), currency: order.currency })
  const questions = attention.filter((l) => l.state === 'question').length
  const review = attention.length - questions

  const summary = [
    questions > 0 && `${questions} need${questions === 1 ? 's' : ''} your answer`,
    review > 0 && `${review} worth a look`,
  ].filter(Boolean).join(' and ')

  return (
    <>
      <header className={page.head}>
        {eyebrow && <p className={page.eyebrow}>{eyebrow}</p>}
        <h1 className={page.title}>{order.supplier}</h1>
        <p className={page.lead}>
          {plural(order.lines.length, 'line')}, about {formatMoney(Math.round(total), order.currency)}.
          {summary ? ` ${summary.charAt(0).toUpperCase()}${summary.slice(1)}.` : ' Nothing needs a second look.'}
          {note && <span className={styles.note}> {note}.</span>}
        </p>
        {fromNetwork.length > 0 && (
          <p className={styles.networkSummary}>
            <button type="button" className={styles.textButton} onClick={() => { setFilter('network'); setOpen(null) }}>
              {fromNetwork.length === 1 ? '1 line may be available' : `${fromNetwork.length} lines may be available`} from other retailers
            </button>
          </p>
        )}
      </header>

      {order.intelligenceQuestionId && (
        <InlineQuestion questionId={order.intelligenceQuestionId} lead={order.intelligenceQuestionLead} />
      )}

      <div className={styles.work}>
      <div className={styles.filter} role="group" aria-label="Show">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {order.lines.length}</button>
        <button type="button" aria-pressed={filter === 'attention'} onClick={() => setFilter('attention')} disabled={attention.length === 0}>
          Needs a look {attention.length}
        </button>
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
            <th scope="col" className={[styles.num, styles.wide, styles.cCost].join(' ')}>Cost</th>
            <th scope="col" className={[styles.wide, styles.cState].join(' ')}><span className="visually-hidden">Check</span></th>
          </tr>
        </thead>
        <tbody>
          {shown.map((line) => {
            const isOpen = open === line.id
            const q = qty(line)
            const signal = networkSignal(matches.get(line.id) ?? { kind: 'none' })
            return (
              <Fragment key={line.id}>
                <tr className={isOpen ? styles.openRow : undefined}>
                  <th scope="row" className={styles.product}>
                    <button type="button" className={styles.lineButton} aria-expanded={isOpen}
                      aria-controls={`${line.id}-detail`} onClick={() => setOpen(isOpen ? null : line.id)}>
                      <span className={styles.chevron} aria-hidden="true"><Icon name="chevron-right" size={14} /></span>
                      <span className={styles.name}>
                        {line.product}
                        {line.variant && <span className={styles.variant}>{line.variant}</span>}
                        {line.state !== 'ok' && <span className={[styles.state, styles.phoneOnly, line.state === 'question' && styles.ask].filter(Boolean).join(' ')}>{stateText[line.state]}</span>}
                        {signal && <span className={styles.networkSignal}>{signal}</span>}
                      </span>
                    </button>
                  </th>
                  <td className={styles.num}>{line.onHand}</td>
                  <td className={[styles.num, styles.wide].join(' ')}>{line.onOrder || <span className={styles.none}>–</span>}</td>
                  <td className={[styles.num, styles.qty].join(' ')}>
                    {q}
                    {q !== line.quantity && <span className={styles.was}> was {line.quantity}</span>}
                  </td>
                  <td className={[styles.num, styles.wide].join(' ')}>{cost(lineTotal(line, q), order.currency)}</td>
                  <td className={[styles.state, styles.wide, line.state === 'question' && styles.ask].filter(Boolean).join(' ')}>{stateText[line.state]}</td>
                </tr>
                {isOpen && (
                  <tr className={styles.detailRow} id={`${line.id}-detail`}>
                    <td colSpan={narrow ? 3 : 6}>
                      <LineDetail line={line} quantity={q} order={order} example={example}
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
            <th scope="row" colSpan={4}>Estimated total</th>
            <td className={styles.num}>{cost(total, order.currency)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      </div>
    </>
  )
}

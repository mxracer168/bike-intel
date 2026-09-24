'use client'

import { Fragment, useId, useState, type ReactNode } from 'react'
import { average, describeCover, describeWeeklyRate, formatMoney, plural } from '@/domain/language/plain'
import { EvidenceChart } from '@/features/recommendations/EvidenceChart'
import { InlineQuestion } from '@/features/intelligence/InlineQuestion'
import { QuickAnswer } from '@/features/work/QuickAnswer'
import { ConfidenceMark } from '@/ui/Confidence'
import { Icon } from '@/ui/Icon'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { orderNote } from './OrderList'
import { freightGap, lineTotal, orderTotal, sortForReview } from './summarize'
import type { OrderLineView, ProposedOrderView } from './types'
import page from './Orders.module.css'
import styles from './OrderReview.module.css'

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

/** Level 3: the answer, then one reason. Evidence waits behind a button. */
function LineDetail({ line, quantity, setQuantity, order, example }: {
  line: OrderLineView; quantity: number; setQuantity: (n: number) => void; order: ProposedOrderView; example: boolean
}) {
  const [showEvidence, setShowEvidence] = useState(false)
  const evidenceId = useId()
  const changed = quantity !== line.quantity
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
  const [filter, setFilter] = useState<'all' | 'attention'>('all')

  const sorted = sortForReview(order.lines)
  const attention = sorted.filter((l) => l.state !== 'ok')
  const shown = filter === 'all' ? sorted : attention
  const qty = (l: OrderLineView) => quantities[l.id] ?? l.quantity
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
                    <td colSpan={6}>
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

'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { formatMoney, plural } from '@/domain/language/plain'
import { Button } from '@/ui/Button'
import { Changed } from '@/ui/Changed'
import { Icon } from '@/ui/Icon'
import { exactMoney, orderGlance, priceNote, type Comparison } from './context'
import { handoffPlan, orderFile, submissionMethodLabel, type HandoffPlan, type HandoffSide } from './handoff'
import type { ProposedOrderView, SupplierOrderMethod } from './types'
import styles from './OrderHeader.module.css'

/**
 * Where the order stands. Approval and submission stay separate: an order the
 * retailer still has to send is approved, not submitted.
 */
export type OrderProgress =
  | { status: 'draft' }
  | { status: 'approved' }
  | { status: 'submitted'; method: SupplierOrderMethod }

const statusLabel = { draft: 'Draft', approved: 'Approved', submitted: 'Submitted' } as const

/** The one primary action for where the order stands, if any. */
function primaryAction(progress: OrderProgress, plan: HandoffPlan | null, onReview: () => void, onProgress: (p: OrderProgress) => void) {
  if (!plan) return null
  if (progress.status === 'draft') return { label: 'Review & submit', run: onReview }
  if (progress.status === 'approved') return { label: 'Mark as sent', run: () => onProgress({ status: 'submitted', method: plan.submissionMethod }) }
  return null
}

/**
 * The order header: a compact bar with the supplier, where the order stands,
 * the exact total and the one action. Sticky on wider screens so the total
 * and Review & submit stay in view while the lines scroll beneath it.
 */
export function OrderHeader({ order, backHref, total, lineCount, progress, onProgress, onReview }: {
  order: ProposedOrderView
  /** Where the back arrow goes (the list of orders). */
  backHref?: string
  total: number
  lineCount: number
  progress: OrderProgress
  onProgress: (next: OrderProgress) => void
  onReview: () => void
}) {
  const plan = order.handoff ? handoffPlan(order.handoff, order.supplier) : null
  const action = primaryAction(progress, plan, onReview, onProgress)

  return (
    <header className={styles.header}>
      <div className={styles.name}>
        {backHref && (
          <Link href={backHref} className={styles.back} aria-label="Back to orders"><Icon name="chevron-left" size={18} /></Link>
        )}
        <div className={styles.nameText}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{order.supplier}</h1>
            <span className={[styles.status, progress.status !== 'draft' && styles.statusDone].filter(Boolean).join(' ')}>{statusLabel[progress.status]}</span>
          </div>
          <p className={styles.sub}>{plural(lineCount, 'line')} · Proposed order</p>
        </div>
      </div>

      <div className={styles.end}>
        <p className={styles.total}>
          <span className={styles.totalLabel}>Order total</span>
          <span className={styles.totalValue}><Changed value={total}>{exactMoney(total, order.currency)}</Changed></span>
        </p>
        {action && <Button variant="primary" onClick={action.run}>{action.label}</Button>}
      </div>
    </header>
  )
}

/**
 * The order-level intelligence, between the header and the lines: the exact
 * total against the typical order, the free-freight gap, and how often this
 * supplier is ordered from. Each fact appears only when it's known; the
 * total leads, the freight gap (which can change what to add) comes next.
 */
export function OrderGlance({ order, total, lineCount, progress }: {
  order: ProposedOrderView; total: number; lineCount: number; progress: OrderProgress
}) {
  const glance = orderGlance(order, total)
  const prices = priceNote(order)
  const money = (n: number) => formatMoney(Math.ceil(n), order.currency)
  return (
    <section className={styles.glance} aria-label="This order at a glance">
      <dl className={styles.metrics}>
        <div className={[styles.metric, styles.lead].join(' ')}>
          <dt>Order total</dt>
          <dd>
            <b className={styles.value}><Changed value={total}>{exactMoney(total, order.currency)}</Changed></b>
            <span>
              {plural(lineCount, 'line')} · <span className={progress.status === 'draft' ? undefined : styles.done}>{statusLabel[progress.status]}</span>
              {glance.typical && <> · <Trend c={glance.typical.comparison} /></>}
            </span>
            {prices && <span className={styles.prices}><Icon name="alert" size={14} /> {prices}</span>}
          </dd>
        </div>
        {glance.freight && (
          <div className={styles.metric}>
            <dt>Freight</dt>
            <dd>
              <b className={[styles.valueMid, styles.gap].join(' ')}><Changed value={glance.freight.gap}>{money(glance.freight.gap)} away</Changed></b>
              <span>Free over {money(glance.freight.threshold)}</span>
              <span className={styles.track} aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.round((total / glance.freight.threshold) * 100))}%` }} />
              </span>
            </dd>
          </div>
        )}
        {glance.typical && (
          <div className={styles.metric}>
            <dt>Typical order</dt>
            <dd>
              <b className={styles.valueMid}>{money(glance.typical.amount)}</b>
              <span>{glance.typical.cadenceDays !== undefined ? `Every ~${glance.typical.cadenceDays} days` : 'To this supplier'}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}

/** ▲ 22% / ▼ 18% / ≈ Typical: a symbol and a number, so color is never the only signal. */
function Trend({ c }: { c: Comparison }) {
  if (c.direction === 'typical') return <span className={styles.flat}><span aria-hidden="true">≈</span> Typical</span>
  const up = c.direction === 'above'
  return (
    <span className={up ? styles.up : styles.down}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {c.percent}% {up ? 'above' : 'below'} typical
    </span>
  )
}

/** Along the bottom on smaller screens, where the header doesn't stay in view: total and the one action. */
export function ActionBar({ order, total, lineCount, progress, onProgress, onReview }: {
  order: ProposedOrderView; total: number; lineCount: number
  progress: OrderProgress; onProgress: (next: OrderProgress) => void; onReview: () => void
}) {
  const plan = order.handoff ? handoffPlan(order.handoff, order.supplier) : null
  const action = primaryAction(progress, plan, onReview, onProgress)
  if (!action) return null
  return (
    <div className={styles.bar}>
      <div className={styles.barTotal}>
        <span className={styles.barLabel}>{plural(lineCount, 'line')} · {statusLabel[progress.status]}</span>
        <span className={styles.barMoney}><Changed value={total}>{exactMoney(total, order.currency)}</Changed></span>
      </div>
      <Button variant="primary" onClick={action.run}>{action.label}</Button>
    </div>
  )
}

/** Once approved: what happened, the files and what's left. Sits under the header. */
export function HandoffStatus({ order, quantities, progress, example }: {
  order: ProposedOrderView; quantities: Record<string, number>; progress: OrderProgress; example?: boolean
}) {
  if (!order.handoff || progress.status === 'draft') return null
  const plan = handoffPlan(order.handoff, order.supplier)
  return <AfterApproval plan={plan} order={order} quantities={quantities} progress={progress} example={example} />
}

/** What happened (and how it was sent), the files, and what's left for the retailer. */
function AfterApproval({ plan, order, quantities, progress, example }: {
  plan: HandoffPlan; order: ProposedOrderView; quantities: Record<string, number>
  progress: Exclude<OrderProgress, { status: 'draft' }>; example?: boolean
}) {
  const sent = progress.status === 'submitted'
  // Once sent, the supplier side is finished; the point-of-sale side may still be open.
  const todo = plan.youDo.filter((t) => !(sent && t.side === 'supplier'))
  const download = (side: HandoffSide) => {
    const file = orderFile(order, quantities, side)
    const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
    a.click()
    URL.revokeObjectURL(url)
  }
  const pos = order.handoff?.pos?.name ?? 'your point of sale'
  return (
    <section className={styles.after} aria-label="What happened">
      <ul className={styles.doneList}>
        {sent && <li className={styles.method}><Icon name="check" size={14} /> {submissionMethodLabel[progress.method]}</li>}
        {plan.done.map((d) => <li key={d}><Icon name="check" size={14} /> {d}</li>)}
        {sent && plan.reaches === 'approved' && <li><Icon name="check" size={14} /> Marked as sent</li>}
      </ul>
      {plan.files.length > 0 && (
        <div className={styles.files}>
          {plan.files.map((f) => (
            <Button key={f} size="sm" onClick={() => download(f)}>
              <Icon name="file" size={14} /> {f === 'supplier' ? 'Download order file' : 'Download import file'}
            </Button>
          ))}
        </div>
      )}
      {todo.length > 0 && (
        <div className={styles.todo}>
          <h3 className={styles.label}>Still to do</h3>
          <ul>{todo.map((t) => <li key={t.text}>{t.text}</li>)}</ul>
        </div>
      )}
      {example && (
        <p className={styles.example}>
          Example only. Nothing was sent to {order.supplier.split(' ')[0]} or {pos}, and no prices or availability were rechecked.
        </p>
      )}
    </section>
  )
}

/** Review & submit: confirming approves, and submits when the supplier takes orders electronically. */
export function SubmitDialog({ order, total, lineCount, open, onClose, onProgress, example }: {
  order: ProposedOrderView; total: number; lineCount: number; open: boolean; onClose: () => void
  onProgress: (next: OrderProgress) => void; example?: boolean
}) {
  if (!order.handoff) return null
  const plan = handoffPlan(order.handoff, order.supplier)
  const confirm = () => {
    onClose()
    onProgress(plan.reaches === 'submitted' ? { status: 'submitted', method: plan.submissionMethod } : { status: 'approved' })
  }
  return (
    <ReviewDialog open={open} onClose={onClose} onConfirm={confirm} plan={plan} supplier={order.supplier}
      lineCount={lineCount} money={exactMoney(total, order.currency)} prices={priceNote(order)} example={example} />
  )
}

/** Exactly what will happen, worded from the connections, before anything does. */
function ReviewDialog({ open, onClose, onConfirm, plan, supplier, lineCount, money, prices, example }: {
  open: boolean; onClose: () => void; onConfirm: () => void; plan: HandoffPlan
  supplier: string; lineCount: number; money: string; prices: string | null; example?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="review-title" onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) dialog.current?.close() }}>
      {open && (
        <>
          <header className={styles.dialogHead}>
            <div className={styles.dialogName}>
              <h2 id="review-title" className={styles.dialogTitle} tabIndex={-1} autoFocus>Review &amp; submit</h2>
              <p className={styles.dialogMeta}>{supplier} · {plural(lineCount, 'line')} · <b>{money}</b></p>
            </div>
            <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
              <Icon name="close" />
            </button>
          </header>
          <div className={styles.dialogBody}>
            {plan.notice && <p className={styles.notice}><Icon name="info" size={16} /> {plan.notice}</p>}
            <section>
              <h3 className={styles.blockTitle}>{plan.reaches === 'submitted' ? 'When you submit' : 'When you approve'}</h3>
              <ol className={styles.steps}>
                {plan.steps.map((s) => (
                  <li key={s.text}><span className={styles.who}>{s.who}</span><span>{s.text}</span></li>
                ))}
              </ol>
            </section>
            {plan.youDo.length > 0 && (
              <section>
                <h3 className={styles.blockTitle}>Then you</h3>
                <ul className={styles.youDo}>{plan.youDo.map((t) => <li key={t.text}>{t.text}</li>)}</ul>
              </section>
            )}
            {prices && <p className={styles.prices}><Icon name="alert" size={14} /> {prices}</p>}
            {example && <p className={styles.example}>This is an example. Nothing will be sent and nothing will be rechecked.</p>}
          </div>
          <footer className={styles.dialogFoot}>
            <Button onClick={() => dialog.current?.close()}>Keep editing</Button>
            <Button variant="primary" onClick={onConfirm}>{plan.action} · {money}</Button>
          </footer>
        </>
      )}
    </dialog>
  )
}

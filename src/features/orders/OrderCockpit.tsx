'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { plural } from '@/domain/language/plain'
import { Button } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { contextRows, exactMoney, priceNote } from './context'
import { handoffPlan, orderFile, submissionMethodLabel, type HandoffPlan, type HandoffSide } from './handoff'
import type { ProposedOrderView, SupplierOrderMethod } from './types'
import styles from './OrderCockpit.module.css'

/**
 * Where the order stands. Approval and submission stay separate: an order the
 * retailer still has to send is approved, not submitted.
 */
export type OrderProgress =
  | { status: 'draft' }
  | { status: 'approved' }
  | { status: 'submitted'; method: SupplierOrderMethod }

const statusLabel = { draft: 'Draft', approved: 'Approved', submitted: 'Submitted' } as const

/**
 * The order cockpit: what this order is, what it means for this supplier, and
 * what happens when the retailer is done. A sticky column beside the lines on
 * desktop; a compact summary above them and a bar along the bottom on smaller
 * screens.
 */
export function OrderCockpit({ order, total, lineCount, quantities, progress, onProgress, example }: {
  order: ProposedOrderView
  total: number
  lineCount: number
  quantities: Record<string, number>
  progress: OrderProgress
  onProgress: (next: OrderProgress) => void
  example?: boolean
}) {
  const [reviewing, setReviewing] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const contextId = useId()
  const plan = order.handoff ? handoffPlan(order.handoff, order.supplier) : null
  const rows = contextRows(order, total, quantities)
  const prices = priceNote(order)
  const money = exactMoney(total, order.currency)

  const confirm = () => {
    if (!plan) return
    setReviewing(false)
    onProgress(plan.reaches === 'submitted' ? { status: 'submitted', method: plan.submissionMethod } : { status: 'approved' })
  }

  const action = plan && (
    <section className={[styles.action, progress.status === 'draft' && styles.actionDraft].filter(Boolean).join(' ')}>
      {progress.status === 'draft'
        ? <Button variant="primary" fullWidth onClick={() => setReviewing(true)}>Review &amp; submit</Button>
        : <AfterApproval plan={plan} order={order} quantities={quantities} progress={progress} onProgress={onProgress} example={example} />}
    </section>
  )

  return (
    <>
      <aside className={styles.cockpit} aria-label="Order summary">
        <section className={styles.summary}>
          <h2 className={styles.label}>Order total</h2>
          <p className={styles.total}>{money}</p>
          {prices && <p className={styles.prices}><Icon name="alert" size={14} /> {prices}</p>}
          <dl className={styles.facts}>
            <div><dt>Lines</dt><dd>{lineCount}</dd></div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={progress.status === 'draft' ? undefined : styles.done}>{statusLabel[progress.status]}</span>
                {progress.status === 'submitted' && <span className={styles.method}>{submissionMethodLabel[progress.method]}</span>}
              </dd>
            </div>
          </dl>
        </section>

        {/* Once approved, what happened and what's left matter more than the context. */}
        {progress.status !== 'draft' && action}

        {rows.length > 0 && (
          <section className={styles.context}>
            <h2 className={styles.label}>
              <span className={styles.contextTitle}>Order context</span>
              <button type="button" className={styles.contextToggle} aria-expanded={contextOpen} aria-controls={contextId}
                onClick={() => setContextOpen((v) => !v)}>
                Order context <Icon name="chevron-down" size={14} />
              </button>
            </h2>
            <dl id={contextId} className={[styles.rows, contextOpen && styles.rowsOpen].filter(Boolean).join(' ')}>
              {rows.map((r) => (
                <div key={r.label} className={styles.row}>
                  <dt>{r.label}</dt>
                  <dd>
                    <span className={styles.value}>{r.value}</span>
                    {r.detail && <span className={[styles.detail, r.emphasis && styles.emphasis].filter(Boolean).join(' ')}>{r.detail}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {progress.status === 'draft' && action}
      </aside>

      {plan && progress.status === 'draft' && (
        <div className={styles.bar}>
          <div className={styles.barTotal}>
            <span className={styles.barLabel}>{plural(lineCount, 'line')}</span>
            <span className={styles.barMoney}>{money}</span>
          </div>
          <Button variant="primary" onClick={() => setReviewing(true)}>Review &amp; submit</Button>
        </div>
      )}

      {plan && (
        <ReviewDialog open={reviewing} onClose={() => setReviewing(false)} onConfirm={confirm} plan={plan}
          supplier={order.supplier} lineCount={lineCount} money={money} prices={prices} example={example} />
      )}
    </>
  )
}

/** After the action: what happened, the files, what's left, and "Mark as sent" when the retailer sends it. */
function AfterApproval({ plan, order, quantities, progress, onProgress, example }: {
  plan: HandoffPlan; order: ProposedOrderView; quantities: Record<string, number>
  progress: Exclude<OrderProgress, { status: 'draft' }>; onProgress: (next: OrderProgress) => void; example?: boolean
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
    <div className={styles.after}>
      <ul className={styles.doneList}>
        {plan.done.map((d) => <li key={d}><Icon name="check" size={14} /> {d}</li>)}
        {sent && plan.reaches === 'approved' && <li><Icon name="check" size={14} /> Marked as sent</li>}
      </ul>
      {plan.files.length > 0 && (
        <div className={styles.files}>
          {plan.files.map((f) => (
            <Button key={f} size="sm" fullWidth onClick={() => download(f)}>
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
      {progress.status === 'approved' && (
        <Button variant="primary" fullWidth onClick={() => onProgress({ status: 'submitted', method: plan.submissionMethod })}>Mark as sent</Button>
      )}
      {example && (
        <p className={styles.example}>
          Example only. Nothing was sent to {order.supplier.split(' ')[0]} or {pos}, and no prices or availability were rechecked.
        </p>
      )}
    </div>
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

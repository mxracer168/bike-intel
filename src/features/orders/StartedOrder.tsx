'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatMoney, plural } from '@/domain/language/plain'
import { Icon } from '@/ui/Icon'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { addedTotal, discardStartedOrder, setAddedQuantity, useDrafts } from './drafts'
import { lineTotal } from './summarize'
import styles from './OrderReview.module.css'

/**
 * A new order started from the Catalog with a supplier that had no proposed
 * order (example only, kept in this browser). The products added, their
 * quantities and the total; more can be added from the Catalog.
 */
export function StartedOrder({ id }: { id: string }) {
  const router = useRouter()
  const drafts = useDrafts()
  const started = drafts.started[id]
  const draft = drafts.orders[id]
  if (!started) {
    return (
      <div className={styles.startedEmpty}>
        <h1 className={styles.addedTitle}>This order isn’t here.</h1>
        <p>Orders started from the Catalog are kept in this browser only.</p>
        <Link href="/orders">Back to orders</Link>
      </div>
    )
  }
  const items = draft?.added ?? []
  const total = addedTotal(draft)
  const money = (n: number) => formatMoney(n, started.currency)
  return (
    <div className={styles.started}>
      <Link href="/orders" className={styles.startedBack}><Icon name="chevron-left" size={16} />Orders</Link>
      <header className={styles.startedHead}>
        <div>
          <p className={styles.startedEyebrow}>New order · Started from the Catalog</p>
          <h1 className={styles.startedTitle}>{started.supplierName}</h1>
          <p className={styles.startedSub}>{plural(items.length, 'line')} · {money(total)}</p>
        </div>
        <Link href={`/catalog?supplier=${encodeURIComponent(started.supplierId)}`} className={styles.textButton}>Add from {started.supplierName}’s catalog →</Link>
      </header>
      {items.length > 0 ? (
        <section className={styles.added} aria-label="Products in this order">
          <ul className={styles.addedList}>
            {items.map((a) => (
              <li key={a.key} className={styles.addedRow}>
                <Link href={`/catalog/${encodeURIComponent(a.productId)}?option=${encodeURIComponent(a.optionId)}`} className={styles.addedName}>
                  {a.product}{a.variant && <>{' '}<span className={styles.variant}>{a.variant}</span></>}
                </Link>
                <QuantityStepper compact value={a.quantity} onChange={(n) => setAddedQuantity(id, a.key, n)} label={`Quantity for ${a.product}${a.variant ? ` ${a.variant}` : ''}`} />
                <span className={styles.addedUnit}>{money(a.unitCost)}</span>
                <span className={styles.addedTotal}>{money(lineTotal(a, a.quantity))}</span>
                <button type="button" className={styles.textButton} onClick={() => setAddedQuantity(id, a.key, 0)}
                  aria-label={`Remove ${a.product}${a.variant ? ` ${a.variant}` : ''}`}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
      ) : <p className={styles.startedSub}>Nothing in this order yet.</p>}
      <p className={styles.startedNote}>
        Sending a new order to {started.supplierName} isn’t part of the example yet.{' '}
        <button type="button" className={styles.textButton} onClick={() => { discardStartedOrder(id); router.push('/orders') }}>Discard this order</button>
      </p>
    </div>
  )
}

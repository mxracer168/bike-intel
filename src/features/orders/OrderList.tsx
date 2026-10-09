'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatMoney, plural } from '@/domain/language/plain'
import { Icon } from '@/ui/Icon'
import { SortHeader } from '@/ui/SortHeader'
import { nextSort, sortRows, type SortState, type SortValue } from '@/ui/sorting'
import type { OrderSummary } from './types'
import styles from './Orders.module.css'

function Count({ value }: { value: number }) {
  return value > 0 ? <>{value}</> : <span className={styles.none} aria-label="None">–</span>
}

/** The note an order carries at supplier level: its cutoff, or what free freight still needs. */
export function orderNote(o: Pick<OrderSummary, 'orderBy' | 'freightGap' | 'currency'>): string | undefined {
  const notes = [
    o.orderBy && `Order by ${o.orderBy}`,
    o.freightGap !== undefined && `${formatMoney(Math.ceil(o.freightGap), o.currency)} from free freight`,
  ].filter(Boolean)
  return notes.length ? notes.join(' · ') : undefined
}

function attention(o: OrderSummary): string {
  const parts = [
    o.questions > 0 && `${o.questions} need${o.questions === 1 ? 's' : ''} your answer`,
    o.review > 0 && `${o.review} worth a look`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Nothing to check'
}

type OrderSortKey = 'supplier' | 'lines' | 'confident' | 'review' | 'questions' | 'total'
const orderValue: Record<OrderSortKey, (o: OrderSummary) => SortValue> = {
  supplier: (o) => o.supplier,
  lines: (o) => o.lineCount,
  confident: (o) => o.confident,
  review: (o) => o.review,
  questions: (o) => o.questions,
  total: (o) => o.total,
}

/**
 * Proposed orders at supplier level: comparable numbers, one row each.
 * No line detail here; that lives on the order. Arrives in priority order;
 * any column re-sorts it.
 */
export function OrderList({ orders, label }: { orders: OrderSummary[]; label: string }) {
  const [sort, setSort] = useState<SortState<OrderSortKey> | null>(null)
  const onSort = (key: OrderSortKey) => setSort((s) => nextSort(s, key))
  const rows = sort ? sortRows(orders, orderValue[sort.key], sort.dir) : orders
  return (
    <table className={styles.list} aria-label={label}>
      <thead>
        <tr>
          <SortHeader sortKey="supplier" sort={sort} onSort={onSort}>Supplier</SortHeader>
          <SortHeader sortKey="lines" sort={sort} onSort={onSort} numeric className={styles.num}>Lines</SortHeader>
          <SortHeader sortKey="confident" sort={sort} onSort={onSort} numeric className={styles.num}>Confident</SortHeader>
          <SortHeader sortKey="review" sort={sort} onSort={onSort} numeric className={styles.num}>To review</SortHeader>
          <SortHeader sortKey="questions" sort={sort} onSort={onSort} numeric className={styles.num}>Questions</SortHeader>
          <SortHeader sortKey="total" sort={sort} onSort={onSort} numeric className={styles.num}>Estimate</SortHeader>
          <th scope="col"><span className="visually-hidden">Open</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => {
          const note = orderNote(o)
          return (
            <tr key={o.id}>
              <th scope="row">
                <div className={styles.supplier}>
                  <Link href={`/orders/${o.id}`} className={styles.rowLink}>{o.supplier}</Link>
                  {note && <span className={styles.note}>{note}</span>}
                  <span className={styles.phoneSummary}>
                    {plural(o.lineCount, 'line')} · about {formatMoney(Math.round(o.total), o.currency)}<br />{attention(o)}
                  </span>
                </div>
              </th>
              <td className={styles.num}>{o.lineCount}</td>
              <td className={styles.num}><Count value={o.confident} /></td>
              <td className={styles.num}><Count value={o.review} /></td>
              <td className={[styles.num, o.questions > 0 && styles.ask].filter(Boolean).join(' ')}><Count value={o.questions} /></td>
              <td className={styles.num}>{formatMoney(Math.round(o.total), o.currency)}</td>
              <td className={styles.go} aria-hidden="true"><Icon name="chevron-right" /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

import type { ReactNode } from 'react'
import { ariaSort, type SortState } from './sorting'
import styles from './SortHeader.module.css'

/**
 * A sortable column header. The whole header is one button; the active
 * column shows its direction with a small arrow, and others show a faint one
 * on hover or focus. `aria-sort` tells screen readers which column is sorted
 * and which way.
 */
export function SortHeader<K extends string>({ sortKey, sort, onSort, numeric = false, className, children }: {
  sortKey: K
  sort: SortState<K> | null
  onSort: (key: K) => void
  /** Right-aligned like the numbers beneath it. */
  numeric?: boolean
  className?: string
  children: ReactNode
}) {
  const active = sort?.key === sortKey
  const dir = active ? sort!.dir : 'desc'
  return (
    <th scope="col" className={className} aria-sort={ariaSort(active, dir)}>
      <button type="button" className={[styles.button, numeric && styles.numeric, active && styles.active].filter(Boolean).join(' ')}
        onClick={() => onSort(sortKey)}>
        <span className={styles.label}>{children}</span>
        <svg className={[styles.arrow, active && dir === 'asc' && styles.up].filter(Boolean).join(' ')} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 1.5v7M2 5.5l3 3 3-3" />
        </svg>
      </button>
    </th>
  )
}

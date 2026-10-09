/**
 * Sortable tables, the platform standard (docs/design-system.md, "Sortable
 * tables"): the first click on a column sorts descending, the next
 * ascending, and so on. Values sort by their type, never as text that looks
 * like a number; missing values go last in either direction. Sort the whole
 * filtered set, then window it (pages, "show more").
 */

export type SortDir = 'asc' | 'desc'
export type SortState<K extends string> = { key: K; dir: SortDir }

/** What a column sorts by: a number (quantities, money, percentages), text, a date, or nothing. */
export type SortValue = number | string | Date | null | undefined

/** Clicking `key`: descending first, then toggle. */
export function nextSort<K extends string>(current: SortState<K> | null, key: K): SortState<K> {
  if (current?.key === key) return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' }
  return { key, dir: 'desc' }
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

const missing = (v: SortValue) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))

/** Ascending comparison of two present values of the same type. */
export function compareValues(a: Exclude<SortValue, null | undefined>, b: Exclude<SortValue, null | undefined>): number {
  if (typeof a === 'string' && typeof b === 'string') return collator.compare(a, b)
  const x = a instanceof Date ? a.getTime() : (a as number)
  const y = b instanceof Date ? b.getTime() : (b as number)
  return x === y ? 0 : x < y ? -1 : 1
}

/** A sorted copy. Missing values go last; ties keep `tiebreak` order, then the incoming order. */
export function sortRows<T>(rows: T[], value: (row: T) => SortValue, dir: SortDir, tiebreak?: (a: T, b: T) => number): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return rows.map((row, i) => ({ row, i, v: value(row) })).sort((a, b) => {
    const am = missing(a.v), bm = missing(b.v)
    if (am || bm) return am === bm ? a.i - b.i : am ? 1 : -1
    return sign * compareValues(a.v!, b.v!) || (tiebreak?.(a.row, b.row) ?? 0) || a.i - b.i
  }).map((x) => x.row)
}

export const ariaSort = (active: boolean, dir: SortDir) => (active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined)

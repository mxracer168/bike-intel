import { describe, expect, it } from 'vitest'
import { ariaSort, nextSort, sortRows } from '@/ui/sorting'

describe('sortable tables', () => {
  it('sorts descending first, then toggles', () => {
    const first = nextSort(null, 'value')
    expect(first).toEqual({ key: 'value', dir: 'desc' })
    const second = nextSort(first, 'value')
    expect(second.dir).toBe('asc')
    expect(nextSort(second, 'value').dir).toBe('desc')
    // A different column starts descending again.
    expect(nextSort(second, 'name')).toEqual({ key: 'name', dir: 'desc' })
  })

  it('respects the data type', () => {
    const nums = [{ v: 9 }, { v: 10 }, { v: 1.5 }]
    expect(sortRows(nums, (r) => r.v, 'desc').map((r) => r.v)).toEqual([10, 9, 1.5])
    const text = ['tube 29', 'Tube 4', 'apple']
    expect(sortRows(text, (t) => t, 'asc')).toEqual(['apple', 'Tube 4', 'tube 29'])
    const dates = [new Date('2026-10-02'), new Date('2026-09-30'), new Date('2026-11-01')]
    expect(sortRows(dates, (d) => d, 'asc').map((d) => d.toISOString().slice(0, 10))).toEqual(['2026-09-30', '2026-10-02', '2026-11-01'])
  })

  it('puts missing values last in either direction, and keeps ties stable', () => {
    const rows = [{ id: 'a', v: null }, { id: 'b', v: 2 }, { id: 'c', v: 2 }, { id: 'd', v: 5 }]
    expect(sortRows(rows, (r) => r.v, 'desc').map((r) => r.id)).toEqual(['d', 'b', 'c', 'a'])
    expect(sortRows(rows, (r) => r.v, 'asc').map((r) => r.id)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('tells screen readers the direction of the sorted column only', () => {
    expect(ariaSort(true, 'desc')).toBe('descending')
    expect(ariaSort(true, 'asc')).toBe('ascending')
    expect(ariaSort(false, 'desc')).toBeUndefined()
  })
})

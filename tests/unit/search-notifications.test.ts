import { describe, expect, it } from 'vitest'
import { demoConnections } from '@/demo/connections'
import { demoOrders } from '@/demo/orders'
import { demoSuppliers } from '@/demo/suppliers'
import {
  availabilityNotifications, connectionNotifications, deadlineNotifications, questionNotifications, sortNotifications, upcomingDate,
} from '@/features/notifications/notifications'
import { pageEntries } from '@/features/search/pages'
import { normalize, searchEntries, type SearchEntry } from '@/features/search/search'
import { orderEntries, programEntries, supplierEntries } from '@/features/search/sources'

const entry = (id: string, group: SearchEntry['group'], title: string, extra: Partial<SearchEntry> = {}): SearchEntry =>
  ({ id, group, title, href: `/${id}`, ...extra })

describe('search', () => {
  it('ignores case, accents and curly quotes', () => {
    expect(normalize('  Stan’s  NoTubes ')).toBe("stan's notubes")
  })

  it('needs every word, anywhere in the entry', () => {
    const entries = [entry('a', 'product', 'Maxxis Minion DHF', { detail: '29 × 2.5' }), entry('b', 'product', 'Maxxis Assegai')]
    expect(searchEntries(entries, 'minion maxxis')[0]!.results.map((r) => r.id)).toEqual(['a'])
    expect(searchEntries(entries, 'nothing')).toEqual([])
  })

  it('puts the best match first and orders groups by their best match', () => {
    const entries = [
      entry('page', 'page', 'Suppliers', { keywords: ['northline'] }),
      entry('sup', 'supplier', 'Northline Distribution'),
      entry('line', 'orderLine', 'Shimano chain', { detail: 'Northline order' }),
    ]
    const groups = searchEntries(entries, 'northline')
    expect(groups.map((g) => g.group)).toEqual(['supplier', 'page', 'orderLine'])
    expect(groups[0]!.label).toBe('Suppliers')
  })

  it('finds pages by the words people use', () => {
    const groups = searchEntries(pageEntries(), 'home')
    expect(groups[0]!.results[0]!.href).toBe('/today')
    expect(pageEntries().map((p) => p.title)).toContain('Excess inventory')
  })

  it('only finds what exists: orders, lines, suppliers and programs from the data', () => {
    const entries = [
      ...orderEntries(demoOrders),
      ...supplierEntries(demoSuppliers.map((s) => s.entry)),
      ...programEntries(demoSuppliers.map((s) => s.presentation)),
    ]
    const order = searchEntries(entries, 'northline')[0]!
    expect(order.results[0]).toMatchObject({ title: 'Northline Distribution order', href: '/orders/northline' })
    const line = searchEntries(entries, 'kmc x11').find((g) => g.group === 'orderLine')!
    expect(line.results[0]!.href).toMatch(/^\/orders\/northline\?line=/)
    expect(searchEntries(entries, 'tire pre-season').find((g) => g.group === 'program')?.results[0]?.href).toBe('/suppliers/demo-northline')
  })
})

describe('notifications', () => {
  const oct9 = new Date(2026, 9, 9)

  it('reads supplier dates without a year, and drops ones that have passed', () => {
    expect(upcomingDate('October 31', oct9)?.getDate()).toBe(31)
    expect(upcomingDate('October 2', oct9)).toBeNull()
    expect(upcomingDate('soon', oct9)).toBeNull()
  })

  it('connections that stopped working', () => {
    const n = connectionNotifications(demoConnections('Summit Cycles'))
    expect(n.map((x) => x.title)).toEqual(['Quality Bicycle Products needs attention'])
    expect(n[0]!.href).toBe('/connections?connection=qbp')
  })

  it('items a supplier can’t ship, one notification per order, opening the first one', () => {
    const n = availabilityNotifications(demoOrders)
    expect(n).toHaveLength(1)
    expect(n[0]!.title).toBe('2 items on your Northline order can’t ship now')
    expect(n[0]!.href).toMatch(/^\/orders\/northline\?line=/)
  })

  it('programs closing within 30 days only', () => {
    const titles = deadlineNotifications(demoSuppliers.map((s) => s.presentation), oct9).map((n) => n.title)
    expect(titles).toEqual(['Northline’s Winter service parts program closes October 31'])
  })

  it('a changed state reads as new: the id is a fingerprint of the state', () => {
    const [before] = availabilityNotifications(demoOrders)
    const changed = demoOrders.map((o) => ({ ...o, lines: o.lines.filter((l) => !l.product.startsWith('KMC')) }))
    const [after] = availabilityNotifications(changed)
    expect(after!.id).not.toBe(before!.id)
  })

  it('new questions, then sorted problems first', () => {
    const q = questionNotifications([
      { id: 'q1', prompt: 'Are you running a winter service special?', topic: 'Winter service special', choices: [], status: 'open' },
      { id: 'q2', prompt: 'Old one', choices: [], status: 'answered' },
    ])
    expect(q.map((x) => x.title)).toEqual(['New question: Winter service special'])
    const sorted = sortNotifications([...q, ...connectionNotifications(demoConnections('S'))])
    expect(sorted[0]!.kind).toBe('connection')
  })
})

import { describe, expect, it } from 'vitest'
import { demoConnections } from '@/demo/connections'
import { filterConnections } from '@/features/connections/filter'

const all = demoConnections('Summit Cycles')
const ids = (list: { id: string }[]) => list.map((c) => c.id)

describe('connections library filter', () => {
  it('shows everything by default', () => {
    expect(filterConnections(all, 'all', '')).toHaveLength(all.length)
  })

  it('counts connections that need attention as connected', () => {
    expect(ids(filterConnections(all, 'connected', ''))).toEqual(['hlc', 'northline', 'qbp'])
  })

  it('filters by type', () => {
    expect(ids(filterConnections(all, 'pos', ''))).toEqual(['lightspeed', 'shopify'])
    expect(filterConnections(all, 'supplier', '').every((c) => c.kind === 'supplier')).toBe(true)
  })

  it('searches name, type and description, ignoring case', () => {
    expect(ids(filterConnections(all, 'all', 'hlc'))).toEqual(['hlc'])
    expect(ids(filterConnections(all, 'all', 'point of'))).toEqual(['lightspeed', 'shopify'])
    expect(filterConnections(all, 'pos', 'shimano')).toEqual([])
  })
})

describe('demo credentials', () => {
  it('never carry a full secret: masked values show only the last four', () => {
    for (const c of all) for (const cred of c.credentials ?? []) {
      if (cred.masked) expect(cred.value).toMatch(/^•+[A-Z0-9]{4}$/)
    }
  })

  it('derive the HLC caller name from the retailer name', () => {
    const hlc = all.find((c) => c.id === 'hlc')
    expect(hlc?.credentials?.find((c) => !c.masked)?.value).toBe('SummitCycles')
  })
})

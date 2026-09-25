import { describe, expect, it } from 'vitest'
import { networkMatch, networkSignal } from '@/features/orders/network'
import type { NetworkListing } from '@/features/orders/types'

const l = (id: string, available: number): NetworkListing => ({ id, retailer: { name: id, place: 'Somewhere, SC' }, available })

describe('retailer network matches', () => {
  it('full: retailers who can each cover the whole quantity come first, largest first', () => {
    const m = networkMatch([l('a', 2), l('b', 8), l('c', 4), l('d', 5), l('e', 1)], 4)
    expect(m.kind).toBe('full')
    if (m.kind !== 'full') return
    expect(m.cover.map((x) => x.id)).toEqual(['b', 'd', 'c'])
    expect(m.some.map((x) => x.id)).toEqual(['a', 'e'])
    expect(networkSignal(m)).toBe('3 retailers can cover all 4')
  })

  it('partial: some available, nobody has all of it, and no split is proposed', () => {
    const m = networkMatch([l('a', 2), l('b', 1), l('c', 3)], 4)
    expect(m.kind).toBe('partial')
    if (m.kind !== 'partial') return
    expect(m.some.map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(networkSignal(m)).toBe('3 retailers have some available')
  })

  it('none: nothing listed, nothing with units, or nothing needed means nothing shown', () => {
    expect(networkSignal(networkMatch(undefined, 4))).toBeNull()
    expect(networkSignal(networkMatch([l('a', 0)], 4))).toBeNull()
    expect(networkSignal(networkMatch([l('a', 5)], 0))).toBeNull()
  })

  it('reads naturally for one retailer', () => {
    expect(networkSignal(networkMatch([l('a', 6)], 4))).toBe('1 retailer can cover all 4')
    expect(networkSignal(networkMatch([l('a', 1)], 4))).toBe('1 retailer has some available')
  })
})

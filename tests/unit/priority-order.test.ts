import { describe, expect, it } from 'vitest'
import { applyUserOrder, isCustomOrder, moveTo } from '@/features/work/order'

const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('user order over system priority', () => {
  it('uses the system order until the retailer changes it', () => {
    expect(ids(applyUserOrder(items, null))).toEqual(['a', 'b', 'c', 'd'])
    expect(isCustomOrder(items, applyUserOrder(items, null))).toBe(false)
  })

  it('applies the retailer order without changing the system order', () => {
    const system = [...items]
    expect(ids(applyUserOrder(system, ['c', 'a', 'b', 'd']))).toEqual(['c', 'a', 'b', 'd'])
    expect(ids(system)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('puts new items at their system position and ignores ones that are gone', () => {
    const today = [{ id: 'new' }, { id: 'a' }, { id: 'c' }]
    expect(ids(applyUserOrder(today, ['c', 'b', 'a']))).toEqual(['new', 'c', 'a'])
  })

  it('moves an item, clamped to the list', () => {
    expect(moveTo(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(moveTo(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a'])
    expect(moveTo(['a', 'b', 'c'], 'b', -3)).toEqual(['b', 'a', 'c'])
  })
})

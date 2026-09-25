import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { businessTabs, isCurrent, navigation } from '@/content/navigation'

describe('primary navigation', () => {
  it('is the approved flat list, starting with Today', () => {
    expect(navigation.map((i) => i.label)).toEqual(['Today', 'Orders', 'Inventory', 'Programs', 'Suppliers', 'Insights', 'Connections', 'Business'])
  })

  it('points every item and business tab at a real page', () => {
    const missing = [...navigation, ...businessTabs]
      .map((i) => i.href)
      .filter((href) => !existsSync(join('src/app/(app)', href, 'page.tsx')))
    expect(missing).toEqual([])
  })

  it('has no duplicate destinations', () => {
    const hrefs = navigation.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('keeps the old destinations as pages, so old links still work', () => {
    for (const href of ['/recommendations', '/performance', '/opportunities']) {
      expect(existsSync(join('src/app/(app)', href, 'page.tsx'))).toBe(true)
    }
  })

  it('marks sub-pages as part of their section', () => {
    expect(isCurrent('/suppliers/demo-northline', '/suppliers')).toBe(true)
    expect(isCurrent('/orders/northline', '/orders')).toBe(true)
    expect(isCurrent('/business/team', '/business')).toBe(true)
    expect(isCurrent('/supplierships', '/suppliers')).toBe(false)
  })
})

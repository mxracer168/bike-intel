import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { allNavItems, isCurrent, navigation } from '@/content/navigation'

describe('primary navigation', () => {
  it('starts with Today', () => {
    expect(navigation[0]?.items[0]).toEqual({ href: '/today', label: 'Today' })
  })

  it('has the approved sections in order', () => {
    expect(navigation.map((s) => s.label ?? null)).toEqual([null, 'Buying', 'Suppliers', 'Insights', 'Business'])
  })

  it('points every item at a real page', () => {
    const missing = allNavItems
      .map((i) => i.href)
      .filter((href) => !existsSync(join('src/app/(app)', href, 'page.tsx')))
    expect(missing).toEqual([])
  })

  it('has no duplicate destinations', () => {
    const hrefs = allNavItems.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('marks sub-pages as part of their section', () => {
    expect(isCurrent('/suppliers/demo-northline', '/suppliers')).toBe(true)
    expect(isCurrent('/suppliers', '/suppliers')).toBe(true)
    expect(isCurrent('/supplierships', '/suppliers')).toBe(false)
  })
})

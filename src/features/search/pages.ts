import { businessTabs, inventoryTabs, navigation } from '@/content/navigation'
import type { SearchEntry } from './search'

/** Other words people use for a page. */
const KEYWORDS: Record<string, string[]> = {
  '/today': ['today', 'home', 'priorities', 'health'],
  '/orders': ['purchase orders', 'proposed orders', 'buying'],
  '/inventory': ['stock', 'products', 'on hand'],
  '/inventory/excess': ['overstock', 'network', 'wholesale market value'],
  '/programs': ['booking', 'preseason'],
  '/suppliers': ['distributors', 'vendors', 'directory'],
  '/insights': ['performance', 'patterns', 'outcomes'],
  '/connections': ['integrations', 'point of sale', 'pos', 'lightspeed'],
  '/business/profile': ['business instructions', 'what we know', 'rules'],
  '/business/locations': ['stores', 'shops'],
  '/business/team': ['people', 'members', 'invite'],
}

/** Every page in the navigation, and the pages inside Business and Inventory. */
export function pageEntries(): SearchEntry[] {
  const seen = new Set<string>()
  const pages = [
    ...navigation.filter((n) => n.href !== '/business').map((n) => ({ ...n, detail: undefined as string | undefined })),
    ...inventoryTabs.filter((t) => t.href !== '/inventory').map((t) => ({ ...t, detail: 'Inventory' })),
    ...businessTabs.map((t) => ({ ...t, label: t.label === 'Profile' ? 'Business profile' : t.label, detail: 'Business' })),
  ]
  return pages.flatMap((p) => {
    if (seen.has(p.href)) return []
    seen.add(p.href)
    return [{ id: `page:${p.href}`, group: 'page' as const, title: p.label, detail: p.detail, href: p.href, keywords: KEYWORDS[p.href] }]
  })
}

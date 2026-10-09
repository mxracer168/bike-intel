/**
 * Global search: one shape for anything findable, and one ranking. Sources
 * (pages, suppliers, orders, products…) each turn what already exists into
 * entries; adding a kind of thing to search means adding a source, not
 * changing the search experience. Nothing here invents entries.
 */

export type SearchGroup = 'page' | 'order' | 'orderLine' | 'supplier' | 'program' | 'product' | 'connection' | 'location'

export const searchGroupLabel: Record<SearchGroup, string> = {
  page: 'Pages',
  order: 'Orders',
  orderLine: 'On proposed orders',
  supplier: 'Suppliers',
  program: 'Programs',
  product: 'Inventory',
  connection: 'Connections',
  location: 'Locations',
}

/** Tie-break when two groups match equally well. */
const GROUP_ORDER: SearchGroup[] = ['page', 'order', 'supplier', 'program', 'product', 'orderLine', 'connection', 'location']

export type SearchEntry = {
  /** Unique across all sources, e.g. "supplier:demo-northline". */
  id: string
  group: SearchGroup
  title: string
  /** One quiet line of context: "79 lines · $4,824.10". */
  detail?: string
  href: string
  /** Other words it should be found by ("home", "today"). */
  keywords?: string[]
}

export type SearchResultGroup = { group: SearchGroup; label: string; results: SearchEntry[] }

/** Lower case, no accents, straight quotes, single spaces. */
export function normalize(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

/** 0 when it doesn't match; higher is better. Every word of the query must appear somewhere. */
export function score(entry: SearchEntry, query: string): number {
  const q = normalize(query)
  if (!q) return 0
  const title = normalize(entry.title)
  const haystack = [title, normalize(entry.detail ?? ''), ...(entry.keywords ?? []).map(normalize)].join(' \u0000 ')
  const words = q.split(' ')
  if (!words.every((w) => haystack.includes(w))) return 0
  if (title === q) return 100
  if (title.startsWith(q)) return 80
  if (new RegExp(`(^|[^a-z0-9])${escape(q)}`).test(title)) return 60
  if (title.includes(q)) return 45
  if (words.every((w) => title.includes(w))) return 35
  if ((entry.keywords ?? []).some((k) => normalize(k).startsWith(q))) return 30
  return 10
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Matching entries, grouped. Groups are ordered by their best match, so a
 * supplier named exactly what was typed comes before pages that merely
 * mention it; within a group, best match first.
 */
export function searchEntries(entries: SearchEntry[], query: string, perGroup = 5): SearchResultGroup[] {
  const scored = entries.map((e) => ({ e, s: score(e, query) })).filter((x) => x.s > 0)
  const byGroup = new Map<SearchGroup, { e: SearchEntry; s: number }[]>()
  for (const x of scored) byGroup.set(x.e.group, [...(byGroup.get(x.e.group) ?? []), x])
  return [...byGroup.entries()]
    .map(([group, xs]) => {
      xs.sort((a, b) => b.s - a.s || a.e.title.length - b.e.title.length || a.e.title.localeCompare(b.e.title))
      return { group, best: xs[0]!.s, results: xs.slice(0, perGroup).map((x) => x.e) }
    })
    .sort((a, b) => b.best - a.best || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
    .map(({ group, results }) => ({ group, label: searchGroupLabel[group], results }))
}

import type { FacetKey, Filters, SortKey } from './search'

/**
 * Catalog state lives in the address (search, filters, sort, view), so the
 * browser's Back returns to the same results and a view can be shared.
 * category=Tires&brand=Maxxis&from=Cascade+Components&attr.wheel_size=622&q=minion&sort=price&view=list
 * The Supplier filter is "from", since "supplier" scopes the page to one supplier's catalog.
 */
export type CatalogState = { query: string; filters: Filters; sort: SortKey; view: 'grid' | 'list' }

const PARAM: Partial<Record<FacetKey, string>> = { supplier: 'from' }
const GENERAL: FacetKey[] = ['category', 'brand', 'supplier', 'availability', 'intelligence']
const paramFor = (key: FacetKey) => (key.startsWith('attr:') ? `attr.${key.slice(5)}` : PARAM[key] ?? key)
const SORTS: SortKey[] = ['best', 'price', 'brand', 'availability']

type Params = Record<string, string | string[] | undefined>
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

export function readCatalogState(params: Params): CatalogState {
  const filters: Filters = {}
  for (const [name, value] of Object.entries(params)) {
    const key: FacetKey | undefined = GENERAL.find((k) => paramFor(k) === name)
      ?? (/^attr\.[a-z_]{1,40}$/.test(name) ? `attr:${name.slice(5)}` : undefined)
    const values = list(value).map((v) => v.slice(0, 100)).filter(Boolean).slice(0, 20)
    if (key && values.length) filters[key] = values
  }
  const q = list(params.q)[0] ?? ''
  const sort = list(params.sort)[0] as SortKey | undefined
  return {
    query: q.slice(0, 100),
    filters,
    sort: sort && SORTS.includes(sort) ? sort : 'best',
    view: list(params.view)[0] === 'list' ? 'list' : 'grid',
  }
}

export function catalogQuery(state: CatalogState, keep: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(keep)) if (v) p.set(k, v)
  if (state.query.trim()) p.set('q', state.query.trim())
  for (const [key, values] of Object.entries(state.filters)) {
    for (const v of values ?? []) p.append(paramFor(key as FacetKey), v)
  }
  if (state.sort !== 'best') p.set('sort', state.sort)
  if (state.view === 'list') p.set('view', 'list')
  const s = p.toString()
  return s ? `?${s}` : ''
}

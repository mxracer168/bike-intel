import { attributeLabels, categoryFacets } from './attributes'
import type { CatalogOffer, CatalogProduct } from './types'

/**
 * Catalog discovery as pure functions: search, filters with counts that
 * follow the result set, contextual attribute filters, and named sorts.
 * Identity is not presentation: a result is a Product (its Variants
 * collapsed), and attribute filters match when any Variant matches.
 */
export type FacetKey = 'category' | 'brand' | 'supplier' | 'availability' | 'intelligence' | `attr:${string}`
export type Filters = Partial<Record<FacetKey, string[]>>
export type SortKey = 'best' | 'price' | 'brand' | 'availability'

export const sortLabels: Record<SortKey, string> = {
  best: 'Best Match',
  price: 'Price: low to high',
  brand: 'Brand',
  availability: 'Availability',
}

const availabilityRank = { 'Available now': 0, 'Low availability': 1, Backorder: 2, 'Not reported': 3 } as const
export type Availability = keyof typeof availabilityRank

/** One product as a result: what a card or row shows, all derived from its Variants and offers. */
export type ProductSummary = {
  product: CatalogProduct
  optionCount: number
  suppliers: string[]
  /** Lowest cost per canonical unit among the offers in view. */
  fromCost?: number
  currency: string
  availability: Availability
  intelligence: 'Replenishment recommended' | 'In stock' | 'Not in stock'
  /** One line of what it means to this retailer now. */
  signal?: { text: string; tone: 'info' | 'good' | 'neutral' }
}

function offersIn(p: CatalogProduct, supplierId?: string): CatalogOffer[] {
  return p.variants.flatMap((v) => v.offers).filter((o) => !supplierId || o.supplierId === supplierId)
}

function availabilityOf(offers: CatalogOffer[]): Availability {
  if (offers.some((o) => o.status === 'available')) return 'Available now'
  if (offers.some((o) => o.status === 'limited')) return 'Low availability'
  if (offers.some((o) => o.status === 'delayed' || o.status === 'out')) return 'Backorder'
  return 'Not reported'
}

export function summarize(p: CatalogProduct, supplierId?: string): ProductSummary {
  const offers = offersIn(p, supplierId)
  const costs = offers.map((o) => o.unitCost / o.pack)
  const onHand = p.variants.reduce((n, v) => n + v.own.onHand, 0)
  const onOrder = p.variants.reduce((n, v) => n + v.own.onOrder, 0)
  const recommended = p.variants.filter((v) => v.own.recommended && v.own.recommended.quantity > 0)
  const usual = offers.find((o) => o.usual)
  let signal: ProductSummary['signal']
  if (recommended.length > 0) signal = { text: 'Replenishment recommended', tone: 'info' }
  else if (onHand > 0 || onOrder > 0) signal = { text: [`${onHand} on hand`, onOrder > 0 && `${onOrder} incoming`].filter(Boolean).join(' · '), tone: 'neutral' }
  else if (usual) signal = { text: `${usual.supplierName} is your usual supplier`, tone: 'good' }
  return {
    product: p,
    optionCount: p.variants.length,
    suppliers: [...new Set(offers.map((o) => o.supplierName))],
    fromCost: costs.length ? Math.min(...costs) : undefined,
    currency: offers[0]?.currency ?? 'USD',
    availability: availabilityOf(offers),
    intelligence: recommended.length > 0 ? 'Replenishment recommended' : onHand > 0 ? 'In stock' : 'Not in stock',
    signal,
  }
}

function valuesFor(s: ProductSummary, key: FacetKey): string[] {
  switch (key) {
    case 'category': return [s.product.category]
    case 'brand': return [s.product.brand]
    case 'supplier': return s.suppliers
    case 'availability': return [s.availability]
    case 'intelligence': return [s.intelligence]
    default: {
      const attr = key.slice(5)
      return [...new Set(s.product.variants.map((v) => v.attributes[attr]).filter(Boolean).map((a) => String(a!.value)))]
    }
  }
}

export function matches(s: ProductSummary, filters: Filters, omit?: FacetKey): boolean {
  return (Object.entries(filters) as [FacetKey, string[] | undefined][]).every(([key, selected]) => {
    if (key === omit || !selected?.length) return true
    const have = valuesFor(s, key)
    return selected.some((v) => have.includes(v))
  })
}

/** How well a product matches the words typed (0 = not at all). */
export function relevance(s: ProductSummary, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const name = s.product.name.toLowerCase()
  const brand = s.product.brand.toLowerCase()
  const rest = [s.product.category, ...s.suppliers, ...s.product.variants.flatMap((v) => [v.label, ...Object.values(v.attributes).map((a) => a.designation)])]
    .join(' ').toLowerCase()
  let score = 0
  for (const w of words) {
    if (name.startsWith(w)) score += 6
    else if (name.split(/[\s-]+/).some((t) => t.startsWith(w))) score += 4
    else if (brand.startsWith(w)) score += 3
    else if (name.includes(w)) score += 2
    else if (rest.includes(w)) score += 1
    else return 0
  }
  return score
}

export function sortResults(list: { s: ProductSummary; score: number }[], sort: SortKey): ProductSummary[] {
  const byName = (a: ProductSummary, b: ProductSummary) => a.product.name.localeCompare(b.product.name)
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'price': return (a.s.fromCost ?? Infinity) - (b.s.fromCost ?? Infinity) || byName(a.s, b.s)
      case 'brand': return a.s.product.brand.localeCompare(b.s.product.brand) || byName(a.s, b.s)
      case 'availability': return availabilityRank[a.s.availability] - availabilityRank[b.s.availability] || byName(a.s, b.s)
      default: return b.score - a.score || byName(a.s, b.s)
    }
  }).map((x) => x.s)
}

export type FacetOption = { value: string; label: string; count: number }
export type Facet = { key: FacetKey; label: string; options: FacetOption[] }

/** Option counts for one facet, counting results as if this facet weren't applied. */
function optionsFor(all: ProductSummary[], filters: Filters, key: FacetKey): FacetOption[] {
  const counts = new Map<string, { count: number; labels: Set<string> }>()
  for (const s of all) {
    if (!matches(s, filters, key)) continue
    for (const v of valuesFor(s, key)) {
      const entry = counts.get(v) ?? { count: 0, labels: new Set<string>() }
      entry.count += 1
      if (key.startsWith('attr:')) {
        const attr = key.slice(5)
        for (const variant of s.product.variants) {
          const a = variant.attributes[attr]
          if (a && String(a.value) === v) entry.labels.add(a.designation)
        }
      }
      counts.set(v, entry)
    }
  }
  const options = [...counts.entries()].map(([value, { count, labels }]) => ({
    value, count, label: labels.size ? [...labels].join(' / ') : value,
  }))
  if (key.startsWith('attr:')) {
    return options.sort((a, b) => (Number(a.value) - Number(b.value)) || a.label.localeCompare(b.label))
  }
  if (key === 'availability') return options.sort((a, b) => availabilityRank[a.value as Availability] - availabilityRank[b.value as Availability])
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * The filters worth showing for these results: the general ones, then the
 * category's own attributes once the results narrow to one category. A
 * filter with a single option (and nothing chosen) says nothing and is left out.
 */
export function facetsFor(all: ProductSummary[], filters: Filters, scopedToSupplier: boolean): Facet[] {
  const general: [FacetKey, string][] = [
    ['category', 'Category'], ['brand', 'Brand'], ...(scopedToSupplier ? [] : [['supplier', 'Supplier'] as [FacetKey, string]]),
    ['availability', 'Availability'], ['intelligence', 'Buying Intelligence'],
  ]
  const narrowed = all.filter((s) => matches(s, filters))
  const categories = new Set(narrowed.map((s) => s.product.category))
  const category = categories.size === 1 ? [...categories][0]! : undefined
  const attrs = category ? categoryFacets[category] ?? [] : []
  const facets: Facet[] = [
    ...general.map(([key, label]) => ({ key, label, options: optionsFor(all, filters, key) })),
    ...attrs.map((a) => ({ key: `attr:${a}` as FacetKey, label: attributeLabels[a] ?? a, options: optionsFor(all, filters, `attr:${a}`) })),
  ]
  return facets.filter((f) => f.options.length > 1 || (filters[f.key]?.length ?? 0) > 0)
}

/** Everything a results view needs, in one pass. */
export function discover(products: CatalogProduct[], { query, filters, sort, supplierId }: {
  query: string; filters: Filters; sort: SortKey; supplierId?: string
}) {
  const inScope = products.filter((p) => !supplierId || offersIn(p, supplierId).length > 0).map((p) => summarize(p, supplierId))
  const searched = inScope.map((s) => ({ s, score: relevance(s, query) })).filter((x) => x.score > 0)
  const results = sortResults(searched.filter((x) => matches(x.s, filters)), sort)
  return { results, total: searched.length, facets: facetsFor(searched.map((x) => x.s), filters, Boolean(supplierId)) }
}

/** Active filters as removable chips, with readable labels. */
export function activeFilters(filters: Filters, facets: Facet[]): { key: FacetKey; value: string; label: string }[] {
  return (Object.entries(filters) as [FacetKey, string[] | undefined][]).flatMap(([key, values]) =>
    (values ?? []).map((value) => ({
      key, value,
      label: facets.find((f) => f.key === key)?.options.find((o) => o.value === value)?.label ?? value,
    })))
}

export function toggle(filters: Filters, key: FacetKey, value: string): Filters {
  const current = filters[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  const out = { ...filters }
  if (next.length) out[key] = next
  else delete out[key]
  return out
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { plural } from '@/domain/language/plain'
import { unitPrice } from '@/features/network/pricing'
import { Icon } from '@/ui/Icon'
import { ProductImage } from './ProductImage'
import { activeFilters, discover, sortLabels, toggle, type Facet, type FacetKey, type Filters, type ProductSummary, type SortKey } from './search'
import type { CatalogProduct } from './types'
import { catalogQuery, type CatalogState } from './url'
import styles from './Catalog.module.css'

/**
 * Catalog discovery: a compact control bar that stays under the top bar
 * (search, sort, filters, list or grid), a filter rail beside the results
 * when there is room, and the results as cards or rows. Everything here is
 * derived from the products passed in; state is kept in the address.
 */
export function CatalogBrowser({ products, initial, supplierId }: {
  products: CatalogProduct[]
  initial: CatalogState
  /** Only this supplier's offers (the supplier's catalog). */
  supplierId?: string
}) {
  const [query, setQuery] = useState(initial.query)
  const [filters, setFilters] = useState<Filters>(initial.filters)
  const [sort, setSort] = useState<SortKey>(initial.sort)
  const [view, setView] = useState<'grid' | 'list'>(initial.view)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const found = useMemo(() => discover(products, { query, filters, sort, supplierId }), [products, query, filters, sort, supplierId])
  const chips = activeFilters(filters, found.facets)
  const productHref = (id: string) => `/catalog/${encodeURIComponent(id)}${supplierId ? `?supplier=${encodeURIComponent(supplierId)}` : ''}`

  // Keep the address in step, without a navigation, so Back returns here as it was.
  useEffect(() => {
    const next = `${window.location.pathname}${catalogQuery({ query, filters, sort, view }, { supplier: supplierId })}`
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', next)
  }, [query, filters, sort, view, supplierId])

  const onToggle = (key: FacetKey, value: string) => setFilters((f) => toggle(f, key, value))
  const clearAll = () => setFilters({})

  return (
    <div className={styles.browser}>
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <label className={styles.search}>
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search the catalog</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value.slice(0, 100))}
              placeholder="Search products, brands, suppliers, or sizes" autoComplete="off" />
            {query && (
              <button type="button" className={styles.searchClear} aria-label="Clear search" onClick={() => setQuery('')}>
                <Icon name="close" size={14} />
              </button>
            )}
          </label>
          <label className={styles.sort}>
            <Icon name="sort" size={16} />
            <span className={styles.sortLabel}>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort products">
              {(Object.keys(sortLabels) as SortKey[]).map((k) => <option key={k} value={k}>{sortLabels[k]}</option>)}
            </select>
          </label>
          <button type="button" className={styles.filtersButton} onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <Icon name="filter" size={16} />
            Filters
            {chips.length > 0 && <span className={styles.badge} aria-label={`${chips.length} selected`}>{chips.length}</span>}
          </button>
          <div className={styles.views} role="group" aria-label="Show products as">
            <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Grid">
              <Icon name="grid" size={16} />
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List">
              <Icon name="list" size={16} />
            </button>
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className={styles.chips}>
          <span className={styles.chipsLabel}>Active filters</span>
          {chips.map((c) => (
            <button type="button" key={`${c.key}:${c.value}`} className={styles.chip} onClick={() => onToggle(c.key, c.value)}
              aria-label={`Remove filter: ${c.label}`}>
              {c.label}<Icon name="close" size={12} />
            </button>
          ))}
          <button type="button" className={styles.clearAll} onClick={clearAll}>Clear all</button>
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.rail} aria-label="Filters">
          <FacetPanel facets={found.facets} filters={filters} onToggle={onToggle} onClear={clearAll} />
        </aside>

        <section className={styles.results} aria-labelledby="catalog-results">
          <header className={styles.resultsHead}>
            <h2 id="catalog-results" className={styles.resultsTitle}>{query.trim() ? `Results for “${query.trim()}”` : 'All catalog products'}</h2>
            <p className={styles.resultsCount} aria-live="polite">{found.results.length} of {plural(found.total, 'product')}</p>
          </header>
          {found.results.length === 0 ? (
            <div className={styles.none}>
              <p className={styles.noneTitle}>No products match {chips.length ? 'these filters' : 'this search'}</p>
              <p className={styles.noneBody}>{chips.length ? 'Remove a filter or broaden your search.' : 'Try a brand, a product name or a size.'}</p>
              {chips.length > 0
                ? <button type="button" className={styles.textAction} onClick={clearAll}>Clear filters</button>
                : query && <button type="button" className={styles.textAction} onClick={() => setQuery('')}>Clear search</button>}
            </div>
          ) : view === 'grid' ? (
            <ul className={styles.grid}>
              {found.results.map((s) => <li key={s.product.id}><ProductCard s={s} href={productHref(s.product.id)} /></li>)}
            </ul>
          ) : (
            <ul className={styles.list}>
              {found.results.map((s) => <li key={s.product.id}><ProductRow s={s} href={productHref(s.product.id)} /></li>)}
            </ul>
          )}
        </section>
      </div>

      {filtersOpen && (
        <FilterDialog products={products} query={query} supplierId={supplierId} initial={filters}
          onApply={setFilters} onClose={() => setFiltersOpen(false)} />
      )}
    </div>
  )
}

/** "$58.50", or "From $41.25" when the options differ in cost. */
function price(s: ProductSummary): string | null {
  if (s.fromCost === undefined) return null
  const costs = new Set(s.product.variants.flatMap((v) => v.offers.map((o) => o.unitCost / o.pack)))
  return `${costs.size > 1 ? 'From ' : ''}${unitPrice(s.fromCost, s.currency)}`
}

const options = (n: number) => plural(n, 'option')

function ProductCard({ s, href }: { s: ProductSummary; href: string }) {
  const cost = price(s)
  return (
    <Link href={href} className={styles.card}>
      <ProductImage image={s.product.image} size="card" />
      <span className={styles.cardBody}>
        <span className={styles.brand}>{s.product.brand}</span>
        <span className={styles.name}>{s.product.name}</span>
        <span className={styles.meta}>{s.product.category} · {options(s.optionCount)}</span>
        {s.intelligence === 'Replenishment recommended' && <span className={styles.signal}>Replenishment recommended</span>}
        <span className={styles.cardFoot}>
          <Standing s={s} />
          {cost && <span className={styles.price}>{cost}</span>}
        </span>
      </span>
    </Link>
  )
}

function ProductRow({ s, href }: { s: ProductSummary; href: string }) {
  const cost = price(s)
  return (
    <Link href={href} className={styles.row}>
      <ProductImage image={s.product.image} size="row" />
      <span className={styles.rowMain}>
        <span className={styles.brand}>{s.product.brand}</span>
        <span className={styles.name}>{s.product.name}</span>
        <span className={styles.meta}>
          {s.product.category} · {options(s.optionCount)} · <Standing s={s} />
        </span>
        {s.intelligence === 'Replenishment recommended' && <span className={styles.signal}>Replenishment recommended</span>}
      </span>
      <span className={styles.rowCost}>
        <span className={styles.rowCostLabel}>Cost</span>
        <span className={styles.price}>{cost ?? '—'}</span>
      </span>
      <span className={styles.rowGo} aria-hidden="true">View <Icon name="arrow-right" size={12} /></span>
    </Link>
  )
}

/** Supplier availability when it was reported; otherwise what the retailer has of it. */
function Standing({ s }: { s: ProductSummary }) {
  if (s.availability !== 'Not reported') return <span className={styles.availability} data-tone={tone(s)}>{s.availability}</span>
  const own = s.signal && s.signal.tone === 'neutral' ? s.signal.text : null
  return <span className={styles.availability}>{own ?? 'Availability not reported'}</span>
}

const tone = (s: ProductSummary) =>
  s.availability === 'Available now' ? 'good' : s.availability === 'Low availability' ? 'caution' : s.availability === 'Backorder' ? 'risk' : 'neutral'

/** Filters as a rail: category as a short list, then checkboxes; the category's own attributes once results narrow to one. */
function FacetPanel({ facets, filters, onToggle, onClear }: {
  facets: Facet[]; filters: Filters; onToggle: (key: FacetKey, value: string) => void; onClear: () => void
}) {
  const [allCategories, setAllCategories] = useState(false)
  const category = facets.find((f) => f.key === 'category')
  const rest = facets.filter((f) => f.key !== 'category')
  // The first six, and any chosen beyond them, so a selection is never hidden.
  const shownCategories = category && (allCategories ? category.options
    : category.options.filter((o, i) => i < 6 || filters.category?.includes(o.value)))
  const any = Object.keys(filters).length > 0
  return (
    <div className={styles.facets}>
      <div className={styles.facetsHead}>
        <span>
          <span className={styles.facetsTitle}>Filters</span>
          <span className={styles.facetsLead}>Refine as results change</span>
        </span>
        {any && <button type="button" className={styles.textAction} onClick={onClear}>Clear all</button>}
      </div>
      {category && shownCategories && (
        <div className={styles.facet} role="group" aria-labelledby="facet-category">
          <p id="facet-category" className={styles.facetLabel}>Category</p>
          <ul className={styles.categoryList}>
            {shownCategories.map((o) => {
              const on = filters.category?.includes(o.value) ?? false
              return (
                <li key={o.value}>
                  <button type="button" className={styles.category} aria-pressed={on} onClick={() => onToggle('category', o.value)}>
                    <span>{o.label}</span><span className={styles.count}>{o.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {category.options.length > 6 && (
            <button type="button" className={styles.textAction} onClick={() => setAllCategories((v) => !v)} aria-expanded={allCategories}>
              {allCategories ? 'Show fewer' : `Show all ${category.options.length}`}
            </button>
          )}
        </div>
      )}
      {rest.map((f) => (
        <div key={f.key} className={styles.facet} role="group" aria-labelledby={`facet-${f.key}`}>
          <p id={`facet-${f.key}`} className={styles.facetLabel}>{f.label}</p>
          <div className={styles.checks}>
            {f.options.map((o) => (
              <label key={o.value} className={styles.check}>
                <input type="checkbox" checked={filters[f.key]?.includes(o.value) ?? false} onChange={() => onToggle(f.key, o.value)} />
                <span className={styles.checkLabel}>{o.label}</span>
                <span className={styles.count}>{o.count}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Filters on smaller screens: a full-height dialog with the filter groups,
 * each opening its options in a second panel. Choices apply when asked
 * ("Show N products"), so the results don't jump behind the dialog.
 */
function FilterDialog({ products, query, supplierId, initial, onApply, onClose }: {
  products: CatalogProduct[]; query: string; supplierId?: string; initial: Filters
  onApply: (f: Filters) => void; onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<Filters>(initial)
  const [active, setActive] = useState<FacetKey | null>(null)
  const found = useMemo(() => discover(products, { query, filters: draft, sort: 'best', supplierId }), [products, query, draft, supplierId])
  const facet = found.facets.find((f) => f.key === active)
  const selected = Object.values(draft).reduce((n, v) => n + (v?.length ?? 0), 0)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    d.showModal()
    return () => d.close()
  }, [])

  const labelFor = (f: Facet) => (draft[f.key] ?? []).map((v) => f.options.find((o) => o.value === v)?.label ?? v).join(', ')

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="filter-title"
      onCancel={(e) => { if (active) { e.preventDefault(); setActive(null) } else onClose() }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <header className={styles.dialogHead}>
        <span>
          <span id="filter-title" className={styles.dialogTitle}>Filter products</span>
          <span className={styles.dialogLead}>{selected ? `${selected} selected` : 'Choose what matters for this search'}</span>
        </span>
        <button type="button" className={styles.dialogClose} aria-label="Close filters" onClick={onClose}><Icon name="close" size={18} /></button>
      </header>
      <div className={styles.panes} data-step={active ? 'options' : 'groups'}>
        <div className={styles.pane} inert={Boolean(active)}>
          <p className={styles.paneLabel}>Filter by</p>
          <ul className={styles.groups}>
            {found.facets.map((f) => {
              const n = draft[f.key]?.length ?? 0
              return (
                <li key={f.key}>
                  <button type="button" className={styles.group} onClick={() => setActive(f.key)}>
                    <span className={styles.groupText}>
                      <span className={styles.groupName}>{f.label}</span>
                      <span className={styles.groupHint}>{n ? labelFor(f) : options(f.options.length)}</span>
                    </span>
                    {n > 0 && <span className={styles.badge}>{n}</span>}
                    <Icon name="chevron-right" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className={styles.pane} inert={!active}>
          <div className={styles.paneHead}>
            <button type="button" className={styles.dialogBack} aria-label="Back to filter groups" onClick={() => setActive(null)}>
              <Icon name="chevron-left" size={18} />
            </button>
            <span>
              <span className={styles.dialogTitleDark}>{facet?.label ?? 'Filter'}</span>
              <span className={styles.facetsLead}>Select one or more</span>
            </span>
          </div>
          <div className={styles.optionList}>
            {facet?.options.map((o) => (
              <label key={o.value} className={styles.option}>
                <input type="checkbox" checked={draft[facet.key]?.includes(o.value) ?? false} onChange={() => setDraft((d) => toggle(d, facet.key, o.value))} />
                <span className={styles.checkLabel}>{o.label}</span>
                <span className={styles.count}>{o.count}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <footer className={styles.dialogFoot}>
        <button type="button" className={styles.dialogClear} disabled={selected === 0} onClick={() => setDraft({})}>Clear</button>
        <button type="button" className={styles.dialogApply} onClick={() => { onApply(draft); onClose() }}>
          Show {plural(found.results.length, 'product')}
        </button>
      </footer>
    </dialog>
  )
}

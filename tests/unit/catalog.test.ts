import { describe, expect, it } from 'vitest'
import { demoCatalog, demoOrderContexts } from '@/demo/catalog'
import { readAttributes } from '@/features/catalog/attributes'
import { activeFilters, discover, toggle } from '@/features/catalog/search'
import { bestSource, stockLabel } from '@/features/catalog/sourcing'
import type { CatalogOffer, CatalogProduct, CatalogVariant } from '@/features/catalog/types'
import { catalogQuery, readCatalogState } from '@/features/catalog/url'
import { buildPlan } from '@/features/today/plan'
import type { OrderSummary } from '@/features/orders/types'

const offer = (supplierId: string, unitCost: number, extra: Partial<CatalogOffer> = {}): CatalogOffer =>
  ({ supplierId, supplierName: `${supplierId} Supply`, unitCost, pack: 1, currency: 'USD', status: 'available', usual: false, ...extra })

const variant = (id: string, label: string, offers: CatalogOffer[], extra: Partial<CatalogVariant> = {}): CatalogVariant =>
  ({ id, label, attributes: readAttributes('Tires', label), offers, own: { onHand: 0, onOrder: 0 }, ...extra })

const product = (id: string, name: string, brand: string, category: string, variants: CatalogVariant[]): CatalogProduct =>
  ({ id, name, brand, category, variants, image: null, example: true })

const tires = [
  product('dhf', 'Maxxis Minion DHF', 'Maxxis', 'Tires', [
    variant('29', '29 × 2.5', [offer('north', 58, { usual: true })]),
    variant('275', '27.5 × 2.5', [offer('north', 56, { usual: true }), offer('cascade', 54)]),
  ]),
  product('gp', 'Continental Grand Prix 5000', 'Continental', 'Tires', [
    variant('700-28', '700 × 28', [offer('north', 52, { usual: true })]),
  ]),
  product('lube', 'Muc-Off lube', 'Muc-Off', 'Shop supplies', [
    { id: '120', label: 'Dry 120 ml', attributes: readAttributes('Shop supplies', 'Dry 120 ml'), offers: [offer('summit', 9, { usual: true })], own: { onHand: 4, onOrder: 0 } },
  ]),
]

describe('reading attributes from option names', () => {
  it('keeps the designation an item is sold under, with one normalized meaning', () => {
    expect(readAttributes('Tires', '700 × 28')).toEqual({
      wheel_size: { value: 622, designation: '700c' }, tire_width: { value: 28, designation: '28 mm' },
    })
    expect(readAttributes('Tires', '29 × 2.4 WT EXO').wheel_size).toEqual({ value: 622, designation: '29″' })
    expect(readAttributes('Tires', '29 × 2.4 WT EXO').tire_width).toEqual({ value: 61, designation: '2.4″' })
  })

  it('reads valves and lengths for tubes, speeds for chains, volume for supplies', () => {
    const tube = readAttributes('Tubes & spokes', '700 × 25–32 Presta 60 mm')
    expect(tube.valve_type).toEqual({ value: 'presta', designation: 'Presta' })
    expect(tube.valve_length).toEqual({ value: 60, designation: '60 mm' })
    expect(tube.tire_width).toBeUndefined()
    expect(readAttributes('Drivetrain', 'X12').drivetrain_speed).toEqual({ value: 12, designation: 'X12 (12-speed)' })
    expect(readAttributes('Shop supplies', '1 L').volume).toEqual({ value: 1000, designation: '1 L' })
  })

  it('leaves what it cannot read unread, never guessed', () => {
    expect(readAttributes('Tires', 'Folding')).toEqual({})
    expect(readAttributes('Accessories', '')).toEqual({})
  })
})

describe('catalog discovery', () => {
  it('searches names, brands and sizes, best match first', () => {
    const { results } = discover(tires, { query: 'minion', filters: {}, sort: 'best' })
    expect(results.map((r) => r.product.id)).toEqual(['dhf'])
    expect(discover(tires, { query: '700c', filters: {}, sort: 'best' }).results.map((r) => r.product.id)).toEqual(['gp'])
    expect(discover(tires, { query: 'nothing like this', filters: {}, sort: 'best' }).results).toEqual([])
  })

  it('without a search, Best Match is by name', () => {
    expect(discover(tires, { query: '', filters: {}, sort: 'best' }).results.map((r) => r.product.id)).toEqual(['gp', 'dhf', 'lube'])
  })

  it('sorts by lowest cost', () => {
    expect(discover(tires, { query: '', filters: {}, sort: 'price' }).results.map((r) => r.product.id)).toEqual(['lube', 'gp', 'dhf'])
  })

  it('shows a category’s own filters only once results narrow to it, and joins designations of one size', () => {
    const all = discover(tires, { query: '', filters: {}, sort: 'best' })
    expect(all.facets.map((f) => f.key)).not.toContain('attr:wheel_size')
    const narrowed = discover(tires, { query: '', filters: { category: ['Tires'] }, sort: 'best' })
    const wheel = narrowed.facets.find((f) => f.key === 'attr:wheel_size')!
    expect(wheel.options).toEqual([
      { value: '584', label: '27.5″', count: 1 },
      { value: '622', label: '29″ / 700c', count: 2 },
    ])
  })

  it('counts each filter’s options as if that filter were not applied', () => {
    const r = discover(tires, { query: '', filters: { brand: ['Maxxis'] }, sort: 'best' })
    expect(r.results).toHaveLength(1)
    expect(r.facets.find((f) => f.key === 'brand')!.options.map((o) => o.count)).toEqual([1, 1, 1])
  })

  it('in one supplier’s catalog, shows only its products and drops the supplier filter', () => {
    const r = discover(tires, { query: '', filters: {}, sort: 'best', supplierId: 'cascade' })
    expect(r.results.map((s) => s.product.id)).toEqual(['dhf'])
    expect(r.results[0]!.fromCost).toBe(54)
    expect(r.facets.find((f) => f.key === 'supplier')).toBeUndefined()
  })

  it('toggles filters and lists them as readable chips', () => {
    const f = toggle(toggle({}, 'attr:wheel_size', '622'), 'brand', 'Maxxis')
    const { facets } = discover(tires, { query: '', filters: f, sort: 'best' })
    expect(activeFilters(f, facets).map((c) => c.label)).toEqual(['29″', 'Maxxis'])
    expect(toggle(f, 'brand', 'Maxxis')).toEqual({ 'attr:wheel_size': ['622'] })
  })
})

describe('catalog state in the address', () => {
  it('round-trips search, filters, sort and view, keeping the supplier scope apart from the Supplier filter', () => {
    const state = { query: 'dhf', filters: { category: ['Tires'], supplier: ['Cascade Components'], 'attr:wheel_size': ['622'] }, sort: 'price' as const, view: 'list' as const }
    const qs = catalogQuery(state, { supplier: 'demo-northline' })
    expect(qs).toBe('?supplier=demo-northline&q=dhf&category=Tires&from=Cascade+Components&attr.wheel_size=622&sort=price&view=list')
    const params = Object.fromEntries(new URLSearchParams(qs).entries())
    expect(readCatalogState(params)).toEqual(state)
  })

  it('ignores what it does not know', () => {
    expect(readCatalogState({ sort: 'cheapest', view: 'cards', other: 'x', 'attr.Bad-Key': '1' }))
      .toEqual({ query: '', filters: {}, sort: 'best', view: 'grid' })
  })
})

describe('best source for one option', () => {
  const orders = { north: { orderId: 'o-north', supplierName: 'North Supply', freightGap: 176, currency: 'USD' } }

  it('keeps a recommendation in its proposed order, and says when another supplier lists it for less', () => {
    const v = variant('a', '29 × 2.5', [offer('north', 58, { usual: true }), offer('cascade', 56.26)], {
      own: { onHand: 1, onOrder: 0, recommended: { quantity: 4, orderId: 'o-north', lineId: 'l1', reason: 'r', confidence: 'high' } },
    })
    const best = bestSource(v, orders)!
    expect(best.offer.supplierId).toBe('north')
    expect(best.reason).toBe('Your proposed North order is $176 short of free freight. cascade lists it $1.74 less each, outside your proposed orders.')
  })

  it('moves to the supplier with stock when the order’s supplier is out', () => {
    const v = variant('a', '700 × 28', [offer('north', 52, { usual: true, status: 'out' }), offer('cascade', 51)], {
      own: { onHand: 0, onOrder: 0, recommended: { quantity: 3, orderId: 'o-north', lineId: 'l2', reason: 'r', confidence: 'medium' } },
    })
    expect(bestSource(v, orders)).toMatchObject({ label: 'Best source', reason: 'The only supplier reporting stock.' })
  })

  it('otherwise picks the lowest cost per unit with stock, preferring the usual supplier on a tie', () => {
    const v = variant('a', '', [offer('cascade', 10), offer('north', 10, { usual: true }), offer('summit', 8, { status: 'delayed' })])
    const best = bestSource(v, orders)!
    expect(best.offer.supplierId).toBe('north')
    expect(best.reason).toBe('Your usual supplier, and the lowest cost of 2 with stock. Your proposed North order is $176 short of free freight.')
    expect(bestSource(variant('b', '', [offer('cascade', 20, { pack: 10 }), offer('north', 3)]), {})!.offer.supplierId).toBe('cascade')
  })

  it('names the usual source, not a best one, when no supplier has stock', () => {
    const v = variant('a', '', [offer('north', 10, { usual: true, status: 'out' })])
    expect(bestSource(v, {})).toEqual({ offer: v.offers[0], label: 'Usual source', reason: 'No supplier reports stock right now.' })
  })

  it('describes stock from the status when the supplier can’t supply', () => {
    expect(stockLabel(offer('n', 1, { status: 'out', availability: 'Plenty · Reno warehouse' })).text).toBe('Out of stock')
    expect(stockLabel(offer('n', 1, { status: 'limited', availability: '3 left' })).text).toBe('3 left')
  })
})

describe('example catalog', () => {
  it('has products with options, several suppliers, and no unmatched images', () => {
    expect(demoCatalog.length).toBeGreaterThan(100)
    expect(new Set(demoCatalog.map((p) => p.id)).size).toBe(demoCatalog.length)
    expect(demoCatalog.every((p) => p.image === null && p.example && p.variants.length > 0)).toBe(true)
    expect(demoCatalog.some((p) => p.variants.some((v) => v.offers.length > 1))).toBe(true)
  })

  it('reads the brand from the product, not the supplier', () => {
    expect(demoCatalog.find((p) => p.name.startsWith('DT Swiss'))?.brand).toBe('DT Swiss')
    expect(demoCatalog.every((p) => !p.brand.includes('Distribution'))).toBe(true)
  })

  it('keeps recommendations per option, from the proposed order lines', () => {
    const contexts = demoOrderContexts()
    const recommended = demoCatalog.flatMap((p) => p.variants).filter((v) => v.own.recommended)
    expect(recommended.length).toBeGreaterThan(50)
    expect(recommended.every((v) => Object.values(contexts).some((c) => c.orderId === v.own.recommended!.orderId))).toBe(true)
  })

  it('marks comparison offers as examples, never as the usual supplier', () => {
    const illustrative = demoCatalog.flatMap((p) => p.variants.flatMap((v) => v.offers)).filter((o) => o.illustrative)
    expect(illustrative.length).toBeGreaterThan(0)
    expect(illustrative.every((o) => !o.usual)).toBe(true)
  })
})

describe('replenishment plan on Today', () => {
  const summary = (id: string, supplier: string, lineCount: number, total: number, freightGap?: number): OrderSummary =>
    ({ id, supplier, currency: 'USD', lineCount, total, confident: 0, review: 0, questions: 0, freightGap })

  it('adds up the proposed orders and names the one closest to free freight', () => {
    const plan = buildPlan([summary('a', 'Northline', 79, 4824.1, 176), summary('b', 'Cascade', 9, 220, 80), summary('c', 'Summit', 35, 4745)])!
    expect(plan).toMatchObject({ products: 123, suppliers: 3, total: '$9,789', lead: '123 products to restock across 3 suppliers.' })
    expect(plan.reason).toBe('Your Cascade order is $80 short of free freight, so a few more items there could ship free.')
  })

  it('has nothing to say without orders, and no reason when none is near free freight', () => {
    expect(buildPlan([])).toBeNull()
    expect(buildPlan([summary('a', 'Northline', 2, 50)])!.reason).toBeUndefined()
  })
})

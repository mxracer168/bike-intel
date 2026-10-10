/**
 * EXAMPLE DATA for the Catalog: real product names and brands already used
 * by the example inventory and proposed orders, never written to the
 * database. Products and options come from those two sources; prices,
 * supplier stock and recommendations come from the proposed orders' lines
 * (Variant-level), on hand and incoming from the order lines or the
 * inventory. A few second-supplier offers are added only so supplier
 * comparison can be seen; each is marked `illustrative`. No product image
 * is attached until one has been matched to the exact product and its
 * source recorded (docs/catalog.md).
 */
import { readAttributes } from '@/features/catalog/attributes'
import type { OrderContexts } from '@/features/catalog/sourcing'
import type { CatalogOffer, CatalogProduct, CatalogVariant } from '@/features/catalog/types'
import { summarizeOrder } from '@/features/orders/summarize'
import { demoInventory } from './inventory'
import { demoOrders } from './orders'

const SUPPLIER_IDS: Record<string, string> = {
  'Northline Distribution': 'demo-northline',
  'Summit Parts Supply': 'demo-summit',
  'Cascade Components': 'demo-cascade',
  'Trek Bicycle': 'demo-trek',
}
const supplierId = (name: string) => SUPPLIER_IDS[name] ?? `demo-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

/** Brands, longest first, so the canonical brand is read from the product name (RockShox, not its owner SRAM). */
const BRANDS = [
  'Stan’s NoTubes', 'Genuine Innovations', 'Wheels Manufacturing', 'Lizard Skins', 'Finish Line', 'Velo Orange', 'Cane Creek',
  'Park Tool', 'Muc-Off', 'Crankbrothers', 'Continental', 'RockShox', 'Schwalbe', 'Shimano', 'Jagwire', 'Motorex', 'Topeak',
  'DT Swiss', 'Enduro', 'Maxxis', 'OneUp', 'Zipp', 'SRAM', 'Trek', 'KMC', 'ESI', 'ODI', 'WTB', 'PNW', 'Fox',
]

/** Categories for products only the orders know (the inventory carries its own). */
function categoryFor(name: string): string {
  const n = name.toLowerCase()
  if (/\btube\b|spoke|nipple/.test(n)) return 'Tubes & spokes'
  if (/\bhub\b|ratchet|freehub|rim\b/.test(n)) return 'Wheels'
  if (/vigilante|gatorskin|grand prix|minion|rekon|assegai|ardent/.test(n)) return 'Tires'
  if (/chain tool|multi-tool|tire levers|shock pump|pump\b/.test(n) && !/floor pump|mini dual/.test(n)) return 'Tools'
  if (/chain|cassette|cable kit|derailleur hanger/.test(n)) return 'Drivetrain'
  if (/pads|rotor/.test(n)) return 'Brakes'
  if (/lube|cleaner|sealant|fluid|oil|grease/.test(n)) return 'Shop supplies'
  if (/fork seal|service kit|dropper|bushing|bearing|headset/.test(n)) return 'Suspension'
  return 'Accessories'
}

const brandOf = (name: string, fallback?: string) => BRANDS.find((b) => name.startsWith(b)) ?? fallback ?? name.split(' ')[0]!

const slug = (s: string) => s.toLowerCase().replace(/’/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Second suppliers for a few products, only to show comparison (cost relative to the usual offer). */
const ILLUSTRATIVE: { product: string; supplier: string; costFactor: number; status: CatalogOffer['status']; availability: string }[] = [
  { product: 'Maxxis Minion DHF', supplier: 'Cascade Components', costFactor: 0.97, status: 'limited', availability: 'Low stock' },
  { product: 'Maxxis Rekon', supplier: 'Summit Parts Supply', costFactor: 1.04, status: 'available', availability: 'In stock' },
  { product: 'Maxxis Assegai', supplier: 'Summit Parts Supply', costFactor: 1.03, status: 'available', availability: 'In stock' },
  { product: 'Continental Grand Prix 5000 S TR', supplier: 'Cascade Components', costFactor: 0.98, status: 'available', availability: 'In stock' },
  { product: 'Schwalbe inner tube', supplier: 'Cascade Components', costFactor: 0.95, status: 'available', availability: 'In stock' },
  { product: 'KMC chain', supplier: 'Summit Parts Supply', costFactor: 1.05, status: 'available', availability: 'In stock' },
  { product: 'Shimano B01S resin disc brake pads', supplier: 'Cascade Components', costFactor: 1.02, status: 'delayed', availability: 'Back in about 2 weeks' },
]

const ONE_LOCATION = [{ id: 'all', name: 'Store' }]

function build(): CatalogProduct[] {
  const products = new Map<string, CatalogProduct>()
  const usualSupplier = new Map<string, string>()
  const inventory = demoInventory(ONE_LOCATION)
  for (const i of inventory) usualSupplier.set(i.product, i.supplier)

  const product = (name: string, brand?: string, category?: string) => {
    let p = products.get(name)
    if (!p) {
      p = { id: slug(name), brand: brandOf(name, brand), name, category: category ?? categoryFor(name), variants: [], image: null, example: true }
      products.set(name, p)
    }
    return p
  }

  // Proposed orders: one Variant per line, with the supplier's offer and our recommendation.
  for (const order of demoOrders) {
    for (const line of order.lines) {
      const inv = inventory.find((i) => i.product === line.product)
      const p = product(line.product, inv?.brand, inv?.category)
      const offer: CatalogOffer = {
        supplierId: supplierId(order.supplier), supplierName: order.supplier, unitCost: line.unitCost, pack: 1,
        currency: order.currency, status: line.supplier.status, availability: line.availability,
        usual: (usualSupplier.get(line.product) ?? order.supplier) === order.supplier,
      }
      const variant: CatalogVariant = {
        id: slug(line.variant || 'standard'),
        label: line.variant ?? '',
        attributes: readAttributes(p.category, line.variant ?? ''),
        offers: [offer],
        own: {
          onHand: line.onHand, onOrder: line.onOrder,
          perWeek: line.weeklySales.length ? Math.round((line.weeklySales.reduce((a, b) => a + b, 0) / line.weeklySales.length) * 10) / 10 : undefined,
          recommended: line.quantity > 0
            ? { quantity: line.quantity, orderId: order.id, lineId: line.id, reason: line.reason, confidence: line.confidence }
            : undefined,
        },
        network: line.network?.length ? { listings: line.network, wholesaleMarketValue: line.wholesaleMarketValue } : undefined,
      }
      if (!p.variants.some((v) => v.id === variant.id)) p.variants.push(variant)
    }
  }

  // Inventory items the orders don't cover: one option each, offered by the item's usual supplier.
  for (const i of inventory) {
    const p = product(i.product, i.brand, i.category)
    const id = slug(i.variant || 'standard')
    if (p.variants.some((v) => v.id === id)) continue
    p.variants.push({
      id, label: i.variant ?? '', attributes: readAttributes(p.category, i.variant ?? ''),
      offers: [{ supplierId: supplierId(i.supplier), supplierName: i.supplier, unitCost: i.unitCost, pack: 1, currency: 'USD', usual: true }],
      own: { onHand: i.onHand, onOrder: i.onOrder, perWeek: i.perWeek },
    })
  }

  for (const x of ILLUSTRATIVE) {
    const p = products.get(x.product)
    if (!p) continue
    for (const v of p.variants) {
      const usual = v.offers.find((o) => o.usual) ?? v.offers[0]
      if (!usual || v.offers.some((o) => o.supplierName === x.supplier)) continue
      v.offers.push({
        supplierId: supplierId(x.supplier), supplierName: x.supplier, currency: usual.currency, pack: 1,
        unitCost: Math.round(usual.unitCost * x.costFactor * 100) / 100,
        status: x.status, availability: x.availability, usual: false, illustrative: true,
      })
    }
  }

  return [...products.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const demoCatalog: CatalogProduct[] = build()

export function findDemoProduct(id: string): CatalogProduct | null {
  return demoCatalog.find((p) => p.id === id) ?? null
}

/** The proposed order from one supplier, for the supplier-scoped Catalog header. */
export function demoSupplierOrder(id: string) {
  const name = Object.entries(SUPPLIER_IDS).find(([, v]) => v === id)?.[0]
  return demoOrders.find((o) => o.supplier === name) ?? null
}

export function demoSupplierName(id: string): string | null {
  return Object.entries(SUPPLIER_IDS).find(([, v]) => v === id)?.[0] ?? null
}

/** The proposed orders by supplier, for best-source reasoning (in an order already, distance to free freight). */
export function demoOrderContexts(): OrderContexts {
  return Object.fromEntries(demoOrders.map((o) => {
    const s = summarizeOrder(o)
    return [supplierId(o.supplier), { orderId: o.id, supplierName: o.supplier, freightGap: s.freightGap, currency: o.currency }]
  }))
}

import type { NetworkListing, SupplierStatus } from '@/features/orders/types'

/**
 * Presentation shapes for the Catalog (docs/catalog.md). Product → Variant →
 * Supplier offer, as the retailer meets them: what it is, which options
 * exist, who can supply each and on what terms, and what it means to this
 * retailer right now. Filled from example data until the catalog migration
 * is applied and a supplier source is imported.
 */
export type CatalogProduct = {
  id: string
  brand: string
  name: string
  category: string
  variants: CatalogVariant[]
  /** Only a confidently matched image, with where it came from; otherwise null and a quiet fallback shows. */
  image: CatalogImage | null
  example: boolean
}

export type CatalogImage = { src: string; alt: string; source: { name: string; url: string } }

/** An attribute value: normalized meaning for filtering, and the designation this item is sold under. */
export type AttributeValue = { value: string | number; designation: string }

export type CatalogVariant = {
  id: string
  /** The option as the supplier names it ("29 × 2.4 WT EXO"); empty for a one-option product. */
  label: string
  attributes: Record<string, AttributeValue>
  offers: CatalogOffer[]
  /** What this option means to the retailer now (their own data). */
  own: {
    onHand: number
    onOrder: number
    perWeek?: number
    /** A recommendation for this Variant, from a proposed order. */
    recommended?: { quantity: number; orderId: string; lineId: string; reason: string; confidence: string }
  }
  /** The proposed order lines for this option (its suggested quantity there, even 0). */
  orderLines?: { orderId: string; lineId: string; quantity: number }[]
  /** Other retailers' listings (retailer network, Phase 2; example only). */
  network?: { listings: NetworkListing[]; wholesaleMarketValue?: number }
}

export type CatalogOffer = {
  supplierId: string
  supplierName: string
  /** Per ordering unit, as the supplier sells it. */
  unitCost: number
  /** Canonical units in one ordering unit (a box of 10 tubes is 10). Comparisons use cost per canonical unit. */
  pack: number
  currency: string
  status?: SupplierStatus
  availability?: string
  /** The retailer's usual supplier for this item (their POS's default vendor). */
  usual: boolean
  /** A second supplier's offer added only to show comparison (example data). */
  illustrative?: boolean
}

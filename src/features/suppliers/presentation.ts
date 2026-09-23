/**
 * How a supplier is presented. Deliberately a presentation shape, not a data
 * model: a supplier page is an identity plus an ordered list of typed
 * sections, so a page can be sparse or rich (and gain new section types
 * later) without rebuilding it. Nothing here implies tiers or placement.
 */
export type SupplierKind = 'distributor' | 'brand' | 'brand_and_distributor'

export type SupplierMarketView = { country: string; name: string; currency?: string }

export type SupplierIdentity = {
  id: string
  name: string
  tagline?: string
  kind?: SupplierKind
  /** Only http(s) URLs; validated before it gets here. */
  website?: string
  markets: SupplierMarketView[]
}

export type SupplierSection =
  | { type: 'about'; title?: string; paragraphs: string[] }
  | { type: 'facts'; title?: string; items: { label: string; value: string }[] }
  | { type: 'brands'; title?: string; brands: string[] }
  | { type: 'programs'; title?: string; programs: { name: string; season?: string; closes?: string; summary: string }[] }
  | { type: 'contact'; title?: string; people: { role: string; name?: string; email?: string; phone?: string }[]; note?: string }

export type SupplierPresentation = { identity: SupplierIdentity; sections: SupplierSection[] }

/** The signed-in retailer's own relationship: private to them, never supplier-controlled. */
export type RelationshipView = {
  status: 'none' | 'claimed' | 'verified' | 'inactive' | 'suspended'
  preference?: 'preferred' | 'neutral' | 'avoid'
}

export type DirectoryEntry = {
  id: string
  name: string
  tagline?: string
  kind?: SupplierKind
  countries: string[]
  relationship: RelationshipView
  example: boolean
}

export const kindLabel: Record<SupplierKind, string> = {
  distributor: 'Distributor',
  brand: 'Brand',
  brand_and_distributor: 'Brand and distributor',
}

export function monogram(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '··'
}

/**
 * EXAMPLE DATA for the Excess inventory tab. Never written to the database.
 *
 * Wholesale Market Value here is invented per item (a deterministic spread
 * around the example cost); there is no calculation behind it. The overrides
 * and exclusions are examples of a retailer managing exceptions.
 */
import type { NetworkOffer } from '@/features/inventory/excess'
import type { InventoryItemView, InventoryLocation } from '@/features/inventory/types'
import { demoInventory } from './inventory'

/** Review states for the prototype, chosen with ?example=… on the page. */
export type ExcessExample = 'standard' | 'none' | 'many' | 'defaults'

export function parseExcessExample(value: string | string[] | undefined): ExcessExample {
  return value === 'none' || value === 'many' || value === 'defaults' ? value : 'standard'
}

function random(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The retailer's exceptions, by product: a different network price (as a
 * share of Wholesale Market Value) or excluded from the network.
 */
const EXCEPTIONS: Record<string, { price?: number; excluded?: boolean }> = {
  'Shimano 105 R7100 Di2 groupset': { price: 0.92 },   // a little below market, to move it
  'Zipp 303 Firecrest wheelset': { price: 1.08 },       // above market
  'Maxxis High Roller III': { price: 1.05 },            // above market
  'Shimano Ultegra R8170 wheelset': { price: 0.8 },     // well below market and below cost
  'Pearl Izumi Select gloves': { price: 0.6 },          // clearance: not selling at all
  'Maxxis Dissector': { price: 1 },                     // set by hand, same as market
  'RockShox Lyrik Select fork': { excluded: true },     // kept for the shop's own builds
  'Surly Bridge Club': { excluded: true },              // the floor model
}

/** Older model years for the "hundreds of excess items" review state. */
const OLDER = ['2025 model', '2024 model']

function manyItems(items: InventoryItemView[]): InventoryItemView[] {
  return items.flatMap((item) => [
    item,
    ...OLDER.map((year, k) => ({
      ...item,
      id: `${item.id}-old${k}`,
      variant: [item.variant, year].filter(Boolean).join(', '),
      onHand: Math.max(2, Math.round(item.onHand * (0.6 + k * 0.3))),
      perWeek: Math.round(item.perWeek * (0.25 - k * 0.1) * 100) / 100,
      identifiers: item.identifiers.map((id) => `${id}-${k + 1}`),
    })),
  ])
}

/**
 * Example inventory plus the network side of each item. Every item gets an
 * offer; only items beyond the excess rule appear on the tab.
 */
export function demoExcess(locations: InventoryLocation[], example: ExcessExample = 'standard'): {
  items: InventoryItemView[]
  offers: Record<string, NetworkOffer>
} {
  const base = demoInventory(locations)
  // "No excess": the same items with stock trimmed to a few weeks of supply.
  const items = example === 'many' ? manyItems(base)
    : example === 'none' ? base.map((i) => ({ ...i, onHand: Math.min(i.onHand, Math.ceil(i.perWeek * 8)) }))
      : base
  const rnd = random(20261006)
  const offers: Record<string, NetworkOffer> = {}
  for (const item of items) {
    // A spread around cost: most items replace for a little more than the shop paid.
    const wholesaleMarketValue = round2(item.unitCost * (0.9 + rnd() * 0.3))
    const exception = example === 'defaults' ? undefined : EXCEPTIONS[item.product]
    const isOriginal = !item.id.includes('-old')
    offers[item.id] = {
      itemId: item.id,
      wholesaleMarketValue,
      priceOverride: exception?.price !== undefined && isOriginal ? round2(wholesaleMarketValue * exception.price) : undefined,
      excluded: Boolean(exception?.excluded && isOriginal),
    }
  }
  return { items, offers }
}

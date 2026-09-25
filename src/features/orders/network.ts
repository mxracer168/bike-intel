import { plural } from '@/domain/language/plain'
import type { NetworkListing, SupplierStatus } from './types'

export type NetworkMatch =
  | { kind: 'none' }
  | { kind: 'full'; needed: number; cover: NetworkListing[]; some: NetworkListing[] }
  | { kind: 'partial'; needed: number; some: NetworkListing[] }

const byAvailable = (a: NetworkListing, b: NetworkListing) => b.available - a.available

/**
 * Compare what we suggest ordering with what other retailers made available.
 * Full: at least one retailer can cover the whole quantity on its own.
 * Partial: some have units, none has enough alone (we don't propose splits).
 * None: nothing to show, and nothing is shown.
 */
export function networkMatch(listings: readonly NetworkListing[] | undefined, needed: number): NetworkMatch {
  const available = (listings ?? []).filter((l) => l.available > 0)
  if (needed <= 0 || available.length === 0) return { kind: 'none' }
  const cover = available.filter((l) => l.available >= needed).sort(byAvailable)
  const some = available.filter((l) => l.available < needed).sort(byAvailable)
  return cover.length > 0 ? { kind: 'full', needed, cover, some } : { kind: 'partial', needed, some }
}

/** The one-line signal on an order line; null when there's nothing to say. */
export function networkSignal(match: NetworkMatch): string | null {
  if (match.kind === 'none') return null
  if (match.kind === 'full') {
    return match.cover.length === 1
      ? `1 retailer can cover all ${match.needed}`
      : `${match.cover.length} retailers can cover all ${match.needed}`
  }
  return `${plural(match.some.length, 'retailer')} also ${match.some.length === 1 ? 'has' : 'have'} some`
}

/**
 * Prominence follows relevance: how loudly to offer other retailers' stock
 * depends on how good the supplier option is.
 *  quiet   supplier can fill it normally: only a collapsed signal in the line detail
 *  raised  supplier stock is limited or delivery is late: a signal in the table row too
 *  primary supplier is out: a stronger signal, and the list opens by default
 */
export type NetworkProminence = 'quiet' | 'raised' | 'primary'

export function networkProminence(supplier: SupplierStatus): NetworkProminence {
  if (supplier === 'out') return 'primary'
  if (supplier === 'limited' || supplier === 'delayed') return 'raised'
  return 'quiet'
}

/**
 * How another retailer is named on screen. One place to change when we decide
 * whether names are shown, partly hidden until connection, or revealed only
 * after both sides agree.
 */
export function retailerLabel(listing: NetworkListing): { name: string; place: string } {
  return listing.retailer
}

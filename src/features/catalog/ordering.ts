import { addedTotal, type DraftState } from '@/features/orders/drafts'
import { shortName, type OrderContexts } from './sourcing'
import type { CatalogOffer, CatalogVariant } from './types'

/**
 * Where one option can be added: each supplier offering it, as the order it
 * would go into. A supplier with a proposed order adds to that order (to the
 * option's own line when the order already has one); a supplier without one
 * starts a new order. Quantities include the retailer's changes (drafts).
 */
export type Destination = {
  offer: CatalogOffer
  kind: 'proposed' | 'started' | 'new'
  /** The order it goes into; none until a new order is started. */
  orderId?: string
  /** The order's total as it stands, and how far it is from free freight when known. */
  orderTotal?: number
  freightGap?: number
  /** This option's own line in that order, with its current quantity. */
  line?: { lineId: string; quantity: number }
  /** How many were already added to that order from the Catalog. */
  added: number
}

export const itemKey = (productId: string, optionId: string) => `${productId}:${optionId}`

export function destinations(productId: string, variant: CatalogVariant, orders: OrderContexts, drafts: DraftState): Destination[] {
  const key = itemKey(productId, variant.id)
  return variant.offers.map((offer) => {
    const ctx = orders[offer.supplierId]
    if (ctx) {
      const draft = drafts.orders[ctx.orderId]
      const own = variant.orderLines?.find((l) => l.orderId === ctx.orderId)
      const extra = addedTotal(draft)
      return {
        offer, kind: 'proposed', orderId: ctx.orderId,
        orderTotal: ctx.total !== undefined ? ctx.total + extra : undefined,
        freightGap: ctx.freightGap !== undefined ? Math.max(0, ctx.freightGap - extra) || undefined : undefined,
        line: own && { lineId: own.lineId, quantity: draft?.lines[own.lineId] ?? own.quantity },
        added: draft?.added.find((a) => a.key === key)?.quantity ?? 0,
      }
    }
    const startedId = `draft-${offer.supplierId}`
    if (drafts.started[startedId]) {
      const draft = drafts.orders[startedId]
      return { offer, kind: 'started', orderId: startedId, orderTotal: addedTotal(draft), added: draft?.added.find((a) => a.key === key)?.quantity ?? 0 }
    }
    return { offer, kind: 'new', added: 0 }
  })
}

/** Where this option sits in the retailer's orders now: "Northline order · 4". */
export function placements(dests: Destination[]): { supplierName: string; orderId: string; quantity: number }[] {
  return dests
    .map((d) => ({ supplierName: d.offer.supplierName, orderId: d.orderId!, quantity: (d.line?.quantity ?? 0) + d.added }))
    .filter((p) => p.orderId && p.quantity > 0)
}

/** How many of this option the destination order has now (its own line, or added from the Catalog); undefined when none. */
export function current(d: Destination): number | undefined {
  if (d.line) return d.line.quantity
  return d.added > 0 ? d.added : undefined
}

/** What confirming does, in the button's words. */
export function confirmLabel(d: Destination, quantity: number): string {
  const who = shortName(d.offer.supplierName)
  if (d.kind === 'new') return `Start ${who} order with ${quantity}`
  const now = current(d)
  if (now !== undefined) return now === quantity ? `${quantity} already in ${who} order` : `Set ${who} order to ${quantity}`
  return `Add ${quantity} to ${who} order`
}

import { formatMoney } from '@/domain/language/plain'
import { unitPrice } from '@/features/network/pricing'
import type { CatalogOffer, CatalogVariant } from './types'

/**
 * Which supplier to buy one option from, and why, in words the retailer can
 * check. Supplier unit cost only: landed cost (freight, terms) belongs to
 * sourcing plans and is not estimated here (docs/catalog.md, G2). The one
 * piece of order context used is what the proposed orders already say: which
 * order a recommendation sits in, and how far that order is from free freight.
 */
export type ProposedOrderContext = {
  orderId: string; supplierName: string; freightGap?: number; currency: string
  /** For choosing where to add: the order as proposed. */
  total?: number; lineCount?: number; leadTimeDays?: number
}
export type OrderContexts = Record<string, ProposedOrderContext>

export type BestSource = {
  offer: CatalogOffer
  /** "Best source" when a supplier has it to sell; "Usual source" when none reports stock. */
  label: 'Best source' | 'Usual source'
  reason: string
}

/** "Northline Distribution" → "Northline" in running text. */
export const shortName = (name: string) => name.split(' ')[0] ?? name

export const perUnit = (o: CatalogOffer) => o.unitCost / o.pack
const inStock = (o: CatalogOffer) => o.status === 'available' || o.status === 'limited'

/** What a proposed order means for adding this item: free freight already, or how far from it. */
export function orderNote(context: ProposedOrderContext | undefined): string | undefined {
  if (!context) return undefined
  return context.freightGap === undefined
    ? `In your proposed ${shortName(context.supplierName)} order, which already ships free`
    : `Your proposed ${shortName(context.supplierName)} order is ${formatMoney(Math.ceil(context.freightGap), context.currency)} short of free freight`
}

export function bestSource(variant: CatalogVariant, orders: OrderContexts): BestSource | null {
  const offers = variant.offers
  if (offers.length === 0) return null
  const candidates = offers.filter(inStock)
  const cheapest = [...candidates].sort((a, b) => perUnit(a) - perUnit(b) || Number(b.usual) - Number(a.usual))[0]

  // Recommended already: the proposed order it sits in is the source, as long as that supplier can supply it.
  const rec = variant.own.recommended
  const inOrder = rec && candidates.find((o) => orders[o.supplierId]?.orderId === rec.orderId)
  if (inOrder) {
    const note = orderNote(orders[inOrder.supplierId])!
    const cheaper = cheapest && perUnit(cheapest) < perUnit(inOrder) ? cheapest : undefined
    return {
      offer: inOrder, label: 'Best source',
      reason: cheaper
        ? `${note}. ${shortName(cheaper.supplierName)} lists it ${unitPrice(perUnit(inOrder) - perUnit(cheaper), cheaper.currency)} less each, outside your proposed orders.`
        : `${note}.`,
    }
  }

  if (cheapest) {
    const others = candidates.length - 1
    const base = others === 0
      ? cheapest.usual ? 'Your usual supplier, and the only one reporting stock' : 'The only supplier reporting stock'
      : cheapest.usual ? `Your usual supplier, and the lowest cost of ${candidates.length} with stock` : `Lowest cost of ${candidates.length} suppliers with stock`
    const note = orderNote(orders[cheapest.supplierId])
    return { offer: cheapest, label: 'Best source', reason: note ? `${base}. ${note}.` : `${base}.` }
  }

  const usual = offers.find((o) => o.usual) ?? offers[0]!
  return {
    offer: usual, label: 'Usual source',
    reason: offers.some((o) => o.status) ? 'No supplier reports stock right now.' : 'Suppliers haven’t reported availability for this option.',
  }
}

/**
 * An offer's stock in plain words. The supplier's own wording when it has
 * stock; its status alone when it can't supply now (the wording then may
 * describe the warehouse rather than this item).
 */
export function stockLabel(o: CatalogOffer): { text: string; tone: 'good' | 'caution' | 'risk' | 'neutral' } {
  switch (o.status) {
    case 'available': return { text: o.availability ?? 'In stock', tone: 'good' }
    case 'limited': return { text: o.availability ?? 'Low stock', tone: 'caution' }
    case 'delayed': return { text: 'Delayed', tone: 'caution' }
    case 'out': return { text: 'Out of stock', tone: 'risk' }
    default: return { text: 'Not reported', tone: 'neutral' }
  }
}

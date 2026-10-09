import type { ConnectionView } from '@/features/connections/types'
import type { InventoryItemView } from '@/features/inventory/types'
import { exactMoney } from '@/features/orders/context'
import { orderTotal } from '@/features/orders/summarize'
import type { ProposedOrderView } from '@/features/orders/types'
import type { DirectoryEntry, SupplierPresentation } from '@/features/suppliers/presentation'
import { kindLabel } from '@/features/suppliers/presentation'
import type { SearchEntry } from './search'

/**
 * Search sources: each turns things the application already has into search
 * entries, linking to where they live. Pure functions over presentation
 * shapes, so real and example data go through the same path.
 */

const statusLabel = { connected: 'Connected', not_connected: 'Not connected', attention: 'Needs attention' } as const
const named = (product: string, variant?: string) => [product, variant].filter(Boolean).join(' ')

export function orderEntries(orders: ProposedOrderView[]): SearchEntry[] {
  return orders.flatMap((o) => [
    {
      id: `order:${o.id}`, group: 'order' as const, title: `${o.supplier} order`,
      detail: `${o.lines.length} lines · ${exactMoney(orderTotal(o.lines), o.currency)}`,
      href: `/orders/${o.id}`, keywords: ['proposed order', 'draft'],
    },
    // A product on a proposed order opens that order with the line open.
    ...o.lines.map((l) => ({
      id: `orderLine:${o.id}:${l.id}`, group: 'orderLine' as const, title: named(l.product, l.variant),
      detail: `${o.supplier.split(' ')[0]} order · ordering ${l.quantity}`,
      href: `/orders/${o.id}?line=${encodeURIComponent(l.id)}`,
    })),
  ])
}

export function supplierEntries(entries: DirectoryEntry[]): SearchEntry[] {
  return entries.map((e) => ({
    id: `supplier:${e.id}`, group: 'supplier', title: e.name,
    detail: [e.kind ? kindLabel[e.kind] : null, e.tagline].filter(Boolean).join(' · ') || undefined,
    href: `/suppliers/${e.id}`,
  }))
}

/** Programs a supplier has published on its page. */
export function programEntries(suppliers: SupplierPresentation[]): SearchEntry[] {
  return suppliers.flatMap((s) => s.sections.flatMap((section) => section.type !== 'programs' ? [] : section.programs.map((p) => ({
    id: `program:${s.identity.id}:${p.name}`, group: 'program' as const, title: p.name,
    detail: [s.identity.name, p.season, p.closes ? `closes ${p.closes}` : null].filter(Boolean).join(' · '),
    href: `/suppliers/${s.identity.id}`, keywords: ['program', 'booking'],
  }))))
}

/** Products in inventory open Inventory already searched for that product. */
export function productEntries(items: InventoryItemView[]): SearchEntry[] {
  const seen = new Set<string>()
  return items.flatMap((i) => {
    const title = named(i.product, i.variant)
    if (seen.has(title)) return []
    seen.add(title)
    return [{
      id: `product:${i.id}`, group: 'product' as const, title,
      detail: `${i.brand} · ${i.category} · ${i.onHand} on hand`,
      href: `/inventory?q=${encodeURIComponent(i.product)}`, keywords: [i.supplier],
    }]
  })
}

export function connectionEntries(connections: ConnectionView[]): SearchEntry[] {
  return connections.map((c) => ({
    id: `connection:${c.id}`, group: 'connection', title: c.name, detail: statusLabel[c.status],
    href: `/connections?connection=${encodeURIComponent(c.id)}`, keywords: [c.id, c.kind === 'pos' ? 'point of sale' : 'supplier'],
  }))
}

export function locationEntries(locations: { id: string; name: string; city?: string | null }[]): SearchEntry[] {
  return locations.map((l) => ({
    id: `location:${l.id}`, group: 'location', title: l.name, detail: l.city ?? undefined, href: '/business/locations',
  }))
}

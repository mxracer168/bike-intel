'use server'

import { z } from 'zod'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoConnections } from '@/demo/connections'
import { demoInventory } from '@/demo/inventory'
import { demoOrders } from '@/demo/orders'
import { demoSuppliers } from '@/demo/suppliers'
import { listLocations } from '@/domain/location/list'
import { listSupplierDirectory } from '@/domain/suppliers/directory'
import { pageEntries } from '@/features/search/pages'
import { searchEntries, type SearchEntry, type SearchResultGroup } from '@/features/search/search'
import {
  connectionEntries, locationEntries, orderEntries, productEntries, programEntries, supplierEntries,
} from '@/features/search/sources'
import { requireOrganization } from '@/server/session'

const query = z.string().trim().min(1).max(100)

/**
 * Searches what the signed-in retailer can already see: pages, their
 * suppliers and locations, and (only where example data is switched on)
 * the example orders, products, programs and connections. Reads run as the
 * user, so row-level security applies. Built per request: the data is small
 * today; a stored index can replace the sources later without changing the
 * results' shape.
 */
export async function searchAction(raw: string): Promise<SearchResultGroup[]> {
  const parsed = query.safeParse(raw)
  if (!parsed.success) return []
  const { db, organization } = await requireOrganization()

  const [suppliers, locations] = await Promise.all([
    listSupplierDirectory(db, organization.id).catch(() => []),
    listLocations(db, organization.id).catch(() => []),
  ])
  const entries: SearchEntry[] = [
    ...pageEntries(),
    ...supplierEntries(suppliers),
    ...locationEntries(locations.filter((l) => l.status === 'active')),
  ]

  if (isDemoPreviewEnabled()) {
    const stocking = locations.filter((l) => l.status === 'active' && l.stocks).map((l) => ({ id: l.id, name: l.name }))
    entries.push(
      ...orderEntries(demoOrders),
      ...supplierEntries(demoSuppliers.map((s) => s.entry)),
      ...programEntries(demoSuppliers.map((s) => s.presentation)),
      ...productEntries(demoInventory(stocking)),
      ...connectionEntries(demoConnections(organization.name)),
    )
  }
  return searchEntries(entries, parsed.data)
}

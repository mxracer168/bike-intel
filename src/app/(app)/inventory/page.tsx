import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoInventory, demoInventoryTrends } from '@/demo/inventory'
import { listLocations } from '@/domain/location/list'
import { InventoryView } from '@/features/inventory/InventoryView'
import { Placeholder } from '@/features/placeholder/Placeholder'
import { requireOrganization } from '@/server/session'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Inventory' }

/**
 * Inventory: health (value, weeks of supply, turn), where the value sits (by
 * brand and category) and the items behind it. Example data only for now,
 * spread across the retailer's own stocking locations.
 */
export default async function InventoryPage() {
  if (!isDemoPreviewEnabled()) {
    return (
      <Placeholder
        title="No inventory to show yet."
        body="Once your point-of-sale system is connected, you’ll see stock at each location and how long it will last."
      />
    )
  }
  const { db, organization } = await requireOrganization()
  const locations = (await listLocations(db, organization.id))
    .filter((l) => l.status === 'active' && l.stocks)
    .map((l) => ({ id: l.id, name: l.name }))
  return (
    <Page>
      <InventoryView items={demoInventory(locations)} locations={locations} trends={demoInventoryTrends} />
    </Page>
  )
}

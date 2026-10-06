import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoExcess, parseExcessExample } from '@/demo/excess'
import { listLocations } from '@/domain/location/list'
import { EXAMPLE_EXCESS_WEEKS } from '@/features/inventory/excess'
import { ExcessView } from '@/features/inventory/ExcessView'
import { InventoryFrame } from '@/features/inventory/InventoryFrame'
import { Placeholder } from '@/features/placeholder/Placeholder'
import { requireOrganization } from '@/server/session'

export const metadata: Metadata = { title: 'Excess inventory' }

/**
 * Excess inventory: what's beyond the retailer's rule, why, and what another
 * retailer would pay for it. Example data only. For review, `?example=none`,
 * `?example=many` and `?example=defaults` show the empty, hundreds-of-items
 * and no-exceptions states.
 */
export default async function ExcessInventoryPage({ searchParams }: { searchParams: Promise<{ example?: string | string[] }> }) {
  if (!isDemoPreviewEnabled()) {
    return (
      <Placeholder
        title="No excess inventory to show yet."
        body="Once your point-of-sale system is connected, items beyond the weeks of supply you choose will show here, with what another retailer would pay for them."
      />
    )
  }
  const { db, organization } = await requireOrganization()
  const locations = (await listLocations(db, organization.id))
    .filter((l) => l.status === 'active' && l.stocks)
    .map((l) => ({ id: l.id, name: l.name }))
  const { example } = await searchParams
  const { items, offers } = demoExcess(locations, parseExcessExample(example))
  return (
    <InventoryFrame>
      <ExcessView items={items} offers={offers} initialRuleWeeks={EXAMPLE_EXCESS_WEEKS} />
    </InventoryFrame>
  )
}

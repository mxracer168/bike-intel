import type { Metadata } from 'next'
import { listLocations } from '@/domain/location/list'
import { BusinessFrame } from '@/features/business/BusinessFrame'
import { LocationsView } from '@/features/business/LocationsView'
import { requireOrganization } from '@/server/session'

export const metadata: Metadata = { title: 'Locations' }

export default async function LocationsPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  return (
    <BusinessFrame name={organization.name}>
      <LocationsView locations={locations} />
    </BusinessFrame>
  )
}

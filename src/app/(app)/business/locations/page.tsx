import type { Metadata } from 'next'
import { listLocations } from '@/domain/location/list'
import { plural } from '@/domain/language/plain'
import { LocationsView } from '@/features/business/LocationsView'
import { requireOrganization } from '@/server/session'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Locations' }

export default async function LocationsPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  return (
    <Page>
      <PageHeader
        title="Locations"
        lead={`${organization.name} has ${plural(locations.length, 'location')}. Each keeps its own time zone, so daily sales are counted the way you count them.`}
      />
      <LocationsView locations={locations} />
    </Page>
  )
}

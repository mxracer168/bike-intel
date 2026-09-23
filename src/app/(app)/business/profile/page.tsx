import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listActiveContext } from '@/domain/context/list'
import { listLocations } from '@/domain/location/list'
import { getOrganizationDetails } from '@/domain/organization/details'
import { ProfileView } from '@/features/business/ProfileView'
import { requireOrganization } from '@/server/session'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Retailer profile' }

export default async function RetailerProfilePage() {
  const { db, organization } = await requireOrganization()
  const [org, locations, context] = await Promise.all([
    getOrganizationDetails(db, organization.id),
    listLocations(db, organization.id),
    listActiveContext(db, organization.id),
  ])
  if (!org) notFound()
  return (
    <Page>
      <PageHeader eyebrow="Retailer profile" title={org.name} lead="Your business details and what we know about how you buy, all in one place." />
      <ProfileView org={org} locations={locations} context={context} />
    </Page>
  )
}

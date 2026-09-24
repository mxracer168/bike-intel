import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listActiveContext } from '@/domain/context/list'
import { getOrganizationDetails } from '@/domain/organization/details'
import { BusinessFrame } from '@/features/business/BusinessFrame'
import { ProfileView } from '@/features/business/ProfileView'
import { requireOrganization } from '@/server/session'

export const metadata: Metadata = { title: 'Retailer profile' }

export default async function RetailerProfilePage() {
  const { db, organization } = await requireOrganization()
  const [org, context] = await Promise.all([
    getOrganizationDetails(db, organization.id),
    listActiveContext(db, organization.id),
  ])
  if (!org) notFound()
  return (
    <BusinessFrame name={org.name}>
      <ProfileView org={org} context={context} />
    </BusinessFrame>
  )
}

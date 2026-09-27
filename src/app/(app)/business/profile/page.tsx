import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listActiveContext } from '@/domain/context/list'
import { getOrganizationDetails } from '@/domain/organization/details'
import { listBusinessRules } from '@/domain/rules/list'
import { canManageRules } from '@/domain/rules/schema'
import { BusinessFrame } from '@/features/business/BusinessFrame'
import { ProfileView } from '@/features/business/ProfileView'
import { requireOrganization } from '@/server/session'

export const metadata: Metadata = { title: 'Retailer profile' }

export default async function RetailerProfilePage() {
  const { db, organization } = await requireOrganization()
  const [org, rules, context] = await Promise.all([
    getOrganizationDetails(db, organization.id),
    listBusinessRules(db, organization.id),
    listActiveContext(db, organization.id),
  ])
  if (!org) notFound()
  return (
    <BusinessFrame name={org.name}>
      <ProfileView org={org} context={context} rules={rules} canManageRules={canManageRules(organization.role)} />
    </BusinessFrame>
  )
}

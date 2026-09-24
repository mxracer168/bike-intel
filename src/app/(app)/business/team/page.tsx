import type { Metadata } from 'next'
import { BusinessFrame } from '@/features/business/BusinessFrame'
import { requireOrganization } from '@/server/session'
import styles from '@/features/business/Business.module.css'

export const metadata: Metadata = { title: 'Team' }

/** Placeholder until this area is built. */
export default async function TeamPage() {
  const { organization } = await requireOrganization()
  return (
    <BusinessFrame name={organization.name}>
      <p className={styles.small}>Inviting teammates, and deciding who can approve orders, comes later.</p>
    </BusinessFrame>
  )
}

import type { Metadata } from 'next'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Suppliers' }

/** Temporary placeholder. */
export default function SuppliersPage() {
  return (
    <Page>
      <PageHeader title="Suppliers" />
      <EmptyState title="Your suppliers will appear here.">The suppliers you buy from, and the terms that matter when you order.</EmptyState>
    </Page>
  )
}

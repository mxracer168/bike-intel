import type { Metadata } from 'next'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Orders' }

/** Temporary placeholder. */
export default function OrdersPage() {
  return (
    <Page>
      <PageHeader title="Orders" />
      <EmptyState title="Orders you build here will appear in this list.">When you’re ready to buy, we’ll prepare the order and you’ll approve it.</EmptyState>
    </Page>
  )
}

import type { Metadata } from 'next'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Programs' }

/** Temporary placeholder. */
export default function ProgramsPage() {
  return (
    <Page>
      <PageHeader title="Programs" />
      <EmptyState title="Supplier programs will appear here.">Booking and preseason programs, with what each one means for your business.</EmptyState>
    </Page>
  )
}

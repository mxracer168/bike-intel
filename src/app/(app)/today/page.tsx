import type { Metadata } from 'next'
import { getSessionContext } from '@/server/session'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

/** Temporary placeholder until recommendations exist. */
export default async function TodayPage() {
  const { organization } = await getSessionContext()
  return (
    <Page>
      <PageHeader eyebrow="Today" title={`${organization?.name ?? 'Your business'} is set up.`} lead="Nothing needs your attention yet." />
      <EmptyState title="Your buying advice will appear here.">
        Once your point-of-sale system is connected, this is where you’ll see what to reorder and why.
      </EmptyState>
    </Page>
  )
}

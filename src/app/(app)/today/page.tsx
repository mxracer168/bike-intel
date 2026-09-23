import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoAttention, demoQuestion, demoRecommendations } from '@/demo/today'
import { listLocations } from '@/domain/location/list'
import { formatToday } from '@/features/today/formatToday'
import { TodayPreview } from '@/features/today/TodayPreview'
import { requireOrganization } from '@/server/session'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

export default async function TodayPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  const today = formatToday(locations[0]?.timezone)
  const demo = isDemoPreviewEnabled()

  return (
    <Page>
      <PageHeader
        eyebrow={today}
        title="Nothing needs your attention yet."
        lead="Once your sales are connected, this page will lead with what to buy and why."
      />
      {demo ? (
        <TodayPreview recommendations={demoRecommendations} attention={demoAttention} question={demoQuestion} />
      ) : (
        <EmptyState title="Your buying advice will appear here.">
          Once your point-of-sale system is connected, this is where you’ll see what to reorder and why.
        </EmptyState>
      )}
    </Page>
  )
}

import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

/** Calm placeholder for areas not built yet: says what the page will do. */
export function Placeholder({ eyebrow, title, lead, body }: { eyebrow: string; title: string; lead: string; body: string }) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} lead={lead} />
      <EmptyState title="What this will show">{body}</EmptyState>
    </Page>
  )
}

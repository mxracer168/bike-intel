import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoPrograms } from '@/demo/programs'
import { listPrograms } from '@/domain/programs/programs'
import { byFit } from '@/features/programs/format'
import { ProgramList } from '@/features/programs/ProgramViews'
import { requireOrganization } from '@/server/session'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Programs' }

/** Supplier programs: the retailer's own and the ones suppliers publish, best fit first. */
export default async function ProgramsPage() {
  const { db, organization } = await requireOrganization()
  const real = await listPrograms(db, organization.id)
  const programs = isDemoPreviewEnabled() ? [...real, ...demoPrograms].sort(byFit) : real
  const fitted = programs.some((p) => p.fit)

  return (
    <Page>
      <PageHeader
        eyebrow="Supplier opportunities"
        title="Programs"
        lead={fitted
          ? 'Evaluated against your actual demand, cash position and buying history.'
          : 'Booking and preseason programs, from your suppliers and the ones you upload.'}
      />
      {programs.length > 0 ? (
        <ProgramList programs={programs} />
      ) : (
        <EmptyState title="No programs yet.">
          Upload a booking or preseason program you’ve received from its supplier’s page, or open one a
          supplier has published, and see what it means for your store before you commit.
        </EmptyState>
      )}
    </Page>
  )
}

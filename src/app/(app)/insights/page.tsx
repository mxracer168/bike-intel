import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoDecisions, demoOpportunities, demoPatterns, demoPerformance } from '@/demo/insights'
import { listLocations } from '@/domain/location/list'
import { InsightsView } from '@/features/insights/InsightsView'
import styles from '@/features/placeholder/Placeholder.module.css'
import { requireOrganization } from '@/server/session'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Insights' }

/**
 * Insights: what the business is teaching us over time. Measure, notice, ask,
 * learn. Example data only for now (see docs/insights.md).
 */
export default async function InsightsPage() {
  if (!isDemoPreviewEnabled()) {
    return (
      <Page width="narrow">
        <PageHeader title="Not enough history yet." />
        <section className={styles.section} aria-labelledby="performance">
          <h2 id="performance" className={styles.heading}>Performance</h2>
          <p className={styles.body}>How close your orders came to what you actually sold, where stock ran short and where it sat too long.</p>
        </section>
        <section className={styles.section} aria-labelledby="opportunities">
          <h2 id="opportunities" className={styles.heading}>Opportunities</h2>
          <p className={styles.body}>Categories that are growing, programs that fit your store, and stock that could be put to better use.</p>
        </section>
      </Page>
    )
  }
  const { db, organization } = await requireOrganization()
  const locations = (await listLocations(db, organization.id)).filter((l) => l.status === 'active').map((l) => ({ id: l.id, name: l.name }))
  return (
    <Page>
      <InsightsView performance={demoPerformance} decisions={demoDecisions} patterns={demoPatterns}
        opportunities={demoOpportunities} locations={locations} />
    </Page>
  )
}

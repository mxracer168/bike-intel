import type { Metadata } from 'next'
import { Page, PageHeader } from '@/ui/Layout'
import styles from '@/features/placeholder/Placeholder.module.css'

export const metadata: Metadata = { title: 'Insights' }

/** Placeholder until this area is built. Performance and opportunities live here. */
export default function InsightsPage() {
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

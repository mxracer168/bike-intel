import Link from 'next/link'
import type { AttentionItem, RecommendationView } from '@/features/recommendations/types'
import { RecommendationCard } from '@/features/recommendations/RecommendationCard'
import { ExampleRegion } from '@/ui/Example'
import { AdvisorQuestion } from './AdvisorQuestion'
import styles from './Today.module.css'

/**
 * What Today will look like once sales are connected, built from example
 * data. Every piece sits inside a region marked "Example data".
 */
export function TodayPreview({ recommendations, attention, question }: {
  recommendations: RecommendationView[]
  attention: AttentionItem[]
  question: { prompt: string; detail?: string; choices: string[] }
}) {
  const decisions = recommendations.length
  return (
    <ExampleRegion title="This is how Today will look once your sales are connected. Nothing here is real.">
      <div className={styles.layout}>
        <section className={styles.stack} aria-labelledby="today-decisions">
          <div className={styles.sectionHead}>
            <h2 id="today-decisions" className={styles.sectionTitle}>{decisions} products need a decision this week</h2>
            <p className={styles.sectionLead}>Mostly reorders. One we’d rather you skip.</p>
          </div>
          {recommendations.map((rec) => <RecommendationCard key={rec.id} rec={rec} example />)}
        </section>

        <div className={styles.aside}>
          <section className={styles.panel} aria-labelledby="today-worth">
            <h2 id="today-worth" className={styles.panelTitle}>Worth a look</h2>
            <ul className={styles.items}>
              {attention.map((a) => (
                <li key={a.id} className={styles.item}>
                  <span className={[styles.dot, a.tone === 'consider' && styles.dotConsider].filter(Boolean).join(' ')} aria-hidden="true" />
                  <span className={styles.itemText}>
                    <b>{a.title}</b>
                    <span>{a.detail}</span>
                    {a.href && <Link href={a.href}>Take a look</Link>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <AdvisorQuestion {...question} example />
        </div>
      </div>
    </ExampleRegion>
  )
}

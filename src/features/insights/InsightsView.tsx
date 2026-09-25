'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { formatFit } from '@/features/suppliers/programFit'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import type { HealthMetric } from '@/features/today/types'
import { Icon } from '@/ui/Icon'
import { DecisionChart } from './DecisionChart'
import type { DecisionOutcome, InsightAction, OpportunityView, PatternView } from './types'
import styles from './Insights.module.css'

function Action({ action }: { action: InsightAction }) {
  return (
    <Link href={action.href} className={styles.action}>
      {action.label}<Icon name="chevron-right" size={13} />
    </Link>
  )
}

/**
 * When the data can't explain a pattern: the same question the intelligence
 * panel and weekly check-in ask (one question, many places), in the soft
 * Harbor blue of "Questions for you". Answering here resolves it everywhere.
 */
function ContextQuestion({ questionId }: { questionId: string }) {
  const api = useIntelligence()
  const [answered, setAnswered] = useState<string | null>(null)
  const q = api?.questions.find((x) => x.id === questionId)
  if (!api || !q) return null
  if (q.status === 'answered' || answered) {
    const noise = (answered ?? q.answer?.choice) === 'Nothing specific'
    return (
      <div className={styles.question}>
        <p className={styles.questionLead}>
          {noise ? 'Thanks. We’ll treat it as an unusually busy month unless it happens again.' : 'Thanks. We’ll use what you told us when planning next August.'}
        </p>
      </div>
    )
  }
  if (q.status !== 'open' && q.status !== 'deferred') return null
  async function quick(choice: string) {
    const problem = await api!.answer(questionId, choice, null, 'panel')
    if (!problem) setAnswered(choice)
  }
  return (
    <div className={styles.question} role="group" aria-label="A question about this">
      <div>
        <p className={styles.questionTitle}>Do you know what changed?</p>
        <p className={styles.questionLead}>A school program, an event, a new brand? It helps us plan next year.</p>
      </div>
      <div className={styles.questionActions}>
        <button type="button" className={styles.questionPrimary} aria-haspopup="dialog" onClick={() => api.open({ tellUsMoreFor: questionId })}>
          Tell us what happened
        </button>
        <button type="button" className={styles.questionQuiet} onClick={() => quick('Nothing specific')}>Nothing specific</button>
      </div>
    </div>
  )
}

/**
 * Insights: what the business is teaching us over time. Performance (did we
 * buy about the right amount?), patterns worth noticing, and opportunities.
 * Example data; the period and location controls don't change it yet.
 */
export function InsightsView({ performance, decisions, patterns, opportunities, locations }: {
  performance: HealthMetric[]
  decisions: DecisionOutcome[]
  patterns: PatternView[]
  opportunities: OpportunityView[]
  locations: { id: string; name: string }[]
}) {
  const [period, setPeriod] = useState('90')
  const [location, setLocation] = useState('')
  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Insights</h1>
        <div className={styles.controls}>
          <label className={styles.control}>
            <span className="visually-hidden">Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </label>
          {locations.length > 1 && (
            <label className={styles.control}>
              <span className="visually-hidden">Location</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">All locations</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
        </div>
      </header>

      <div className={styles.zones}>
        <section className={styles.zone} aria-labelledby="insights-performance">
          <h2 id="insights-performance" className={styles.zoneTitle}>Performance</h2>
          <HealthSnapshot metrics={performance} />
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>How recent decisions played out</h3>
            <DecisionChart decisions={decisions} />
          </div>
        </section>

        <section className={styles.zone} aria-labelledby="insights-patterns">
          <h2 id="insights-patterns" className={styles.zoneTitle}>Patterns worth noticing</h2>
          <ul className={styles.rows}>
            {patterns.map((p) => (
              <li key={p.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{p.observation}</p>
                  <p className={styles.rowFacts}>{p.facts.join(' · ')}</p>
                  {p.questionId && <ContextQuestion questionId={p.questionId} />}
                </div>
                {p.action && <Action action={p.action} />}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.zone} aria-labelledby="insights-opportunities">
          <h2 id="insights-opportunities" className={styles.zoneTitle}>Opportunities</h2>
          <ul className={styles.rows}>
            {opportunities.map((o) => (
              <li key={o.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{o.title}</p>
                  <p className={styles.rowFacts}>{o.detail}</p>
                  {o.programFit !== undefined && (
                    <p className={styles.fit}><b>{formatFit(o.programFit)}</b> / 5 · Program fit</p>
                  )}
                </div>
                {o.action && <Action action={o.action} />}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

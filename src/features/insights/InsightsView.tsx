'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { formatFit } from '@/features/suppliers/programFit'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import type { HealthMetric } from '@/features/today/types'
import { Icon } from '@/ui/Icon'
import { DecisionOutcomes } from './DecisionOutcomes'
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
 * panel and weekly check-in ask (one question, many places). Answering here
 * resolves it everywhere.
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
 * buy about the right amount?), how recent decisions played out, patterns
 * worth noticing, and opportunities. Every item reads answer → reason →
 * evidence: the conclusion is the largest thing on its line; the facts
 * behind it step back.
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
        <div>
          <p className={styles.eyebrow}>Learning from every decision</p>
          <h1 className={styles.title}>Insights</h1>
          <p className={styles.lead}>How recommendations performed, where your experience made the difference, and what we can learn together.</p>
        </div>
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

      <section aria-labelledby="insights-performance">
        <h2 id="insights-performance" className="visually-hidden">Performance</h2>
        <HealthSnapshot metrics={performance} variant="panel" />
      </section>

      <section className={styles.zone} aria-labelledby="insights-decisions">
        <div className={styles.zoneHead}>
          <h2 id="insights-decisions" className={styles.zoneTitle}>How recent decisions played out</h2>
          <p className={styles.zoneLead}>Choose a lesson to review the decisions behind it.</p>
        </div>
        <DecisionOutcomes decisions={decisions} />
      </section>

      <section className={styles.zoneRuled} aria-labelledby="insights-patterns">
        <h2 id="insights-patterns" className={styles.zoneEyebrow}>Patterns worth noticing</h2>
        <ul className={styles.cards}>
          {patterns.map((p) => (
            <li key={p.id} className={[styles.card, p.questionId && styles.cardWide].filter(Boolean).join(' ')}>
              <span className={[styles.dot, p.questionId ? styles.dotAsk : styles.dotInfo].join(' ')} aria-hidden="true" />
              <div className={styles.cardMain}>
                <h3 className={styles.cardTitle}>{p.observation}</h3>
                <p className={styles.cardFacts}>{p.facts.join(' · ')}</p>
                {p.questionId && <ContextQuestion questionId={p.questionId} />}
                {p.action && <Action action={p.action} />}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.zoneRuled} aria-labelledby="insights-opportunities">
        <h2 id="insights-opportunities" className={styles.zoneEyebrow}>Opportunities</h2>
        <ul className={styles.cards}>
          {opportunities.map((o) => (
            <li key={o.id} className={styles.card}>
              <span className={[styles.dot, styles.dotGood].join(' ')} aria-hidden="true" />
              <div className={styles.cardMain}>
                <h3 className={styles.cardTitle}>{o.title}</h3>
                <p className={styles.cardReason}>{o.detail}</p>
                {o.programFit !== undefined && (
                  <p className={styles.fit}><b>{formatFit(o.programFit)}</b> / 5 · Program fit</p>
                )}
                {o.action && <Action action={o.action} />}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

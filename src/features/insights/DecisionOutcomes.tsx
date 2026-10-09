'use client'

import { useId, useState } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { Icon } from '@/ui/Icon'
import type { DecisionOutcome } from './types'
import styles from './Insights.module.css'

type Group = DecisionOutcome['group']

/** The three lessons, in order. The label says who it's about; the line says what it means. */
const lessons: { group: Group; label: string; title: string; description: string }[] = [
  { group: 'judgment', label: 'You added value', title: 'Where your judgment mattered', description: 'Your local knowledge improved the outcome beyond what the data could see.' },
  { group: 'recommendation', label: 'Recommendations helped', title: 'Where recommendations helped', description: 'The recommendation landed closer to real demand than the order did.' },
  { group: 'improve', label: 'Learning together', title: 'Where we can improve', description: 'Both missed demand. Worth a closer look together.' },
]

/** Show this many outcomes in a lesson before "View all". */
const PREVIEW = 3

/** Which plan landed closer to demand, from the three numbers alone. */
export function closer(d: Pick<DecisionOutcome, 'recommended' | 'approved' | 'demand'>) {
  const rec = Math.abs(d.recommended - d.demand)
  const you = Math.abs(d.approved - d.demand)
  const verdict = rec === you ? 'Both were equally close' : you < rec ? 'Your decision was closer' : 'The recommendation was closer'
  const units = you === 0 ? 'exactly on demand' : `${you} ${you === 1 ? 'unit' : 'units'} from demand`
  return { verdict, approved: `What you approved was ${units}` }
}

/**
 * How recent decisions played out. Choose a lesson; each decision then reads
 * answer first (what happened, in a sentence) and evidence second: what we
 * recommended, what you approved and what demand turned out to be. Agreeing
 * with the recommendation is not the same as matching demand, so the three
 * numbers are always shown apart.
 */
export function DecisionOutcomes({ decisions }: { decisions: DecisionOutcome[] }) {
  const present = lessons.filter((l) => decisions.some((d) => d.group === l.group))
  const [group, setGroup] = useState<Group | null>(present[0]?.group ?? null)
  const [all, setAll] = useState(false)
  const intelligence = useIntelligence()
  const listId = useId()
  if (!group) return null
  const lesson = lessons.find((l) => l.group === group)!
  const items = decisions.filter((d) => d.group === group)
  const shown = all ? items : items.slice(0, PREVIEW)
  const count = (g: Group) => decisions.filter((d) => d.group === g).length

  return (
    <div className={styles.decisions}>
      <div className={styles.lessons} role="group" aria-label="Lessons">
        {present.map((l) => (
          <button key={l.group} type="button" aria-pressed={l.group === group} aria-controls={listId}
            className={[styles.lesson, styles[`lesson_${l.group}`]].join(' ')}
            onClick={() => { setGroup(l.group); setAll(false) }}>
            <span className={styles.lessonTop}>
              <span className={styles.lessonLabel}>{l.label}</span>
              <span className={styles.lessonCount}>{count(l.group) === 1 ? '1 decision' : `${count(l.group)} decisions`}</span>
            </span>
            <span className={styles.lessonTitle}>{l.title}</span>
            <span className={styles.lessonText}>{l.description}</span>
          </button>
        ))}
      </div>

      <section id={listId} className={styles.outcomes} aria-labelledby={`${listId}-t`}>
        <header className={styles.outcomesHead}>
          <h3 id={`${listId}-t`} className={styles.outcomesTitle}>{lesson.title}</h3>
          <p className={styles.outcomesCount}>Showing {shown.length} of {items.length}</p>
        </header>
        <ul className={styles.outcomeList}>
          {shown.map((d) => {
            const c = closer(d)
            return (
              <li key={d.id} className={styles.outcome}>
                <div className={styles.outcomeText}>
                  <p className={styles.outcomeItem}>{d.item}</p>
                  <h4 className={styles.outcomeTitle}>{d.note}</h4>
                  {intelligence && (
                    <button type="button" className={styles.addContext} aria-haspopup="dialog"
                      onClick={() => intelligence.open({ about: { label: d.item } })}>
                      <Icon name="plus" size={14} />Add context
                    </button>
                  )}
                </div>
                <figure className={styles.compare}>
                  <dl className={styles.compareNumbers} aria-label={`Recommended ${d.recommended}, you approved ${d.approved}, demand ${d.demand}`}>
                    <div><dt>Recommended</dt><dd className={styles.numRec}>{d.recommended}</dd></div>
                    <div><dt>You approved</dt><dd className={styles.numYou}>{d.approved}</dd></div>
                    <div><dt>Demand</dt><dd className={styles.numDemand}>{d.demand}</dd></div>
                  </dl>
                  <figcaption className={styles.compareVerdict}>{c.verdict} <span aria-hidden="true">·</span> {c.approved.charAt(0).toLowerCase() + c.approved.slice(1)}</figcaption>
                </figure>
              </li>
            )
          })}
        </ul>
        {items.length > PREVIEW && (
          <button type="button" className={styles.more} aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? 'Show fewer' : `View all ${items.length}`}<Icon name="chevron-down" size={14} />
          </button>
        )}
      </section>
    </div>
  )
}

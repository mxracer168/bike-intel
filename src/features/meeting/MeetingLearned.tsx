'use client'

import { useId, useState } from 'react'
import { Button } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { ConceptIcon } from './icons'
import type { Learned } from './types'
import styles from './Meeting.module.css'

const PREVIEW = 3

/**
 * What the conversation has surfaced, under the call: reference, not
 * something to watch while talking. During the meeting it shows the latest
 * few; at the end it invites a review. A durable rule is only ever a
 * suggestion for the retailer's business instructions; nothing here writes
 * to them.
 */
export function MeetingLearned({ learned, fresh = [], ended = false }: { learned: Learned[]; fresh?: Learned[]; ended?: boolean }) {
  const [open, setOpen] = useState(true)
  const [all, setAll] = useState(false)
  const listId = useId()
  const suggested = learned.filter((k) => k.kind === 'instruction').length
  const isFresh = new Set(fresh.map((f) => f.id))
  const insights = `${learned.length} ${learned.length === 1 ? 'insight' : 'insights'}`

  if (ended) {
    return (
      <section className={[styles.learned, styles.learnedEnd].join(' ')} aria-labelledby={`${listId}-t`}>
        <div className={styles.learnedHead}>
          <span className={styles.learnedIcon}><ConceptIcon name="insight" size={22} /></span>
          <div className={styles.learnedTitles}>
            <h2 id={`${listId}-t`} className={styles.learnedTitle}>What we learned</h2>
            <p className={styles.learnedSub}>
              {insights} from today’s conversation
              {suggested > 0 && <> · {suggested} suggested Business {suggested === 1 ? 'Instruction' : 'Instructions'}</>}
            </p>
          </div>
          {!all && <Button size="sm" onClick={() => setAll(true)}>Review what we learned</Button>}
        </div>
        {all && <Items id={listId} items={learned} fresh={isFresh} review />}
      </section>
    )
  }

  const shown = all ? learned : learned.slice(-PREVIEW)
  return (
    <section className={styles.learned} aria-labelledby={`${listId}-t`}>
      <div className={styles.learnedHead}>
        <span className={styles.learnedIcon}><ConceptIcon name="insight" size={22} /></span>
        <div className={styles.learnedTitles}>
          <h2 id={`${listId}-t`} className={styles.learnedTitle}>What we’re learning</h2>
          <p className={styles.learnedSub}>
            {open
              ? 'We’re capturing key points to create recommendations that fit your business.'
              : suggested > 0 ? `${suggested} may belong in your Business Instructions` : 'Key points from this conversation'}
          </p>
        </div>
        {learned.length > 0 && (
          <button type="button" className={styles.learnedToggle} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)}>
            {open ? `${shown.length} of ${insights}` : insights}
            <Icon name="chevron-down" size={14} />
          </button>
        )}
      </div>
      {open && (
        learned.length === 0
          ? <p className={styles.learnedEmpty}>As we talk, what I learn about your business shows up here.</p>
          : (
            <div className={styles.learnedBody}>
              <Items id={listId} items={shown} fresh={isFresh} />
              {learned.length > PREVIEW && (
                <Button size="sm" onClick={() => setAll((v) => !v)}>{all ? 'Show latest' : 'View all insights'}</Button>
              )}
            </div>
          )
      )}
    </section>
  )
}

function Items({ id, items, fresh, review }: { id: string; items: Learned[]; fresh: Set<string>; review?: boolean }) {
  return (
    <div className={styles.learnedItems}>
      <ul id={id} className={styles.learnedList}>
        {items.map((k) => (
          <li key={k.id} className={fresh.has(k.id) ? styles.fresh : undefined}>
            {k.text}
            {kindNote(k) && <span className={styles.kind}> · {kindNote(k)}</span>}
          </li>
        ))}
      </ul>
      {review && <p className={styles.reviewNote}>Nothing here changes your Business Instructions until you review and add it yourself.</p>}
    </div>
  )
}

function kindNote(k: Learned): string | null {
  switch (k.kind) {
    case 'instruction': return 'Suggested for your Business Instructions'
    case 'seasonal': return `Every year${k.when ? `, ${k.when}` : ''}`
    case 'temporary': return `Coming up${k.when ? `, ${k.when}` : ''}`
    case 'context': return null
  }
}

'use client'

import { useId, useState, type ReactNode } from 'react'
import { Icon } from '@/ui/Icon'
import { ConceptIcon } from './icons'
import type { AgendaItemState } from './types'
import styles from './Meeting.module.css'

/**
 * The meeting's agenda, at the top of the side column. It orients; it is not
 * a wizard: no step counts, no next button, no progress bar. By default it
 * shows where the conversation is (what was just covered, what's being
 * discussed, what's up next with its one-line intro); the full agenda is one
 * click away. Any agenda works here, whether onboarding's fixed topics or a
 * weekly check-in's prepared ones.
 *
 * `next` is shown as its own card under the agenda once the agenda is done,
 * such as scheduling the check-in at the end of onboarding.
 */
export function MeetingAgenda({ agenda, title, lead, doneTitle, doneLead, next }: {
  agenda: AgendaItemState[]
  title: string
  lead: string
  doneTitle?: string
  doneLead?: string
  next?: ReactNode
}) {
  const [full, setFull] = useState(false)
  const listId = useId()
  const upNext = agenda.find((t) => t.status === 'upcoming') ?? null
  const covered = agenda.every((t) => t.status === 'done')
  const shown = full ? agenda : around(agenda, upNext)
  return (
    <>
      <section className={styles.agendaCard} aria-labelledby={`${listId}-t`}>
        <h2 id={`${listId}-t`} className={styles.agendaTitle}>{covered && doneTitle ? doneTitle : title}</h2>
        <p className={styles.agendaLead}>{covered && doneLead ? doneLead : lead}</p>

        <ol id={listId} className={styles.agenda} aria-label="Agenda">
          {shown.map((t) => {
            const isNext = t === upNext
            return (
              <li key={t.id} className={[styles[t.status], isNext && styles.next].filter(Boolean).join(' ')}
                aria-current={t.status === 'current' ? 'step' : undefined}>
                <Marker status={t.status} next={isNext} />
                <span className={styles.agendaText}>
                  <span className={styles.agendaLabel}>{t.label}</span>
                  {isNext && t.intro && !full && <span className={styles.agendaIntro}>{t.intro}</span>}
                </span>
                {t.status === 'current' && <span className={styles.agendaNow} aria-hidden="true">Now</span>}
                {isNext && <span className={styles.agendaSoon} aria-hidden="true">Up next</span>}
                <span className="visually-hidden">{t.status === 'done' ? ' (covered)' : t.status === 'current' ? ' (now)' : isNext ? ' (up next)' : ''}</span>
              </li>
            )
          })}
        </ol>

        {agenda.length > shown.length || full ? (
          <button type="button" className={styles.agendaToggle} aria-expanded={full} aria-controls={listId} onClick={() => setFull((v) => !v)}>
            {full ? 'Show where we are' : `Full agenda · ${agenda.length} topics`}
            <Icon name="chevron-down" size={14} />
          </button>
        ) : null}
      </section>
      {next}
    </>
  )
}

/** Where the conversation is: the item before, the current one, and the one after (or the last two once all are covered). */
function around(agenda: AgendaItemState[], upNext: AgendaItemState | null): AgendaItemState[] {
  const current = agenda.findIndex((t) => t.status === 'current')
  const anchor = current >= 0 ? current : upNext ? agenda.indexOf(upNext) : agenda.length - 1
  const from = Math.max(0, Math.min(anchor - 1, agenda.length - 3))
  return agenda.slice(from, from + 3)
}

/** A card under the agenda: "UP NEXT", a strong title, one short line; actions can follow. */
export function UpNext({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className={styles.upNext} aria-label={typeof title === 'string' ? title : eyebrow}>
      <span className={styles.upNextIcon}><ConceptIcon name="calendar" size={21} /></span>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.upNextTitle}>{title}</h2>
      <div className={styles.upNextBody}>{children}</div>
    </section>
  )
}

/** Covered: a filled check. Now: a filled dot. Up next: a blue ring. Later: a grey ring. */
function Marker({ status, next }: { status: AgendaItemState['status']; next: boolean }) {
  return (
    <svg className={styles.marker} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {status === 'done' && <><circle cx="10" cy="10" r="9" className={styles.markDone} /><path d="M6 10.2 8.7 13 14 7.3" className={styles.markCheck} /></>}
      {status === 'current' && <circle cx="10" cy="10" r="9" className={styles.markCurrent} />}
      {status === 'upcoming' && <circle cx="10" cy="10" r="8.25" className={next ? styles.markNext : styles.markLater} />}
    </svg>
  )
}

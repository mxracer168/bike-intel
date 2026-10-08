import type { ReactNode } from 'react'
import { ConceptIcon } from './icons'
import type { AgendaItemState } from './types'
import styles from './Meeting.module.css'

/**
 * The top of the meeting panel: what's up next, then the agenda. An agenda
 * orients; it is not a wizard: no step counts, no next button, no progress
 * bar. Any agenda works here, whether onboarding's fixed topics or a weekly
 * check-in's prepared ones.
 *
 * `next` replaces the default "up next" (the first agenda item not yet
 * reached) with something else, such as scheduling at the end of a meeting.
 */
export function MeetingAgenda({ agenda, next, label = 'Today’s agenda' }: {
  agenda: AgendaItemState[]
  next?: ReactNode
  label?: string
}) {
  const upNext = agenda.find((t) => t.status === 'upcoming') ?? null
  return (
    <section className={styles.agendaCard} aria-label="Agenda">
      {next ?? (upNext && <UpNext eyebrow="Up next" title={upNext.label}>{upNext.intro && <p>{upNext.intro}</p>}</UpNext>)}
      {!next && !upNext && <UpNext eyebrow="Up next" title="Wrapping up"><p>A quick recap, then how we’ll stay in touch.</p></UpNext>}

      <ol className={styles.agenda} aria-label={label}>
        {agenda.map((t) => {
          const isNext = t === upNext
          return (
            <li key={t.id} className={[styles[t.status], isNext && styles.next].filter(Boolean).join(' ')}
              aria-current={t.status === 'current' ? 'step' : undefined}>
              <Marker status={t.status} next={isNext} />
              <span>{t.label}</span>
              <span className="visually-hidden">{t.status === 'done' ? ' (covered)' : t.status === 'current' ? ' (now)' : isNext ? ' (up next)' : ''}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** "UP NEXT" with a strong title and one short line; actions can follow. */
export function UpNext({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className={styles.upNext}>
      <span className={styles.upNextIcon}><ConceptIcon name="calendar" size={22} /></span>
      <div className={styles.upNextBody}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.upNextTitle}>{title}</h2>
        {children}
      </div>
    </div>
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

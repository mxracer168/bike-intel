import { attachmentKind, formatBytes } from '@/domain/intelligence/attachments'
import { Icon } from '@/ui/Icon'
import type { ConversationEntry } from './types'
import styles from './Intelligence.module.css'

function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso)
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d)
}

const time = (iso: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).toLowerCase()

const who = { you: 'You', teammate: 'A teammate', system: 'We' } as const

/** A plain heuristic for display only; nothing is stored or decided from it. */
function looksLikeQuestion(body: string | null) {
  return Boolean(body && /\?\s*$/.test(body.trim()))
}

/**
 * The conversation as a quiet transcript: a day line when the day changes,
 * the speaker when the speaker changes. No bubbles.
 */
export function Transcript({ entries, pending }: { entries: ConversationEntry[]; pending: string | null }) {
  const rows = entries.map((e, i) => {
    const prev = entries[i - 1]
    const day = dayLabel(e.createdAt)
    const newDay = !prev || dayLabel(prev.createdAt) !== day
    const sameSpeaker = prev && prev.author === e.author && prev.authorId === e.authorId && prev.kind !== 'check_in'
    // Honest about what we can't do yet: a question from the retailer with no reply after it.
    const unanswered = e.author !== 'system' && e.kind === 'text' && looksLikeQuestion(e.body)
      && !entries.slice(i + 1).some((later) => later.author === 'system')
    return { e, day, newDay, unanswered, showWho: newDay || !sameSpeaker || e.kind === 'check_in' }
  })
  return (
    <ol className={styles.transcript} aria-label="Conversation">
      {rows.map(({ e, day, newDay, showWho, unanswered }) => {
        return (
          <li key={e.id} className={styles.item}>
            {newDay && <p className={styles.day}>{day}</p>}
            {e.kind === 'check_in' ? (
              <p className={styles.checkInMark}>{e.body ?? 'Weekly check-in'}</p>
            ) : (
              <>
                {showWho && <p className={styles.who}>{who[e.author]} <span>{time(e.createdAt)}</span></p>}
                <Body entry={e} />
                {unanswered && <p className={styles.notYet}>We can’t answer questions yet. It’s saved here.</p>}
                {e.example && <p className={styles.notYet}>Example answer; not saved.</p>}
              </>
            )}
          </li>
        )
      })}
      {pending && (
        <li className={styles.item}>
          <p className={styles.attachment} aria-live="polite"><Icon name="file" /> <span>Adding {pending}…</span></p>
        </li>
      )}
    </ol>
  )
}

function Body({ entry: e }: { entry: ConversationEntry }) {
  if (e.kind === 'attachment' && e.attachment) {
    const a = e.attachment
    const meta = [attachmentKind(a.mime), a.size ? formatBytes(a.size) : null].filter(Boolean).join(' · ')
    return (
      <p className={styles.attachment}>
        <Icon name="file" />
        <span>
          <a href={`/files/${a.id}`} className={styles.fileLink}>{a.name}</a>
          <span className={styles.fileMeta}>{meta}{meta && ' · '}Saved. We haven’t read it yet.</span>
        </span>
      </p>
    )
  }
  if (e.kind === 'question') {
    return <p className={styles.asked}>{e.question?.prompt || e.body}</p>
  }
  if (e.kind === 'answer') {
    return (
      <div className={styles.answerEntry}>
        {e.question?.prompt && <p className={styles.answerTo}>{e.question.prompt}</p>}
        <p>{[e.answerChoice, e.body].filter(Boolean).join('. ')}</p>
      </div>
    )
  }
  return <p className={styles.text}>{e.body}</p>
}

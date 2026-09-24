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

/** A plain heuristic for display only; nothing is stored or decided from it. */
function looksLikeQuestion(body: string | null) {
  return Boolean(body && /\?\s*$/.test(body.trim()))
}

/**
 * The conversation as a quiet transcript. What the retailer says sits to the
 * right on a faint surface; replies are plain editorial text on the left,
 * with no icon or label. A day line appears when the day changes.
 */
export function Transcript({ entries, pending, label = 'Conversation' }: {
  entries: ConversationEntry[]; pending: string | null; label?: string
}) {
  const rows = entries.map((e, i) => {
    const prev = entries[i - 1]
    const day = dayLabel(e.createdAt)
    const newDay = !prev || dayLabel(prev.createdAt) !== day
    const sameSpeaker = Boolean(prev && !newDay && prev.author === e.author && prev.authorId === e.authorId)
    // Honest about what we can't do yet: a question from the retailer with no reply after it.
    const unanswered = e.author !== 'system' && e.kind === 'text' && looksLikeQuestion(e.body)
      && !entries.slice(i + 1).some((later) => later.author === 'system')
    return { e, day, newDay, sameSpeaker, unanswered }
  })
  return (
    <ol className={styles.transcript} aria-label={label}>
      {rows.map(({ e, day, newDay, sameSpeaker, unanswered }) => (
        <li key={e.id} className={[styles.item, e.author === 'system' ? styles.fromAssistant : styles.fromRetailer,
          sameSpeaker && styles.continued].filter(Boolean).join(' ')}>
          {newDay && <p className={styles.day}>{day}</p>}
          {e.kind === 'check_in' ? (
            <p className={styles.checkInMark}>{e.body ?? 'Weekly check-in'}</p>
          ) : (
            <>
              {/* Who is speaking is carried by layout; screen readers get it in words. */}
              <span className="visually-hidden">{e.author === 'system' ? 'Reply:' : e.author === 'you' ? 'You:' : ''}</span>
              {!sameSpeaker && e.author === 'teammate' && <p className={styles.speaker}>A teammate</p>}
              <Body entry={e} />
              {unanswered && <p className={styles.notYet}>I can’t answer questions yet. It’s saved here.</p>}
              {e.note && <p className={styles.notYet}>{e.note}</p>}
            </>
          )}
        </li>
      ))}
      {pending && (
        <li className={[styles.item, styles.fromRetailer].join(' ')}>
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
      <div className={styles.attachment}>
        <Icon name="file" />
        <span>
          <a href={`/files/${a.id}`} className={styles.fileLink}>{a.name}</a>
          <span className={styles.fileMeta}>{meta}{meta && ' · '}Saved. I haven’t read it yet.</span>
        </span>
      </div>
    )
  }
  if (e.kind === 'question') {
    return <p className={styles.said}>{e.question?.prompt || e.body}</p>
  }
  if (e.kind === 'answer') {
    return (
      <div className={styles.said}>
        {e.question?.prompt && <p className={styles.answerTo}>{e.question.prompt}</p>}
        <p>{[e.answerChoice, e.body].filter(Boolean).join('. ')}</p>
      </div>
    )
  }
  // Paragraphs, not one block: the assistant writes like an editor, not a chat bubble.
  const paragraphs = (e.body ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className={styles.said}>
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

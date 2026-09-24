'use client'

import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { attachmentKind, formatBytes } from '@/domain/intelligence/attachments'
import { Icon } from '@/ui/Icon'
import type { ConversationEntry } from './types'
import styles from './Intelligence.module.css'

/** "Sep 23, 2026 · 4:18 PM" */
function stamp(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
  return `${date} · ${time}`
}

/** A plain heuristic for display only; nothing is stored or decided from it. */
function looksLikeQuestion(body: string | null) {
  return Boolean(body && /\?\s*$/.test(body.trim()))
}

/**
 * The conversation as one continuous, quiet transcript: no date dividers,
 * no labels. What the retailer says sits to the right on a faint surface;
 * replies are plain editorial text. Times are there on demand: click or tap
 * a message to show when it was said, again to hide it.
 *
 * Keyboard: the whole conversation is a single tab stop (a roving focus, so
 * reading isn't interrupted by dozens of stops). Up/Down move between
 * messages, Home/End jump to the ends, Enter or Space shows or hides the time.
 */
export function Transcript({ entries, pending, label = 'Conversation' }: {
  entries: ConversationEntry[]; pending: string | null; label?: string
}) {
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set())
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const hintId = useId()
  // Default tab stop: the latest message, where the reader usually is.
  const tabStop = focusIndex ?? entries.length - 1

  const toggle = (id: string, i: number) => {
    const opening = !shown.has(id)
    setShown((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Keep a newly shown time in view (the last message sits just above the composer).
    if (opening) requestAnimationFrame(() => items.current[i]?.scrollIntoView({ block: 'nearest' }))
  }

  const move = (to: number) => {
    const i = Math.max(0, Math.min(entries.length - 1, to))
    setFocusIndex(i)
    items.current[i]?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLLIElement>, i: number, id: string) {
    if ((e.target as HTMLElement).closest('a, button') && e.target !== e.currentTarget) return
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(entries.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id, i) }
  }

  function onClick(e: MouseEvent<HTMLLIElement>, i: number, id: string) {
    // Links (attachments) keep working, and selecting text doesn't toggle.
    if ((e.target as HTMLElement).closest('a, button')) return
    if (window.getSelection()?.toString()) return
    setFocusIndex(i)
    toggle(id, i)
  }

  const rows = entries.map((e, i) => {
    const prev = entries[i - 1]
    const sameSpeaker = Boolean(prev && prev.author === e.author && prev.authorId === e.authorId)
    // Honest about what we can't do yet: a question from the retailer with no reply after it.
    const unanswered = e.author !== 'system' && e.kind === 'text' && looksLikeQuestion(e.body)
      && !entries.slice(i + 1).some((later) => later.author === 'system')
    return { e, i, sameSpeaker, unanswered }
  })

  return (
    <>
      <p id={hintId} className="visually-hidden">Use the up and down arrow keys to move between messages. Press Enter to show or hide when a message was sent.</p>
      <ol className={styles.transcript} aria-label={label} aria-describedby={hintId}>
        {rows.map(({ e, i, sameSpeaker, unanswered }) => {
          const open = shown.has(e.id)
          return (
            <li
              key={e.id}
              ref={(el) => { items.current[i] = el }}
              tabIndex={i === tabStop ? 0 : -1}
              title={stamp(e.createdAt)}
              aria-describedby={open ? `${e.id}-time` : undefined}
              className={[styles.item, e.author === 'system' ? styles.fromAssistant : styles.fromRetailer,
                sameSpeaker && styles.continued, open && styles.itemOpen].filter(Boolean).join(' ')}
              onClick={(ev) => onClick(ev, i, e.id)}
              onKeyDown={(ev) => onKeyDown(ev, i, e.id)}
              onFocus={() => setFocusIndex(i)}
            >
              {e.kind === 'check_in' ? (
                <p className={styles.checkInMark}>{e.body ?? 'Weekly check-in'}</p>
              ) : (
                <>
                  {/* Who is speaking is carried by layout; screen readers get it in words. */}
                  <span className="visually-hidden">{e.author === 'system' ? 'Reply:' : e.author === 'you' ? 'You:' : 'A teammate:'}</span>
                  {!sameSpeaker && e.author === 'teammate' && <p className={styles.speaker} aria-hidden="true">A teammate</p>}
                  <Body entry={e} />
                  {unanswered && <p className={styles.notYet}>I can’t answer questions yet. It’s saved here.</p>}
                  {e.note && <p className={styles.notYet}>{e.note}</p>}
                </>
              )}
              {open && <p id={`${e.id}-time`} className={styles.time}>{stamp(e.createdAt)}</p>}
            </li>
          )
        })}
        {pending && (
          <li className={[styles.item, styles.fromRetailer].join(' ')}>
            <p className={styles.attachment} aria-live="polite"><Icon name="file" /> <span>Adding {pending}…</span></p>
          </li>
        )}
      </ol>
    </>
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
  // Paragraphs, not one block: replies read like an editor wrote them.
  const paragraphs = (e.body ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className={styles.said}>
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

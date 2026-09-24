'use client'

import { useState, type ReactNode } from 'react'
import { Icon } from '@/ui/Icon'
import { TELL_US_MORE, type IntelligenceQuestionView } from './types'
import styles from './Intelligence.module.css'

/**
 * Questions for you: below the composer, on a quieter surface, apart from
 * the conversation. One question at a time; answered ones leave and the next
 * one steps up. Collapsing hides the section without dismissing anything.
 */
export function QuestionBlock({ questions, position, total, collapsed, onToggle, replyingTo, marker, onAnswer, onTellUsMore, onDefer, onBackToQuickAnswers }: {
  questions: IntelligenceQuestionView[]
  position: number
  total: number
  collapsed: boolean
  onToggle: () => void
  replyingTo: string | null
  marker: ReactNode
  onAnswer: (id: string, choice: string) => Promise<string | null>
  onTellUsMore: (id: string) => void
  onDefer: (id: string) => void
  onBackToQuickAnswers: () => void
}) {
  const current = questions[0]
  if (!current) return null
  return (
    <section className={[styles.block, collapsed && styles.blockCollapsed].filter(Boolean).join(' ')} aria-labelledby="questions-for-you">
      <h3 className={styles.blockTitle}>
        <button type="button" className={styles.blockToggle} aria-expanded={!collapsed} aria-controls="questions-body" onClick={onToggle}>
          <span id="questions-for-you">Questions for you{collapsed && <span className={styles.count}> · {questions.length}</span>}</span>
          <span className={styles.toggleIcon} aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
          <span className="visually-hidden">{collapsed ? ' (show)' : ' (hide)'}</span>
        </button>
        {marker}
        {!collapsed && total > 1 && <span className={styles.progress}>{position} of {total}</span>}
      </h3>
      <div id="questions-body" hidden={collapsed}>
        <ol className={styles.questions}>
          <Question key={current.id} q={current} active={current.id === replyingTo}
            onAnswer={onAnswer} onTellUsMore={onTellUsMore} onDefer={onDefer} onBack={onBackToQuickAnswers} />
        </ol>
      </div>
    </section>
  )
}

export function Question({ q, onAnswer, onTellUsMore, onDefer, onBack, compact = false, active = false }: {
  q: IntelligenceQuestionView
  /** Being answered in words: the quick answers step aside. */
  active?: boolean
  onBack?: () => void
  onAnswer: (id: string, choice: string) => Promise<string | null>
  onTellUsMore: (id: string) => void
  onDefer?: (id: string) => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const answered = q.status === 'answered'

  return (
    <li className={[styles.question, compact && styles.compactQuestion].filter(Boolean).join(' ')}>
      <p className={styles.prompt}>{q.prompt}</p>
      {answered ? (
        <p className={styles.answered}>
          You answered: {[q.answer?.choice, q.answer?.body].filter(Boolean).join('. ') || 'thanks'}
        </p>
      ) : active ? (
        <div className={styles.choices}>
          <button type="button" className={styles.linkButton} onClick={onBack}>Back to quick answers</button>
        </div>
      ) : (
        <>
          <div className={styles.choices} role="group" aria-label={q.prompt}>
            {q.choices.map((c) => (
              <button key={c} type="button" className={styles.choice} disabled={busy}
                onClick={async () => { setBusy(true); setProblem(await onAnswer(q.id, c)); setBusy(false) }}>
                {c}
              </button>
            ))}
            <button type="button" className={styles.choice} disabled={busy} onClick={() => onTellUsMore(q.id)}>{TELL_US_MORE}</button>
            {onDefer && <button type="button" className={styles.linkButton} disabled={busy} onClick={() => onDefer(q.id)}>Not now</button>}
          </div>
          {problem && <p className={styles.problem} role="alert">{problem}</p>}
        </>
      )}
    </li>
  )
}

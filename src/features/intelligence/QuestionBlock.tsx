'use client'

import { useState, type ReactNode } from 'react'
import { TELL_US_MORE, type IntelligenceQuestionView } from './types'
import styles from './Intelligence.module.css'

/**
 * Questions for you: below the composer, on a quieter surface, and separate
 * from the conversation. Answered questions leave; when none are left the
 * section goes away.
 */
export function QuestionBlock({ questions, replyingTo, marker, onAnswer, onTellUsMore, onDefer }: {
  questions: IntelligenceQuestionView[]
  replyingTo: string | null
  marker: ReactNode
  onAnswer: (id: string, choice: string) => Promise<string | null>
  onTellUsMore: (id: string) => void
  onDefer: (id: string) => void
}) {
  return (
    <section className={styles.block} aria-labelledby="questions-for-you">
      <h3 id="questions-for-you" className={styles.blockTitle}>
        Questions for you <span className={styles.count}>· {questions.length}</span> {marker}
      </h3>
      <ol className={styles.questions}>
        {questions.map((q) => (
          <Question key={q.id} q={q} active={q.id === replyingTo}
            onAnswer={onAnswer} onTellUsMore={onTellUsMore} onDefer={onDefer} />
        ))}
      </ol>
    </section>
  )
}

export function Question({ q, onAnswer, onTellUsMore, onDefer, compact = false, active = false }: {
  q: IntelligenceQuestionView
  active?: boolean
  onAnswer: (id: string, choice: string) => Promise<string | null>
  onTellUsMore: (id: string) => void
  onDefer?: (id: string) => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const answered = q.status === 'answered'

  return (
    <li className={[styles.question, compact && styles.compactQuestion, active && styles.activeQuestion].filter(Boolean).join(' ')}>
      <p className={styles.prompt}>{q.prompt}</p>
      {answered ? (
        <p className={styles.answered}>
          You answered: {[q.answer?.choice, q.answer?.body].filter(Boolean).join('. ') || 'thanks'}
          {q.example && ' (example, not saved)'}
        </p>
      ) : (
        <>
          <div className={styles.choices} role="group" aria-label={q.prompt}>
            {q.choices.map((c) => (
              <button key={c} type="button" className={styles.choice} disabled={busy}
                onClick={async () => { setBusy(true); setProblem(await onAnswer(q.id, c)); setBusy(false) }}>
                {c}
              </button>
            ))}
            <button type="button" className={styles.choice} disabled={busy} aria-pressed={active} onClick={() => onTellUsMore(q.id)}>{TELL_US_MORE}</button>
            {onDefer && <button type="button" className={styles.linkButton} disabled={busy} onClick={() => onDefer(q.id)}>Not now</button>}
          </div>
          {problem && <p className={styles.problem} role="alert">{problem}</p>}
        </>
      )}
    </li>
  )
}

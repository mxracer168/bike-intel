'use client'

import { useState, type ReactNode } from 'react'
import { TELL_US_MORE, type IntelligenceQuestionView } from './types'
import styles from './Intelligence.module.css'

const words = ['no', 'one thing', 'two things', 'three things']

/** This week's questions, inside the conversation rather than as a form. */
export function QuestionBlock({ questions, marker, onAnswer, onTellUsMore, onDefer }: {
  questions: IntelligenceQuestionView[]
  marker: ReactNode
  onAnswer: (id: string, choice: string) => Promise<string | null>
  onTellUsMore: (id: string) => void
  onDefer: (id: string) => void
}) {
  const openCount = questions.filter((q) => q.status !== 'answered').length
  return (
    <section className={styles.block} aria-labelledby="this-week">
      <p id="this-week" className={styles.day}>This week {marker}</p>
      <p className={styles.who}>We</p>
      {openCount > 0 && (
        <p className={styles.text}>
          {openCount === 1 ? 'There’s one thing' : `There are ${words[openCount] ?? `${openCount} things`}`} we’d like to check with you.
        </p>
      )}
      <ol className={styles.questions}>
        {questions.map((q) => <Question key={q.id} q={q} onAnswer={onAnswer} onTellUsMore={onTellUsMore} onDefer={onDefer} />)}
      </ol>
    </section>
  )
}

export function Question({ q, onAnswer, onTellUsMore, onDefer, compact = false }: {
  q: IntelligenceQuestionView
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
            <button type="button" className={styles.choice} disabled={busy} onClick={() => onTellUsMore(q.id)}>{TELL_US_MORE}</button>
            {onDefer && <button type="button" className={styles.linkButton} disabled={busy} onClick={() => onDefer(q.id)}>Not now</button>}
          </div>
          {problem && <p className={styles.problem} role="alert">{problem}</p>}
        </>
      )}
    </li>
  )
}

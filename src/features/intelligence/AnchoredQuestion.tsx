'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { Icon } from '@/ui/Icon'
import { Question } from './QuestionBlock'
import { useIntelligence } from './IntelligencePanel'
import styles from './AnchoredQuestion.module.css'

const DISMISS_EVENT = 'anchored-question-dismissed'
const key = (id: string) => `question-dismissed:${id}`

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(DISMISS_EVENT, onChange)
  return () => { window.removeEventListener('storage', onChange); window.removeEventListener(DISMISS_EVENT, onChange) }
}

function readDismissed(id: string): boolean {
  try { return window.localStorage.getItem(key(id)) === '1' } catch { return false }
}

function dismiss(id: string) {
  try { window.localStorage.setItem(key(id), '1') } catch { /* storage blocked: hidden until reload */ }
  window.dispatchEvent(new Event(DISMISS_EVENT))
}

/**
 * A conversation question that could change what's on this page, kept out of
 * the way: a slim strip that stays at the bottom of the page while the
 * retailer works. "Answer" opens the quick answers in place; answering
 * resolves the same question everywhere. "Dismiss" only hides it on this page
 * (in this browser); the question itself stays open in the conversation and
 * the weekly check-in.
 */
export function AnchoredQuestion({ questionId, headline }: { questionId: string; headline: string }) {
  const api = useIntelligence()
  const stored = useSyncExternalStore(subscribe, () => readDismissed(questionId), () => false)
  const [hiddenHere, setHiddenHere] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [answeredHere, setAnsweredHere] = useState(false)
  const q = useMemo(() => api?.questions.find((x) => x.id === questionId), [api, questionId])

  const waiting = q && (q.status === 'open' || q.status === 'deferred')
  if (!api || !q || stored || hiddenHere || !(waiting || answeredHere)) return null

  async function onAnswer(id: string, choice: string) {
    const problem = await api!.answer(id, choice, null, 'order')
    if (!problem) {
      setAnsweredHere(true)
      // Leave "You answered…" in view for a moment, then step aside.
      window.setTimeout(() => setHiddenHere(true), 1800)
    }
    return problem
  }

  return (
    <aside className={styles.strip} aria-label="A question about this order">
      <span className={styles.mark} aria-hidden="true"><Icon name="question" size={18} /></span>
      <div className={styles.body}>
        <p className={styles.headline}>{headline}</p>
        {answering || answeredHere ? (
          <ol className={styles.answer}>
            <Question q={q} compact onAnswer={onAnswer} onTellUsMore={(id) => api.open({ tellUsMoreFor: id })} />
          </ol>
        ) : (
          <p className={styles.prompt}>{q.prompt}</p>
        )}
      </div>
      <div className={styles.actions}>
        {!answering && !answeredHere && (
          <button type="button" className={styles.primary} onClick={() => setAnswering(true)}>Answer</button>
        )}
        {!answeredHere && (
          <button type="button" className={styles.quiet} onClick={() => dismiss(questionId)}>Dismiss</button>
        )}
      </div>
    </aside>
  )
}

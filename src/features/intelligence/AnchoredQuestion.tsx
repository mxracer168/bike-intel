'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/ui/Icon'
import { Question } from './QuestionBlock'
import { useIntelligence } from './IntelligencePanel'
import styles from './AnchoredQuestion.module.css'

/**
 * A conversation question that could change what's on this page, kept out of
 * the way: a slim strip that stays at the bottom of the page while the
 * retailer works. "Answer" opens the quick answers in place; answering
 * resolves the same question everywhere. "Dismiss" hides it until the page is
 * loaded again (for now, while it's being reviewed; later it will stay away
 * for a while). The question itself stays open in the conversation and the
 * weekly check-in either way.
 */
export function AnchoredQuestion({ questionId, headline }: { questionId: string; headline: string }) {
  const api = useIntelligence()
  const [hiddenHere, setHiddenHere] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [answeredHere, setAnsweredHere] = useState(false)
  const q = useMemo(() => api?.questions.find((x) => x.id === questionId), [api, questionId])

  const waiting = q && (q.status === 'open' || q.status === 'deferred')
  if (!api || !q || hiddenHere || !(waiting || answeredHere)) return null

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
          <button type="button" className={styles.quiet} onClick={() => setHiddenHere(true)}>Dismiss</button>
        )}
      </div>
    </aside>
  )
}

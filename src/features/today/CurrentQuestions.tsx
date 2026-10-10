'use client'

import { useState } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { TELL_US_MORE, topQuestions } from '@/features/intelligence/types'
import { Icon } from '@/ui/Icon'
import styles from './Today.module.css'

/**
 * Current questions: what Buying Intelligence would like to know because the
 * answer can improve a coming decision. These are the same questions as the
 * conversation and the check-in, answered once wherever they're seen; not a
 * task list. Each question's own choices are offered (whatever they are),
 * plus "Tell us more", which opens the conversation ready for words.
 */
export function CurrentQuestions() {
  const api = useIntelligence()
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<Record<string, string>>({})
  if (!api) return null
  // Answered here: keep the confirmation in place, in order, for this visit.
  const asked = new Set(topQuestions(api.questions.filter((q) => !saved[q.id])).map((q) => q.id))
  const shown = api.questions.filter((q) => saved[q.id] || asked.has(q.id))

  async function answer(id: string, choice: string) {
    const failure = await api!.answer(id, choice, null, 'check_in')
    if (failure) setProblem((p) => ({ ...p, [id]: failure }))
    else setSaved((s) => ({ ...s, [id]: choice }))
  }

  return (
    <section aria-labelledby="today-questions">
      <div className={styles.zoneHead}>
        <h2 id="today-questions" className={styles.zoneTitle}>Current questions</h2>
        <p className={styles.zoneLead}>A little context now helps Buying Intelligence make better decisions later.</p>
      </div>
      {shown.length === 0 ? (
        <div className={styles.questionsEmpty}>
          <p className={styles.questionText}>Nothing waiting on you.</p>
          <button type="button" className={styles.textAction} aria-haspopup="dialog" onClick={() => api.open()}>
            Add context<Icon name="arrow-right" size={14} />
          </button>
        </div>
      ) : (
        <ol className={styles.questions}>
          {shown.map((q) => (
            <li key={q.id} className={styles.question}>
              <span className={styles.questionMark} aria-hidden="true"><Icon name="chat" size={14} /></span>
              <div className={styles.questionMain}>
                <h3 className={styles.questionText}>{q.prompt}</h3>
                {q.reason && <p className={styles.questionReason}>{q.reason}</p>}
                {saved[q.id] ? (
                  <p className={styles.questionSaved} role="status">
                    {q.example ? `You answered: ${saved[q.id]}` : `Context saved: ${saved[q.id]}`}
                  </p>
                ) : (
                  <div className={styles.answers} role="group" aria-label={`Answer: ${q.prompt}`}>
                    {q.choices.map((c) => (
                      <button key={c} type="button" className={styles.answer} onClick={() => answer(q.id, c)}>{c}</button>
                    ))}
                    <button type="button" className={styles.answer} aria-haspopup="dialog"
                      onClick={() => api.open({ tellUsMoreFor: q.id })}>{TELL_US_MORE}</button>
                  </div>
                )}
                {problem[q.id] && <p className={styles.questionProblem} role="alert">{problem[q.id]}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

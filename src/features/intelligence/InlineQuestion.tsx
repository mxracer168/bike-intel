'use client'

import { Question } from './QuestionBlock'
import { useIntelligence } from './IntelligencePanel'
import styles from './Intelligence.module.css'

/**
 * A conversation question shown where it matters (e.g. on an order).
 * Answering here resolves the same question; it won't be asked again.
 */
export function InlineQuestion({ questionId, lead }: { questionId: string; lead?: string }) {
  const api = useIntelligence()
  const q = api?.questions.find((x) => x.id === questionId)
  if (!api || !q || q.status === 'withdrawn') return null
  return (
    <aside className={styles.inline} aria-label="A question for you">
      {lead && <p className={styles.inlineLead}>{lead}</p>}
      <ol className={styles.questions}>
        <Question q={q} compact
          onAnswer={(id, choice) => api.answer(id, choice, null, 'order')}
          onTellUsMore={(id) => api.open({ tellUsMoreFor: id })} />
      </ol>
    </aside>
  )
}

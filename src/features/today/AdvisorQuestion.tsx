'use client'

import { useState } from 'react'
import { ChoiceChips } from '@/ui/ChoiceChips'
import { Icon } from '@/ui/Icon'
import styles from './Today.module.css'

/** The advisor asks one question instead of guessing. Inline, not a chat bubble. */
export function AdvisorQuestion({ prompt, detail, choices, example = false }: {
  prompt: string; detail?: string; choices: string[]; example?: boolean
}) {
  const [answer, setAnswer] = useState<string | null>(null)
  return (
    <section className={styles.panel} aria-label="A question for you">
      <p className={styles.from}>
        <span className={styles.fromMark} aria-hidden="true"><Icon name="info" size={14} /></span>
        One question
      </p>
      <p className={styles.question}>{prompt}</p>
      {detail && <p className={styles.questionDetail}>{detail}</p>}
      <ChoiceChips name="today-question" label={prompt} options={choices} onChoose={setAnswer} />
      {answer && (
        <p className={styles.thanks} role="status">
          {example ? 'Thanks. This is an example, so nothing was saved.' : 'Thanks, we’ll take that into account.'}
        </p>
      )}
    </section>
  )
}

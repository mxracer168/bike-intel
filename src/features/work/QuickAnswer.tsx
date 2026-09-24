'use client'

import { useState } from 'react'
import { ChoiceChips } from '@/ui/ChoiceChips'
import styles from './Work.module.css'

/** Answer a question in place. Example questions say plainly that nothing was saved. */
export function QuickAnswer({ name, prompt, choices, example = false }: {
  name: string; prompt: string; choices: string[]; example?: boolean
}) {
  const [answer, setAnswer] = useState<string | null>(null)
  return (
    <div className={styles.answer}>
      <ChoiceChips name={name} label={prompt} options={choices} onChoose={setAnswer} />
      {answer && (
        <p className={styles.thanks} role="status">
          {example ? 'Thanks. This is example data, so nothing was saved.' : 'Thanks, we’ll take that into account.'}
        </p>
      )}
    </div>
  )
}

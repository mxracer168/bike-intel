'use client'

import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import styles from './Today.module.css'

/**
 * Questions for you: the way back into the same ongoing conversation, in the
 * same soft Harbor blue as the panel's "Questions for you". One line, one action.
 */
export function WeeklyCheckIn() {
  const api = useIntelligence()
  if (!api) return null
  const count = api.openCount
  return (
    <aside className={styles.checkIn} aria-labelledby="today-questions">
      <div className={styles.checkInText}>
        <h2 id="today-questions" className={styles.checkInTitle}>
          {count === 0 ? 'Anything worth updating?' : count === 1 ? '1 question for you' : `${count} questions for you`}
        </h2>
        <p className={styles.checkInLead}>
          {count === 0 ? 'Tell us about anything that could change what you buy.' : 'A few answers would help sharpen upcoming recommendations.'}
        </p>
      </div>
      <button type="button" className={styles.checkInPrimary} aria-haspopup="dialog" onClick={() => api.open()}>
        {count === 0 ? 'Add context' : 'Take a look'}
      </button>
    </aside>
  )
}

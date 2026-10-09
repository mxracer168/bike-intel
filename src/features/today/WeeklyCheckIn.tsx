'use client'

import type { ReactNode } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { Icon } from '@/ui/Icon'
import styles from './Today.module.css'

/**
 * Questions for you: Today's right-hand rail and the way back into the same
 * ongoing conversation. The count is live; answering happens in the panel.
 */
export function WeeklyCheckIn({ children }: { children?: ReactNode }) {
  const api = useIntelligence()
  if (!api) return null
  const count = api.openCount
  return (
    <aside className={styles.rail} aria-labelledby="today-questions">
      <h2 id="today-questions" className={styles.railLabel}>Questions for you</h2>
      <div className={styles.railItem}>
        <p className={styles.railTitle}>
          {count === 0 ? 'Nothing waiting on you' : count === 1 ? 'One question is waiting' : `${count} questions are waiting`}
        </p>
        <p className={styles.railText}>
          {count === 0 ? 'Tell us about anything that could change what you buy.' : 'A few answers would help sharpen upcoming recommendations.'}
        </p>
        <button type="button" className={styles.railAction} aria-haspopup="dialog" onClick={() => api.open()}>
          {count === 0 ? 'Add context' : 'Answer now'}<Icon name="arrow-right" size={14} />
        </button>
      </div>
      {children}
    </aside>
  )
}

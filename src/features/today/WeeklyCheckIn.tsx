'use client'

import { useState } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import styles from './Today.module.css'

const words = ['', 'one thing', 'two things', 'three things']

/**
 * The weekly check-in: a way back into the same ongoing conversation,
 * drawing on the same open questions. One line, one action, easy to skip.
 */
export function WeeklyCheckIn() {
  const api = useIntelligence()
  const [dismissed, setDismissed] = useState(false)
  if (!api || dismissed) return null
  const count = api.openCount
  const line = count === 0
    ? 'Anything worth updating this week?'
    : `${count === 1 ? 'There’s' : 'There are'} ${words[count]} we’d like to check with you this week.`
  return (
    <aside className={styles.checkIn} aria-label="Weekly check-in">
      <p>{line}</p>
      <span className={styles.checkInActions}>
        <button type="button" className={styles.checkInPrimary} aria-haspopup="dialog" onClick={() => api.open()}>
          {count === 0 ? 'Add context' : 'Take a look'}
        </button>
        <button type="button" className={styles.checkInQuiet} onClick={() => setDismissed(true)}>Not now</button>
      </span>
    </aside>
  )
}

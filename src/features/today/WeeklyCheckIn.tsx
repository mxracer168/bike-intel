'use client'

import { useState } from 'react'
import { useOpenContext } from '@/features/context/ContextPanel'
import styles from './Today.module.css'

/** One line, one action, easy to skip. Only shown when the context panel exists. */
export function WeeklyCheckIn() {
  const open = useOpenContext()
  const [dismissed, setDismissed] = useState(false)
  if (!open || dismissed) return null
  return (
    <aside className={styles.checkIn} aria-label="Weekly check-in">
      <p>Anything worth updating this week?</p>
      <span className={styles.checkInActions}>
        <button type="button" className={styles.checkInPrimary} aria-haspopup="dialog" onClick={open}>Add context</button>
        <button type="button" className={styles.checkInQuiet} onClick={() => setDismissed(true)}>Not now</button>
      </span>
    </aside>
  )
}

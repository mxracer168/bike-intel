'use client'

import { useId, useState } from 'react'
import { Icon } from './Icon'
import styles from './InfoTip.module.css'

/**
 * A quiet (i) beside a term that needs one line of explanation. The text is
 * the button's description, so it's read aloud on focus; it shows on hover,
 * focus or tap.
 */
export function InfoTip({ term, children }: { term: string; children: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={styles.wrap} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className={styles.button} aria-label={`About ${term}`} aria-describedby={id}
        aria-expanded={open} onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        <Icon name="info" size={14} />
      </button>
      <span id={id} role="tooltip" className={styles.tip} hidden={!open}>{children}</span>
    </span>
  )
}

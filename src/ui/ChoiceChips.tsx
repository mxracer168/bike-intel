'use client'

import { useState } from 'react'
import styles from './Field.module.css'

/**
 * Standalone choice chips (radio group) for quick answers outside a form.
 * The label is for screen readers; the visible question sits beside it.
 */
export function ChoiceChips({ name, label, options, onChoose }: {
  name: string; label: string; options: string[]; onChoose?: (value: string) => void
}) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <fieldset className={styles.choices}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((o) => (
        <label key={o} className={styles.choice}>
          <input type="radio" name={name} value={o} checked={value === o}
            onChange={() => { setValue(o); onChoose?.(o) }} />
          <span>{o}</span>
        </label>
      ))}
    </fieldset>
  )
}

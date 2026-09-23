'use client'

import styles from './QuantityStepper.module.css'

/** Quantity control. Whole units, never below zero. */
export function QuantityStepper({ value, onChange, label, max = 999 }: {
  value: number; onChange: (next: number) => void; label: string; max?: number
}) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button type="button" aria-label="Decrease" disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  )
}

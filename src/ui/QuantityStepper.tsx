'use client'

import styles from './QuantityStepper.module.css'

/** Quantity control. Whole units, never below zero; by `step` at a time (a case) when the supplier sells in cases. */
export function QuantityStepper({ value, onChange, label, max = 999, compact = false, step = 1 }: {
  value: number; onChange: (next: number) => void; label: string; max?: number; compact?: boolean; step?: number
}) {
  return (
    <div className={compact ? `${styles.stepper} ${styles.compact}` : styles.stepper} role="group" aria-label={label}>
      <button type="button" aria-label={step > 1 ? `Decrease by ${step}` : 'Decrease'} disabled={value <= 0}
        onClick={() => onChange(Math.max(0, step > 1 ? Math.ceil(value / step) * step - step : value - 1))}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={step > 1 ? `Increase by ${step}` : 'Increase'} disabled={value >= max}
        onClick={() => onChange(Math.min(max, step > 1 ? Math.floor(value / step) * step + step : value + 1))}>+</button>
    </div>
  )
}

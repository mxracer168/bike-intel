import styles from './StepIndicator.module.css'

const steps = ['business', 'location', 'agreements'] as const

/** Temporary: onboarding will become conversational. */
export function StepIndicator({ current }: { current: (typeof steps)[number] }) {
  const index = steps.indexOf(current)
  return (
    <div className={styles.steps}>
      <span className={styles.bar} aria-hidden="true">
        {steps.map((s, i) => <i key={s} className={i <= index ? styles.done : undefined} />)}
      </span>
      <span>Step {index + 1} of {steps.length}</span>
    </div>
  )
}

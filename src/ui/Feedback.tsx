import type { ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './Feedback.module.css'

export type Tone = 'neutral' | 'info' | 'positive' | 'consider' | 'risk'

const toneIcon = { neutral: 'info', info: 'info', positive: 'check', consider: 'alert', risk: 'alert' } as const

/** Status in words first; color only reinforces meaning. Risk is for genuine problems. */
export function Notice({ tone = 'neutral', title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={tone === 'risk' ? 'alert' : 'status'}>
      <Icon name={toneIcon[tone]} />
      <div className={styles.noticeBody}>
        {title && <p className={styles.noticeTitle}>{title}</p>}
        {children}
      </div>
    </div>
  )
}

export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>
}

/** Lists what needs fixing before a form can be saved. */
export function FormErrorSummary({ title, errors }: { title?: string; errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <Notice tone="risk" title={title ?? 'Please check the highlighted details.'}>
      {errors.length > 1 && (
        <ul className={styles.errorList}>
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {errors.length === 1 && <p>{errors[0]}</p>}
    </Notice>
  )
}

/** Brief confirmation; offers undo instead of asking "are you sure?". */
export function Toast({ message, actionLabel, onAction }: { message: ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className={styles.toast} role="status">
      <span>{message}</span>
      {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>{title}</h2>
      {children && <p className={styles.emptyBody}>{children}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.skeletonLine} style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  )
}

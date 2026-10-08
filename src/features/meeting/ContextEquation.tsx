import { Fragment } from 'react'
import { ConceptIcon, type ConceptIconName } from './icons'
import styles from './Meeting.module.css'

type Term = { icon: ConceptIconName; label: string; role: 'input' | 'here' | 'outcome' }

const TERMS: Term[] = [
  { icon: 'history', label: 'Historical truth', role: 'input' },
  { icon: 'market', label: 'Market intelligence', role: 'input' },
  { icon: 'person', label: 'Your context', role: 'here' },
  { icon: 'target', label: 'Clear recommendations', role: 'outcome' },
]

/**
 * Why this conversation matters, in one line: what we already have, plus
 * what only the retailer knows, makes clear recommendations. "Your context"
 * is where the retailer is now.
 */
export function ContextEquation() {
  return (
    <section className={styles.equation} aria-label="How recommendations are made">
      <ol className={styles.terms}>
        {TERMS.map((t, i) => (
          <Fragment key={t.label}>
            {i > 0 && (
              <li className={styles.operator} aria-hidden="true"><span>{i === TERMS.length - 1 ? '=' : '+'}</span></li>
            )}
            <li className={[styles.term, styles[t.role]].join(' ')} aria-current={t.role === 'here' ? 'step' : undefined}>
              <span className={styles.termIcon}><ConceptIcon name={t.icon} size={30} /></span>
              <span className={styles.termLabel}>{t.label}</span>
              {t.role === 'here' && <span className={styles.hereBadge}>We’re here</span>}
            </li>
          </Fragment>
        ))}
      </ol>
      <p className="visually-hidden">Historical truth plus market intelligence plus your context make clear recommendations. This conversation is your context.</p>
    </section>
  )
}

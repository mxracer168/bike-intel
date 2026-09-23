import type { ReactNode } from 'react'
import styles from './Layout.module.css'

const gaps = { 1: 'var(--sp-1)', 2: 'var(--sp-2)', 3: 'var(--sp-3)', 4: 'var(--sp-4)', 5: 'var(--sp-5)', 6: 'var(--sp-6)', 7: 'var(--sp-7)' }

/** Page container: standard width, or narrow (reading width) for focused tasks. */
export function Page({ width = 'standard', children }: { width?: 'standard' | 'narrow'; children: ReactNode }) {
  return <div className={[styles.page, width === 'narrow' && styles.narrow].filter(Boolean).join(' ')}>{children}</div>
}

/** Screen header: the title says what matters; the lead gives one sentence of context. */
export function PageHeader({ eyebrow, title, lead }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode }) {
  return (
    <header className={styles.header}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1 className={styles.title}>{title}</h1>
      {lead && <p className={styles.lead}>{lead}</p>}
    </header>
  )
}

export function Stack({ gap = 4, children, as: Tag = 'div' }: { gap?: keyof typeof gaps; children: ReactNode; as?: 'div' | 'form' | 'section' }) {
  return <Tag className={styles.stack} style={{ gap: gaps[gap] }}>{children}</Tag>
}

/** Surface panel. Border first, no shadow, never nested. */
export function Card({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.card}>
      {title && <h2 className={styles.cardTitle}>{title}</h2>}
      {children}
    </section>
  )
}

import type { ReactNode } from 'react'
import styles from './Example.module.css'

/** Visible marker on anything built from example data. Never omit it. */
export function ExampleMarker({ children = 'Example data', quiet = false }: { children?: ReactNode; quiet?: boolean }) {
  return <span className={[styles.marker, quiet && styles.quiet].filter(Boolean).join(' ')}>{children}</span>
}

/** A block of example content, labelled as such for everyone, including screen readers. */
export function ExampleRegion({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.region} aria-label="Example data">
      <div className={styles.regionHead}>
        <ExampleMarker />
        <p className={styles.regionText}>{title}</p>
      </div>
      {children}
    </section>
  )
}

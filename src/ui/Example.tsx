import type { ReactNode } from 'react'
import styles from './Example.module.css'

/**
 * Visible "Example data" labels are switched off while the whole environment
 * is a design demo, so screens read like the finished product (decision of
 * 2026-09-24). The safeguards are unchanged: example data lives only in
 * src/demo, is gated by DEMO_PREVIEW and is never written to the database.
 * Turn this back on when real and example data can appear side by side.
 */
export const SHOW_EXAMPLE_LABELS = false

/** Marker on anything built from example data (hidden while SHOW_EXAMPLE_LABELS is off). */
export function ExampleMarker({ children = 'Example data', quiet = false }: { children?: ReactNode; quiet?: boolean }) {
  if (!SHOW_EXAMPLE_LABELS) return null
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

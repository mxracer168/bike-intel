'use client'

import { useId, useState } from 'react'
import { formatFit, type ProgramFitView } from './programFit'
import styles from './Suppliers.module.css'

/** The retailer's Program fit, compact: "4.6 / 5 · Program fit". Not a review: no stars, no color. */
export function FitScore({ fit }: { fit: ProgramFitView }) {
  return (
    <p className={styles.fit}>
      <span className={styles.fitScore}>{formatFit(fit.score)}</span>
      <span className={styles.fitScale}> / 5 · Program fit</span>
    </p>
  )
}

/**
 * "Why this fit?": the main reasons in plain words, opened in the card on a
 * pale-blue analysis area (the blue means "analysis you opened", for every
 * score). No band label: the number and the reasons are enough.
 */
export function ProgramFit({ fit, retailerName, programName }: { fit: ProgramFitView; retailerName: string; programName: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const score = formatFit(fit.score)
  return (
    <>
      <button type="button" className={styles.fitWhy} aria-expanded={open} aria-controls={id}
        aria-label={`Why this fit? ${programName}`} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide why' : 'Why this fit?'}
      </button>
      <section id={id} hidden={!open} className={styles.fitDetail} aria-label={`Why ${programName} fits`}>
        <p className={styles.fitTitle}>Why this is a {score} fit for {retailerName}</p>
        <dl className={styles.fitFactors}>
          {fit.factors.map((f) => (
            <div key={f.title}><dt>{f.title}</dt><dd>{f.detail}</dd></div>
          ))}
        </dl>
        {fit.summary && <p className={styles.fitSummary}>{fit.summary}</p>}
        <p className={styles.fitTrust}>
          Program fit is personalized to your business using your sales history, inventory, supplier terms,
          seasonality and business context. Another retailer may see a different fit for the same program.
          Supplier payments or sponsorship never affect the score.
        </p>
      </section>
    </>
  )
}

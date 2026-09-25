'use client'

import { useId, useState } from 'react'
import { fitBand, formatFit, type ProgramFitView } from './programFit'
import styles from './Suppliers.module.css'

/**
 * The retailer's Program fit for one program: a compact score beside the
 * closing date, and "Why this fit?" opening the main reasons in plain words.
 * Not a review: no stars, no ranking.
 */
export function ProgramFit({ fit, closes, retailerName, programName }: {
  fit: ProgramFitView; closes?: string; retailerName: string; programName: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const score = formatFit(fit.score)
  return (
    <>
      <div className={styles.programSide}>
        <p className={styles.fit}>
          <span className={styles.fitScore}>{score}</span>
          <span className={styles.fitScale}> / 5 · Program fit</span>
        </p>
        {closes && <p className={styles.programMeta}>Closes {closes}</p>}
        <button type="button" className={styles.fitWhy} aria-expanded={open} aria-controls={id}
          aria-label={`Why this fit? ${programName}`} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide why' : 'Why this fit?'}
        </button>
      </div>
      <section id={id} hidden={!open} className={styles.fitDetail} aria-label={`Why ${programName} fits`}>
        <p className={styles.fitTitle}>
          Why this is a {score} fit for {retailerName}
          <span className={styles.fitBand}> · {fitBand(fit.score)}</span>
        </p>
        <dl className={styles.fitFactors}>
          {fit.factors.map((f) => (
            <div key={f.title}><dt>{f.title}</dt><dd>{f.detail}</dd></div>
          ))}
        </dl>
        <p className={styles.fitTrust}>
          Program fit is personalized to your business using your sales history, inventory, supplier terms,
          seasonality and business context. Supplier payments or sponsorship never affect the score.
        </p>
      </section>
    </>
  )
}

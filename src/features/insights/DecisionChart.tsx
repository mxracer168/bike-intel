import type { DecisionOutcome } from './types'
import styles from './Insights.module.css'

const groupTitle: Record<DecisionOutcome['group'], string> = {
  judgment: 'Where your judgment mattered',
  recommendation: 'Where recommendations helped',
  improve: 'Where we can improve',
}

/**
 * How recent decisions played out: for each purchase, our recommendation
 * (gray bar), what you approved (blue bar) and actual demand (a dark mark
 * across both). The three numbers are written beside each item, so color is
 * never the only cue and the bars stay uncluttered.
 * Each item has its own scale: this compares three numbers for one purchase,
 * not purchases with each other.
 */
export function DecisionChart({ decisions }: { decisions: DecisionOutcome[] }) {
  const groups = (['judgment', 'recommendation', 'improve'] as const)
    .map((g) => ({ g, items: decisions.filter((d) => d.group === g) }))
    .filter((x) => x.items.length > 0)

  return (
    <div className={styles.decisions}>
      <p className={styles.legend} aria-hidden="true">
        <span><i className={styles.swRecommended} />Our recommendation</span>
        <span><i className={styles.swApproved} />You approved</span>
        <span><i className={styles.swDemand} />Actual demand</span>
      </p>
      {groups.map(({ g, items }) => (
        <section key={g} className={styles.decisionGroup} aria-label={groupTitle[g]}>
          <h4 className={styles.groupTitle}>{groupTitle[g]}</h4>
          <ul className={styles.decisionList}>
            {items.map((d) => {
              const max = Math.max(d.recommended, d.approved, d.demand) * 1.08
              const w = (n: number) => `${(n / max) * 100}%`
              return (
                <li key={d.id} className={styles.decision}>
                  <div>
                    <p className={styles.decisionItem}>{d.item}</p>
                    <p className={styles.decisionNumbers}>
                      <span>{d.recommended} recommended</span> · <span>{d.approved} approved</span> · <b>{d.demand} demand</b>
                    </p>
                  </div>
                  <div className={styles.decisionPlot} aria-hidden="true">
                    <div className={styles.track}>
                      <div className={styles.barLine}>
                        <span className={styles.recommended} style={{ width: w(d.recommended) }} />
                      </div>
                      <div className={styles.barLine}>
                        <span className={styles.approved} style={{ width: w(d.approved) }} />
                      </div>
                      <span className={styles.demand} style={{ left: w(d.demand) }} />
                    </div>
                  </div>
                  <p className={styles.decisionNote}>{d.note}</p>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

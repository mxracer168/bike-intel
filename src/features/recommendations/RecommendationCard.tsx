'use client'

import { useId, useState } from 'react'
import { average, describeCover, describeWeeklyRate, formatMoney } from '@/domain/language/plain'
import { Button } from '@/ui/Button'
import { ConfidenceMark } from '@/ui/Confidence'
import { ChoiceChips } from '@/ui/ChoiceChips'
import { ExampleMarker } from '@/ui/Example'
import { Icon } from '@/ui/Icon'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { EvidenceChart } from './EvidenceChart'
import type { RecommendationView } from './types'
import styles from './RecommendationCard.module.css'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Answer → reason → evidence. The answer is the largest text; the reason is
 * always visible; the evidence appears only when asked for ("Why?").
 */
export function RecommendationCard({ rec, example = false }: { rec: RecommendationView; example?: boolean }) {
  const [quantity, setQuantity] = useState(rec.quantity)
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const evidenceId = useId()

  const perWeek = average(rec.weeklySales)
  const ordering = rec.decision === 'order'
  const answer = ordering ? `Order ${rec.quantity}` : 'Skip this reorder'
  const whyLabel = ordering ? `Why ${rec.quantity}?` : 'Why skip it?'

  const facts: [string, string][] = [
    ['You sell', capitalize(describeWeeklyRate(perWeek))],
    ['On hand', String(rec.onHand)],
    ['On order', String(rec.onOrder)],
    ['Current stock lasts', capitalize(describeCover(rec.onHand + rec.onOrder, perWeek))],
  ]
  if (ordering && rec.leadTimeDays) facts.push(['Arrives', `About ${rec.leadTimeDays} days after you order`])
  if (ordering && rec.coverWeeks) facts.push(['This order covers', `About ${rec.coverWeeks} weeks after it arrives`])
  if (ordering && rec.unitCost !== undefined) {
    facts.push(['Cost', `${formatMoney(rec.unitCost, rec.currency)} each · ${formatMoney(rec.unitCost * quantity, rec.currency)}`])
  }

  return (
    <article className={styles.card} aria-labelledby={`${evidenceId}-answer`}>
      <div className={styles.meta}>
        <span className={styles.product}>
          <b>{rec.product}</b>{rec.variant ? ` · ${rec.variant}` : ''} · {rec.supplier}
        </span>
        <span className={styles.metaRight}>
          {example && <ExampleMarker quiet />}
          <ConfidenceMark level={rec.confidence} />
        </span>
      </div>

      <h3 id={`${evidenceId}-answer`} className={styles.answer}>{answer}</h3>
      <p className={styles.reason}>{rec.reason}</p>
      {ordering && quantity !== rec.quantity && (
        <p className={styles.changed}>You changed this from {rec.quantity} to {quantity}.</p>
      )}

      {ordering && (
        <div className={styles.actions}>
          <QuantityStepper value={quantity} onChange={setQuantity} label={`Quantity of ${rec.product}`} />
          <Button variant="secondary" onClick={() => setAdded(true)}>Add to order</Button>
        </div>
      )}

      {rec.question && (
        <div className={styles.ask}>
          <p className={styles.askTitle}>We’re less confident about this one.</p>
          <p className={styles.askText}>{rec.question}</p>
          <ChoiceChips name={`${evidenceId}-ask`} label={rec.question} options={['Keep them on the shelf', 'Order as needed']} />
        </div>
      )}

      <div className={styles.foot}>
        <button type="button" className={styles.why} aria-expanded={open} aria-controls={evidenceId} onClick={() => setOpen((o) => !o)}>
          {whyLabel} <Icon name="chevron-down" size={12} />
        </button>
        {added && (
          <p className={styles.note} role="status">
            {example ? 'This is an example, so nothing was added. Ordering comes later.' : 'Added to your order.'}
          </p>
        )}
      </div>

      <div id={evidenceId} className={styles.evidence} hidden={!open}>
        <EvidenceChart weeklySales={rec.weeklySales} />
        <dl className={styles.facts}>
          {facts.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {(rec.context || (ordering && rec.coverWeeks)) && (
          <div className={styles.context}>
            {rec.context && <p>{rec.context}</p>}
            {ordering && rec.coverWeeks && <p>We aimed for about {rec.coverWeeks} weeks of stock after delivery.</p>}
          </div>
        )}
      </div>
    </article>
  )
}

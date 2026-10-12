'use client'

import { useId, useState, type ReactNode } from 'react'
import { oneDecimal } from '@/features/orders/why'
import type { OrderRule } from '@/features/orders/types'
import { WeeklySalesChart } from './WeeklySalesChart'
import styles from './Formula.module.css'

/**
 * Why this quantity, as one model everywhere (Figma reference: the
 * recommendation formula): Target − Current = Need → Order. Each step opens
 * its evidence. Need and current are derived here, in one place, so the
 * arithmetic can't drift; the order is shown separately from the need
 * because the supplier's case pack or minimum can change it.
 */
export type FormulaData = {
  /** What we expect them to need before the next chance to restock. */
  target: number
  onHand: number
  onOrder: number
  /** The recommended order quantity (the need after the ordering rule). */
  recommendation: number
  /** How the target was set: "~2 per week for the next 3 weeks". */
  targetNote: string
  rule?: OrderRule
  supplierName?: string
  perWeek?: number
  coverageWeeks?: number
  leadTimeDays?: number
  trend?: string
  weeklySales?: number[]
  weekStarts?: string[]
  /** The supplier's stock for this item and when it arrives. */
  supply?: { value: string; note: string; attention?: boolean }
}

type Step = 'target' | 'current' | 'need' | 'order'

export function adjustment(data: Pick<FormulaData, 'target' | 'onHand' | 'onOrder' | 'recommendation' | 'rule'>) {
  const current = data.onHand + data.onOrder
  const need = Math.max(0, data.target - current)
  return { current, need, adjusted: data.recommendation !== need }
}

const ruleShort = (rule?: OrderRule) =>
  !rule ? 'Adjusted' : rule.kind === 'case' ? `Case of ${rule.size}` : `Minimum ${rule.quantity}`

export function Formula({ data, compact = false, tone = 'light' }: { data: FormulaData; compact?: boolean; tone?: 'light' | 'dark' }) {
  const { current, need, adjusted } = adjustment(data)
  // When the supplier's rule changed the quantity, open on that: it's the part people ask about.
  const [step, setStep] = useState<Step>(adjusted ? 'order' : 'target')
  const panel = useId()
  const steps: { key: Step; label: string; detail: string; value: number }[] = [
    { key: 'target', label: 'Target', detail: 'Expected need', value: data.target },
    { key: 'current', label: 'Current', detail: 'On hand + on order', value: current },
    { key: 'need', label: 'Need', detail: 'Inventory gap', value: need },
    { key: 'order', label: 'Order', detail: adjusted ? ruleShort(data.rule) : 'Recommended quantity', value: data.recommendation },
  ]
  const ops = ['−', '=', '→']
  return (
    <div className={[styles.formula, compact && styles.compact].filter(Boolean).join(' ')} data-tone={tone}>
      <div className={styles.steps} role="group"
        aria-label={`Target ${data.target} minus current ${current} equals need ${need}${adjusted ? `, adjusted to ${data.recommendation} (${ruleShort(data.rule).toLowerCase()})` : ''}: order ${data.recommendation}`}>
        {steps.map((s, i) => (
          <span key={s.key} className={styles.stepWrap}>
            {i > 0 && <span className={styles.op} aria-hidden="true">{ops[i - 1]}</span>}
            <button type="button" className={styles.step} aria-pressed={step === s.key} aria-controls={panel}
              data-order={s.key === 'order' || undefined} data-adjusted={(s.key === 'order' && adjusted) || undefined}
              onClick={() => setStep(s.key)}>
              <span className={styles.stepLabel}>{s.label}</span>
              <span className={styles.stepValue}>{s.value}</span>
              {!compact && <span className={styles.stepDetail}>{s.detail}</span>}
            </button>
          </span>
        ))}
      </div>
      <div id={panel} className={styles.panel} aria-live="polite">
        {step === 'target' && <TargetEvidence data={data} compact={compact} />}
        {step === 'current' && <CurrentEvidence data={data} current={current} />}
        {step === 'need' && <NeedEvidence data={data} need={need} />}
        {step === 'order' && <OrderEvidence data={data} need={need} adjusted={adjusted} compact={compact} />}
      </div>
    </div>
  )
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.metric}><dt>{label}</dt><dd>{children}</dd></div>
}

function TargetEvidence({ data, compact }: { data: FormulaData; compact: boolean }) {
  const chartId = useId()
  const metrics = (
    <dl className={styles.metrics}>
      {data.perWeek !== undefined && <Metric label="Demand rate">{oneDecimal(data.perWeek)} / week</Metric>}
      {data.coverageWeeks !== undefined && data.coverageWeeks > 0 && <Metric label="Coverage">{data.coverageWeeks} {data.coverageWeeks === 1 ? 'week' : 'weeks'}</Metric>}
      {data.leadTimeDays !== undefined && <Metric label="Supplier lead time">About {data.leadTimeDays} days</Metric>}
      {data.trend && <Metric label="Demand trend">{data.trend}</Metric>}
    </dl>
  )
  if (compact) {
    return <div className={styles.evidence}><p className={styles.sentence}>Expected need before the next restock: <b>{data.target}</b> · {data.targetNote}</p>{metrics}</div>
  }
  return (
    <div className={styles.targetGrid}>
      <div className={styles.evidence}>
        <p className={styles.sentence}>
          <b>{data.target}</b> is what we expect you to need before your next chance to restock: {data.targetNote.charAt(0).toLowerCase() + data.targetNote.slice(1)}.
        </p>
        {metrics}
      </div>
      {data.weeklySales && data.weeklySales.length > 0 && (
        <section className={styles.chart} aria-labelledby={chartId}>
          <h4 id={chartId} className={styles.chartTitle}>Recent weekly sales</h4>
          <WeeklySalesChart weeklySales={data.weeklySales} weekStarts={data.weekStarts} titleId={chartId} />
        </section>
      )}
    </div>
  )
}

function CurrentEvidence({ data, current }: { data: FormulaData; current: number }) {
  return (
    <div className={styles.evidence}>
      <p className={styles.sum}>
        <span><b>{data.onHand}</b> on hand</span><span aria-hidden="true">+</span>
        <span><b>{data.onOrder}</b> incoming</span><span aria-hidden="true">=</span>
        <span><b className={styles.blue}>{current}</b> current</span>
      </p>
      <p className={styles.sentence}>
        {data.onOrder > 0 ? `${data.onOrder} already on order count toward the target.` : 'Nothing is on order for this item, so only what you have on hand counts.'}
      </p>
    </div>
  )
}

function NeedEvidence({ data, need }: { data: FormulaData; need: number }) {
  const total = Math.max(1, data.target)
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`
  const weeks = (n: number) => (data.perWeek && data.perWeek > 0 ? ` · ${oneDecimal(n / data.perWeek)} wks` : '')
  return (
    <div className={styles.evidence}>
      {data.perWeek !== undefined && data.perWeek > 0 && (
        <p className={styles.sentence}>What you have on hand lasts about <b>{oneDecimal(data.onHand / data.perWeek)} weeks</b> at the current pace.</p>
      )}
      <span className={styles.bar} role="img" aria-label={`${data.onHand} on hand, ${data.onOrder} incoming, ${need} uncovered of a target of ${data.target}`}>
        {data.onHand > 0 && <i className={styles.barHand} style={{ width: pct(data.onHand) }} />}
        {data.onOrder > 0 && <i className={styles.barIncoming} style={{ width: pct(data.onOrder) }} />}
        {need > 0 && <i className={styles.barGap} style={{ width: pct(need) }} />}
      </span>
      <dl className={styles.legend}>
        <Metric label="On hand">{data.onHand}{weeks(data.onHand)}</Metric>
        <Metric label="Incoming">{data.onOrder}{weeks(data.onOrder)}</Metric>
        <Metric label="Uncovered">{need}{weeks(need)}</Metric>
      </dl>
    </div>
  )
}

function OrderEvidence({ data, need, adjusted, compact }: { data: FormulaData; need: number; adjusted: boolean; compact: boolean }) {
  const who = data.supplierName ?? 'The supplier'
  return (
    <div className={styles.evidence}>
      <div className={styles.flow}>
        <span className={styles.flowStep}><span className={styles.flowLabel}>Need</span><b>{need}</b></span>
        <span className={styles.flowArrow} aria-hidden="true">→</span>
        {adjusted && (
          <>
            <span className={styles.rule}>
              <span className={styles.flowLabel}>{data.rule?.kind === 'minimum' ? (compact ? 'Minimum' : 'Minimum order') : data.rule?.kind === 'case' ? 'Case pack' : 'Adjustment'}</span>
              <b>{data.rule?.kind === 'minimum' ? (compact ? data.rule.quantity : `${data.rule.quantity} units`) : data.rule?.kind === 'case' ? (compact ? data.rule.size : `${data.rule.size} per case`) : `${data.recommendation - need > 0 ? '+' : ''}${data.recommendation - need}`}</b>
            </span>
            <span className={styles.flowArrow} aria-hidden="true">→</span>
          </>
        )}
        <span className={styles.flowStep}><span className={styles.flowLabel}>{compact ? 'Order' : 'Recommended order'}</span><b className={styles.blue}>{data.recommendation}</b></span>
      </div>
      <p className={styles.sentence}>
        {adjusted
          ? data.rule?.kind === 'case'
            ? `${who} sells these in cases of ${data.rule.size}, so ${need} rounds up to ${data.recommendation} (${Math.round(data.recommendation / data.rule.size)} ${data.recommendation / data.rule.size === 1 ? 'case' : 'cases'}).`
            : data.rule?.kind === 'minimum'
              ? `${who}’s minimum order is ${data.rule.quantity}, so ${need} becomes ${data.recommendation}.`
              : `Adjusted from ${need} to ${data.recommendation}.`
          : 'The recommended order is the need: nothing about how the supplier sells it changes the quantity.'}
      </p>
      {data.supply && !compact && (
        <p className={styles.supply}>
          <span>{who}</span> <b className={data.supply.attention ? styles.attention : undefined}>{data.supply.value}</b>
          {data.leadTimeDays !== undefined && <> · arrives in about {data.leadTimeDays} days</>}
          <span className={styles.supplyNote}>{data.supply.note}</span>
        </p>
      )}
    </div>
  )
}

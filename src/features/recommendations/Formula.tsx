'use client'

import { useId, useState } from 'react'
import { oneDecimal } from '@/features/orders/why'
import type { IncomingPo, OrderRule } from '@/features/orders/types'
import styles from './Formula.module.css'

/**
 * Why this quantity, shown rather than told (Figma reference: the
 * recommendation formula): Target − Current = Need → Order, each step
 * opening its evidence as figures, tables and bars. Current and need are
 * derived here, in one place, so the arithmetic can't drift; the order is
 * shown apart from the need because a case pack or minimum can change it.
 * The same component, with the same figures (orders/formula.ts), explains a
 * recommendation in an order line and in the Catalog's buying card; its
 * layout follows the width it's given, not the page.
 */
export type FormulaData = {
  /** What we expect them to need before the next chance to restock: expected sales + safety stock. */
  target: number
  safetyStock: number
  onHand: number
  onOrder: number
  /** The recommended order quantity (the need after the ordering rule). */
  recommendation: number
  rule?: OrderRule
  perWeek?: number
  leadTimeDays?: number
  trend?: string
  weeklySales?: number[]
  /** Monday of each week in weeklySales, oldest first. */
  weekStarts?: string[]
  /** The supplier's stock for this item, in a few words ("Out of stock"), flagged when it can't fill the order. */
  supply?: { supplier: string; value: string; attention?: boolean; arrivesInDays?: number }
  /** The open purchase orders behind onOrder, when known. */
  incoming?: IncomingPo[]
  /** Where the stock on hand is ("All locations" when not broken down). */
  locations?: { name: string; quantity: number }[]
}

type Step = 'target' | 'current' | 'need' | 'order'

export function adjustment(data: Pick<FormulaData, 'target' | 'onHand' | 'onOrder' | 'recommendation'>) {
  const current = data.onHand + data.onOrder
  const need = Math.max(0, data.target - current)
  return { current, need, adjusted: data.recommendation !== need }
}

const ruleShort = (rule?: OrderRule) =>
  !rule ? 'Adjusted' : rule.kind === 'case' ? `Case of ${rule.size}` : `Minimum ${rule.quantity}`

export function Formula({ data, tone = 'light' }: { data: FormulaData; tone?: 'light' | 'dark' }) {
  const { current, need, adjusted } = adjustment(data)
  // Closed until a step is chosen; choosing the open step again closes it.
  const [step, setStep] = useState<Step | null>(null)
  const panel = useId()
  const steps: { key: Step; label: string; detail: string; value: number }[] = [
    { key: 'target', label: 'Target', detail: 'Expected sales + Safety stock', value: data.target },
    { key: 'current', label: 'Current', detail: 'On hand + On order', value: current },
    { key: 'need', label: 'Need', detail: 'Inventory gap', value: need },
    { key: 'order', label: 'Order', detail: adjusted ? ruleShort(data.rule) : 'Recommended quantity', value: data.recommendation },
  ]
  const ops = ['−', '=', '→']
  return (
    <div className={styles.formula} data-tone={tone}>
      <div className={styles.steps} role="group"
        aria-label={`Target ${data.target} minus current ${current} equals need ${need}${adjusted ? `, adjusted to ${data.recommendation} (${ruleShort(data.rule).toLowerCase()})` : ''}: order ${data.recommendation}`}>
        {steps.map((s, i) => (
          <span key={s.key} className={styles.stepWrap}>
            {i > 0 && <span className={styles.op} aria-hidden="true">{ops[i - 1]}</span>}
            <button type="button" className={styles.step} aria-expanded={step === s.key} aria-controls={panel}
              data-order={s.key === 'order' || undefined} data-adjusted={(s.key === 'order' && adjusted) || undefined}
              onClick={() => setStep((open) => (open === s.key ? null : s.key))}>
              <span className={styles.stepLabel}>{s.label}</span>
              <span className={styles.stepValue}>{s.value}</span>
              <span className={styles.stepDetail}>{s.detail}</span>
            </button>
          </span>
        ))}
      </div>
      <div id={panel} className={styles.panel} aria-live="polite" hidden={step === null}>
        {step === 'target' && <TargetEvidence data={data} />}
        {step === 'current' && <CurrentEvidence data={data} />}
        {step === 'need' && <NeedEvidence data={data} need={need} />}
        {step === 'order' && <OrderFlow data={data} need={need} adjusted={adjusted} />}
      </div>
    </div>
  )
}

/** a + b = c, the total in blue; each part may carry a short note ("4 weeks"). */
function Sum({ parts }: { parts: [number, string, string?][] }) {
  return (
    <div className={styles.sum}>
      {parts.map(([value, label, note], i) => (
        <span key={label} className={styles.sumPart}>
          {i > 0 && <span className={styles.sumOp} aria-hidden="true">{i === 1 ? '+' : '='}</span>}
          <span className={styles.sumItem}>
            <b data-total={i === parts.length - 1 || undefined}>{value}</b>
            <span>{label}</span>
            {note && <span className={styles.sumNote}>{note}</span>}
          </span>
        </span>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><dt>{label}</dt><dd>{value}</dd></div>
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function TargetEvidence({ data }: { data: FormulaData }) {
  const expected = data.target - data.safetyStock
  const rate = data.perWeek && data.perWeek > 0 ? data.perWeek : undefined
  const weeks = rate ? Math.max(1, Math.round(expected / rate)) : undefined
  const cushion = rate && data.safetyStock > 0 ? Math.max(1, Math.round(data.safetyStock / rate)) : undefined
  const sales = data.weeklySales ?? []
  const max = Math.max(1, ...sales)
  const sold = sales.reduce((a, b) => a + b, 0)
  const starts = data.weekStarts ?? []
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className={styles.targetGrid}>
      <div className={styles.targetLeft}>
        <div className={styles.sumBox}><Sum parts={[
          [expected, 'Expected sales', weeks !== undefined ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : undefined],
          [data.safetyStock, 'Safety stock', cushion !== undefined ? `≈ ${cushion} ${cushion === 1 ? 'week' : 'weeks'}` : undefined],
          [data.target, 'Target'],
        ]} /></div>
        <dl className={styles.metrics}>
          {data.perWeek !== undefined && <Metric label="Demand rate" value={`${oneDecimal(data.perWeek)} / week`} />}
          {weeks !== undefined && <Metric label="Coverage" value={`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`} />}
          {data.leadTimeDays !== undefined && <Metric label="Supplier lead time" value={`${data.leadTimeDays} days`} />}
          {data.trend && <Metric label="Demand trend" value={data.trend} />}
        </dl>
      </div>
      {sales.length > 0 && (
        <div className={styles.demand}>
          <div className={styles.demandHead}>
            <span><b>Recent demand</b><span>Weekly sales · last {sales.length} weeks</span></span>
            <span className={styles.demandTotal}><b>{sold} sold</b><span>{oneDecimal(sold / sales.length)} / week</span></span>
          </div>
          <div className={styles.bars} role="img" data-hovering={hover !== null || undefined} onPointerLeave={() => setHover(null)}
            aria-label={`Weekly sales, last ${sales.length} weeks: ${sales.join(', ')}`}>
            {sales.map((n, i) => (
              <span key={i} className={styles.barCol} data-hover={hover === i || undefined} onPointerEnter={() => setHover(i)}>
                <i data-recent={i >= sales.length - 4 || undefined} style={{ height: `${Math.max(5, (n / max) * 100)}%` }} />
              </span>
            ))}
            {hover !== null && (
              // The hovered week, above its bar; kept inside the chart at the ends.
              <span className={styles.barTip} aria-hidden="true"
                data-edge={hover < 2 ? 'start' : hover > sales.length - 3 ? 'end' : undefined}
                style={{ left: `${((hover + 0.5) / sales.length) * 100}%`, bottom: `${Math.max(5, (sales[hover]! / max) * 100)}%` }}>
                <b>{sales[hover]} sold</b>
                <span>{starts[hover] ? `Week of ${shortDate(starts[hover]!)}` : `${sales.length - hover} ${sales.length - hover === 1 ? 'week' : 'weeks'} ago`}</span>
              </span>
            )}
          </div>
          {starts.length === sales.length && (
            <div className={styles.barDates} aria-hidden="true">
              <span>{shortDate(starts[0]!)}</span><span>{shortDate(starts[Math.floor(starts.length / 2)]!)}</span><span>{shortDate(starts[starts.length - 1]!)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CurrentEvidence({ data }: { data: FormulaData }) {
  const locations = data.locations?.length ? data.locations : [{ name: 'All locations', quantity: data.onHand }]
  return (
    <div className={styles.currentGrid}>
      <div>
        <p className={styles.tableHead}><span>On hand</span><b>{data.onHand}</b></p>
        <table className={styles.table}>
          <thead><tr><th scope="col">Location</th><th scope="col">Available</th></tr></thead>
          <tbody>{locations.map((l) => <tr key={l.name}><td>{l.name}</td><td>{l.quantity}</td></tr>)}</tbody>
        </table>
      </div>
      <div>
        <p className={styles.tableHead}><span>On order</span><b>{data.onOrder}</b></p>
        {data.onOrder > 0 && data.incoming?.length ? (
          <table className={styles.table}>
            <thead><tr><th scope="col">PO</th><th scope="col">Arrives</th><th scope="col">Qty</th></tr></thead>
            <tbody>{data.incoming.map((po) => (
              <tr key={po.po}><td>{po.po}</td><td>{po.arrivesInDays !== undefined ? `~${po.arrivesInDays} days` : '—'}</td><td>{po.quantity}</td></tr>
            ))}</tbody>
          </table>
        ) : data.onOrder > 0 ? (
          <table className={styles.table}>
            <thead><tr><th scope="col">Open purchase orders</th><th scope="col">Qty</th></tr></thead>
            <tbody><tr><td>Already ordered</td><td>{data.onOrder}</td></tr></tbody>
          </table>
        ) : <p className={styles.empty}>No open purchase orders</p>}
      </div>
    </div>
  )
}

function NeedEvidence({ data, need }: { data: FormulaData; need: number }) {
  const total = Math.max(1, data.target)
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`
  const rate = data.perWeek && data.perWeek > 0 ? data.perWeek : undefined
  const wks = (n: number) => (rate ? ` · ${oneDecimal(n / rate)} wks` : '')
  const coverage = rate ? Math.max(1, Math.round((data.target - data.safetyStock) / rate)) : undefined
  return (
    <div className={styles.need}>
      {rate && (
        <div className={styles.needHead}>
          <span><b>{oneDecimal(data.onHand / rate)} weeks</b><span>on hand lasts</span></span>
          {coverage !== undefined && <span className={styles.needRight}><b>{coverage} {coverage === 1 ? 'week' : 'weeks'} + safety</b><span>target coverage</span></span>}
        </div>
      )}
      <span className={styles.bar} role="img" aria-label={`${data.onHand} on hand, ${data.onOrder} on order and ${need} uncovered of a target of ${data.target}`}>
        {data.onHand > 0 && <i className={styles.barHand} style={{ width: pct(data.onHand) }} />}
        {data.onOrder > 0 && <i className={styles.barIncoming} style={{ width: pct(data.onOrder) }} />}
        {need > 0 && <i className={styles.barGap} style={{ width: pct(need) }} />}
      </span>
      <dl className={styles.legend}>
        <Metric label="On hand" value={`${data.onHand}${wks(data.onHand)}`} />
        <Metric label="On order" value={`${data.onOrder}${wks(data.onOrder)}`} />
        <Metric label="Uncovered" value={`${need}${wks(need)}`} />
      </dl>
    </div>
  )
}

function OrderFlow({ data, need, adjusted }: { data: FormulaData; need: number; adjusted: boolean }) {
  const rule = data.rule
  return (
    <div className={styles.orderEvidence}>
    <div className={styles.flow}>
      <span className={styles.flowStep}><span className={styles.flowLabel}>Need</span><b>{need}</b></span>
      <span className={styles.flowArrow} aria-hidden="true">→</span>
      {adjusted && (
        <>
          <span className={styles.rule}>
            <span className={styles.flowLabel}>{rule?.kind === 'minimum' ? 'Minimum order' : rule?.kind === 'case' ? 'Case pack' : 'Adjustment'}</span>
            <b>{rule?.kind === 'minimum' ? `${rule.quantity} units` : rule?.kind === 'case' ? `${rule.size} per case` : `${data.recommendation - need > 0 ? '+' : ''}${data.recommendation - need} units`}</b>
          </span>
          <span className={styles.flowArrow} aria-hidden="true">→</span>
        </>
      )}
      <span className={styles.flowStep}><span className={styles.flowLabel}>Recommended order</span><b className={styles.blue}>{data.recommendation}</b></span>
    </div>
    {data.supply && (
      <p className={styles.supply} data-attention={data.supply.attention || undefined}>
        <span className={styles.supplyDot} aria-hidden="true" />
        <span>{data.supply.supplier} · <b>{data.supply.value}</b>{data.supply.arrivesInDays !== undefined && <> · arrives in about {data.supply.arrivesInDays} days</>}</span>
      </p>
    )}
    </div>
  )
}

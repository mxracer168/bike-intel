'use client'

import { Fragment, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { average } from '@/domain/language/plain'
import { WeeklySalesChart } from '@/features/recommendations/WeeklySalesChart'
import { AnchoredQuestion } from '@/features/intelligence/AnchoredQuestion'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { PriceVsMarket, ReputationLine } from '@/features/network/NetworkBits'
import { compareToMarket, unitPrice, WMV_HELP, WMV_TERM } from '@/features/network/pricing'
import { ConfidenceMark } from '@/ui/Confidence'
import { Icon } from '@/ui/Icon'
import { InfoTip } from '@/ui/InfoTip'
import { QuantityStepper } from '@/ui/QuantityStepper'
import { networkMatch, networkSignal, retailerLabel, supplierShort, type NetworkMatch } from './network'
import { ActionBar, HandoffStatus, OrderHeader, SubmitDialog, type OrderProgress } from './OrderHeader'
import { lineTotal, orderTotal, sortForReview } from './summarize'
import type { NetworkListing, OrderLineView, ProposedOrderView } from './types'
import { calculation, explanation, nextStep, oneDecimal, seasonView, supplierView, type SupplierView } from './why'
import styles from './OrderReview.module.css'

const NARROW = '(max-width: 760px)'

/** On narrow screens the chevron and On order columns are hidden; a detail row must span only the visible ones. */
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  )
}

/** Line costs always show cents so the column lines up. */
function cost(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

/**
 * Supplier availability in "What we considered": one value, and on request
 * the supplier's own detail (warehouses only when the supplier reports them).
 */
function SupplierRow({ supplier, view }: { supplier: string; view: SupplierView }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div>
      <dt>Supplier availability</dt>
      <dd>
        <button type="button" className={styles.expand} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          <b className={view.attention ? styles.attention : undefined}>{view.value}</b>
          <Icon name="chevron-down" size={14} />
        </button>
        {open && (
          <div id={id} className={styles.supplierDetail}>
            <p className={styles.supplierName}>{supplier}</p>
            {view.warehouses.length > 0 ? (
              <ul>
                {view.warehouses.map((w) => <li key={w.name}><span>{w.name}</span><span>{w.available}</span></li>)}
              </ul>
            ) : <p>{view.note}</p>}
          </div>
        )}
      </dd>
    </div>
  )
}

/**
 * "Why N?": one paragraph that answers, the calculation, and the weekly
 * sales that confirm it. Beside it, what we considered (supplier detail on
 * request), the recommended next step, and a way to add context about this
 * item (docs/recommendations.md).
 */
function WhyPanel({ line, supplier, leadTimeDays, orderBy, weekStarts }: {
  line: OrderLineView; supplier: string; leadTimeDays: number; orderBy?: string; weekStarts?: string[]
}) {
  const intelligence = useIntelligence()
  const calc = calculation(line)
  const avg = average(line.weeklySales)
  const sup = supplierView(line, leadTimeDays)
  const season = seasonView(line)
  const salesId = `${line.id}-sales`
  const label = [line.product, line.variant].filter(Boolean).join(' ')
  return (
    <section className={[styles.panel, styles.whyPanel].join(' ')} aria-labelledby={`${line.id}-why`}>
      <div className={styles.whyLayout}>
        <div className={styles.whyMain}>
          <div>
            <h2 id={`${line.id}-why`} className={styles.whyTitle}>Why {line.quantity}?</h2>
            <p className={styles.explanation}>{explanation(line)}</p>
          </div>

          <dl className={styles.calc} aria-label="How we got there">
            <div>
              <dt>Expected demand</dt>
              <dd><b>{calc.expectedDemand}</b><span>{calc.demandNote}</span></dd>
            </div>
            <div>
              <dt><span className={styles.op} aria-hidden="true">−</span>On hand</dt>
              <dd><b>{calc.onHand}</b><span>Available to sell</span></dd>
            </div>
            <div>
              <dt><span className={styles.op} aria-hidden="true">−</span>Already ordered</dt>
              <dd><b>{calc.onOrder}</b><span>On purchase orders</span></dd>
            </div>
            <div className={styles.calcResult}>
              <dt><span className={styles.op} aria-hidden="true">=</span>Recommended</dt>
              <dd><b>{calc.recommended}</b><span>{calc.recommended === 1 ? 'Unit' : 'Units'} to order</span></dd>
            </div>
          </dl>

          <section className={styles.sales} aria-labelledby={salesId}>
            <div className={styles.salesHead}>
              <h3 id={salesId}>Recent weekly sales</h3>
              <span className={styles.salesNote}>Last {line.weeklySales.length} weeks (excluding current week)</span>
              <span className={styles.salesAvg}>{line.weeklySales.length}-week average: <b>{oneDecimal(avg)}</b> per week</span>
            </div>
            <WeeklySalesChart weeklySales={line.weeklySales} weekStarts={weekStarts} titleId={salesId} />
          </section>
        </div>

        <aside className={styles.whyAside} aria-label="What we considered">
          {intelligence && (
            <button type="button" className={styles.addContext} aria-haspopup="dialog"
              onClick={() => intelligence.open({ about: { label, productId: line.productId } })}>
              <Icon name="plus" size={14} />Add context for this item
            </button>
          )}
          <section className={styles.considered} aria-labelledby={`${line.id}-considered`}>
            <h3 id={`${line.id}-considered`}>What we considered</h3>
            <dl>
              <div><dt>Recent sales</dt><dd><b>{oneDecimal(avg)} / week</b></dd></div>
              <SupplierRow supplier={supplier} view={sup} />
              <div><dt>Delivery time</dt><dd><b>~{leadTimeDays} days</b></dd></div>
              {season && <div><dt>Seasonal trend</dt><dd><b>{season.value}</b></dd></div>}
              <div><dt>Confidence</dt><dd><ConfidenceMark level={line.confidence} /></dd></div>
            </dl>
          </section>
          <section className={styles.nextStep} aria-labelledby={`${line.id}-next`}>
            <h3 id={`${line.id}-next`}>Recommended next step</h3>
            <p>{nextStep(line, supplierShortName(supplier), orderBy)}</p>
          </section>
        </aside>
      </div>
    </section>
  )
}

/** "Northline Distribution" → "Northline" in running text. */
const supplierShortName = (name: string) => name.split(' ')[0] ?? name

/** Under the Why panel: other options, if any. What we assumed is now said in the explanation. */
function Notes({ line }: { line: OrderLineView }) {
  if (line.alternatives.length === 0) return null
  return (
    <div className={styles.notes}>
      <section className={styles.panel}>
        <h2 className={styles.notesTitle}>Other options</h2>
        <ul>{line.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>
      </section>
    </div>
  )
}

/**
 * One other retailer's offer: who they are and their reputation, how many,
 * and their network price against Wholesale Market Value, so the trade is
 * understandable before anyone is contacted. The introduction is mocked.
 */
function NetworkRow({ listing, wholesaleMarketValue }: { listing: NetworkListing; wholesaleMarketValue?: number }) {
  const [requested, setRequested] = useState(false)
  const who = retailerLabel(listing)
  return (
    <li className={styles.networkRow}>
      <span className={styles.networkWho}>
        <span className={styles.networkName}>{who.name}</span>
        <span className={styles.networkPlace}>{who.place}</span>
        <ReputationLine reputation={who.reputation} />
      </span>
      <span className={styles.networkQty}>{listing.available} available</span>
      <span className={styles.networkPrice}>
        <span><b>{unitPrice(listing.price)}</b> each</span>
        {wholesaleMarketValue !== undefined && <PriceVsMarket comparison={compareToMarket(listing.price, wholesaleMarketValue)} short />}
      </span>
      <span className={styles.networkAct}>
        {requested
          ? <span className={styles.networkDone} role="status">Requested · you’ll arrange payment and shipping directly</span>
          : <button type="button" className={styles.textButton} onClick={() => setRequested(true)}
              aria-label={`Contact ${who.name}`}>Contact retailer</button>}
      </span>
    </li>
  )
}

/**
 * Other retailers who made this item available: those who can cover it all
 * first, then those with some, cheapest first within each. Wholesale Market
 * Value is the same for every offer, so it's said once, above the list.
 */
function NetworkPanel({ id, match, wholesaleMarketValue }: {
  id: string; match: Exclude<NetworkMatch, { kind: 'none' }>; wholesaleMarketValue?: number
}) {
  const row = (l: NetworkListing) => <NetworkRow key={l.id} listing={l} wholesaleMarketValue={wholesaleMarketValue} />
  return (
    <section id={id} className={[styles.panel, styles.networkPanel].join(' ')} aria-labelledby={`${id}-title`}>
      <div className={styles.networkHead}>
        <h2 id={`${id}-title`} className={styles.panelTitle}>Other retailers</h2>
        {wholesaleMarketValue !== undefined && (
          <p className={styles.networkMarket}>
            {WMV_TERM} <b>{unitPrice(wholesaleMarketValue)}</b>
            <InfoTip term={WMV_TERM}>{`${WMV_TERM}: ${WMV_HELP}`}</InfoTip>
          </p>
        )}
      </div>
      {match.kind === 'full' ? (
        <>
          <ul className={styles.networkList} aria-label={`Can cover all ${match.needed}`}>{match.cover.map(row)}</ul>
          {match.some.length > 0 && (
            <>
              <p className={styles.networkGroup}>Other retailers with some</p>
              <ul className={styles.networkList}>{match.some.map(row)}</ul>
            </>
          )}
        </>
      ) : (
        <ul className={styles.networkList} aria-label="Retailers with some">{match.some.map(row)}</ul>
      )}
    </section>
  )
}

const Caret = () => <span className={styles.caret} aria-hidden="true"><Icon name="chevron-down" size={14} /></span>

/**
 * An opened line: one short reason and a strip of controls (quantity, "Why
 * N?", other retailers). Each disclosure opens its own zone: Why on the left
 * (about two thirds), other retailers on the right; whichever is open alone
 * takes the full width. Assumptions and options sit underneath.
 */
function LineDetail({ line, quantity, setQuantity, order, weekStarts, locked }: {
  line: OrderLineView; quantity: number; setQuantity: (n: number) => void; order: ProposedOrderView; weekStarts?: string[]
  /** Approved or submitted: quantities can no longer change. */
  locked?: boolean
}) {
  const [why, setWhy] = useState(false)
  const [showNetwork, setShowNetwork] = useState(false)
  const whyId = useId()
  const networkId = useId()
  const match = networkMatch(line.network, quantity)
  const network = showNetwork && match.kind !== 'none' ? match : null
  return (
    <div className={styles.detail}>
      <div className={styles.controls}>
        {locked
          ? <span className={styles.lockedQty}>Ordering {quantity}</span>
          : <QuantityStepper compact value={quantity} onChange={setQuantity} label={`Quantity for ${line.product}`} />}
        <button type="button" className={styles.disclosure} aria-expanded={why} aria-controls={whyId} onClick={() => setWhy((v) => !v)}>
          Why {line.quantity}?<Caret />
        </button>
        {match.kind !== 'none' && (
          <button type="button" aria-expanded={showNetwork} aria-controls={networkId} onClick={() => setShowNetwork((v) => !v)}
            className={[styles.disclosure, supplierShort(line.supplier.status) && styles.disclosureStrong].filter(Boolean).join(' ')}>
            {networkSignal(match)}<Caret />
          </button>
        )}
        {!locked && quantity !== line.quantity && (
          <button type="button" className={styles.textButton} onClick={() => setQuantity(line.quantity)}>Back to {line.quantity}</button>
        )}
      </div>
      {(why || network) && (
        <div className={[styles.zones, why && network && styles.zonesBoth].filter(Boolean).join(' ')}>
          {why && <div id={whyId} className={styles.whyZone}><WhyPanel line={line} supplier={order.supplier} leadTimeDays={order.leadTimeDays} orderBy={order.orderBy} weekStarts={weekStarts} /></div>}
          {network && <NetworkPanel id={networkId} match={network} wholesaleMarketValue={line.wholesaleMarketValue} />}
          {why && <Notes line={line} />}
        </div>
      )}
    </div>
  )
}

/** A quiet filter tab: the label, then a muted count; the current one is underlined. */
function FilterTab({ current, onClick, label, count }: { current: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button type="button" aria-pressed={current} onClick={onClick}>
      {label}<span className={styles.count}>{count}</span>
    </button>
  )
}

/**
 * One supplier's order as a plain table of facts: product, on hand, on order,
 * quantity, cost. Built to scan hundreds of lines; every reason lives behind a
 * click on the row. Quantities change locally only.
 */
export function OrderReview({ order, eyebrow, weekStarts, example }: {
  order: ProposedOrderView; eyebrow?: ReactNode; example?: boolean
  /** Start dates of the complete weeks in each line's weekly sales, oldest first. */
  weekStarts?: string[]
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'attention' | 'network'>('all')
  const [progress, setProgress] = useState<OrderProgress>({ status: 'draft' })
  const [reviewing, setReviewing] = useState(false)
  const locked = progress.status !== 'draft'
  const narrow = useNarrow()

  const sorted = sortForReview(order.lines)
  const attention = sorted.filter((l) => l.state !== 'ok')
  const qty = (l: OrderLineView) => quantities[l.id] ?? l.quantity
  // Compared against what we'd order now, so it follows quantity changes.
  const fromNetwork = sorted.filter((l) => networkMatch(l.network, qty(l)).kind !== 'none')
  const shown = filter === 'all' ? sorted : filter === 'attention' ? attention : fromNetwork
  const total = orderTotal(order.lines, quantities)
  const ordering = order.lines.filter((l) => qty(l) > 0).length
  const toggle = (id: string) => setOpen((current) => (current === id ? null : id))

  return (
    <>
      <OrderHeader order={order} eyebrow={eyebrow} total={total} lineCount={ordering}
        progress={progress} onProgress={setProgress} onReview={() => setReviewing(true)} />
      <HandoffStatus order={order} quantities={quantities} progress={progress} example={example} />

      <div className={[styles.work, progress.status !== 'submitted' && order.handoff && styles.withBar].filter(Boolean).join(' ')}>
        <div className={styles.filter} role="group" aria-label="Show">
          <FilterTab current={filter === 'all'} onClick={() => setFilter('all')} label="All" count={order.lines.length} />
          {attention.length > 0 && (
            <FilterTab current={filter === 'attention'} onClick={() => setFilter('attention')} label="Needs a look" count={attention.length} />
          )}
          {fromNetwork.length > 0 && (
            <FilterTab current={filter === 'network'} onClick={() => setFilter('network')} label="Other retailers" count={fromNetwork.length} />
          )}
        </div>

        <table className={styles.table} aria-label={`Proposed order from ${order.supplier}`}>
          <thead>
            <tr>
              <th scope="col" className={[styles.cGo, styles.wide].join(' ')}><span className="visually-hidden">Open</span></th>
              <th scope="col">Product</th>
              <th scope="col" className={[styles.num, styles.cStock].join(' ')}>On hand</th>
              <th scope="col" className={[styles.num, styles.wide, styles.cStock].join(' ')}>On order</th>
              <th scope="col" className={[styles.num, styles.cQty].join(' ')}>Order</th>
              <th scope="col" className={[styles.num, styles.cCost].join(' ')}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((line) => {
              const isOpen = open === line.id
              const q = qty(line)
              return (
                <Fragment key={line.id}>
                  {/* The whole row opens the line; the button inside is the keyboard and screen-reader control. */}
                  <tr className={[styles.row, isOpen && styles.openRow].filter(Boolean).join(' ')} onClick={() => toggle(line.id)}>
                    <td className={[styles.go, styles.wide].join(' ')} aria-hidden="true"><Icon name="chevron-right" size={14} /></td>
                    <th scope="row" className={styles.product}>
                      <button type="button" className={styles.lineButton} aria-expanded={isOpen}
                        aria-controls={`${line.id}-detail`} onClick={(e) => { e.stopPropagation(); toggle(line.id) }}>
                        {line.product}
                        {line.variant && <>{' '}<span className={styles.variant}>{line.variant}</span></>}
                      </button>
                    </th>
                    <td className={styles.num}>{line.onHand}</td>
                    <td className={[styles.num, styles.wide].join(' ')}>{line.onOrder || <span className={styles.none}>–</span>}</td>
                    <td className={[styles.num, styles.qty].join(' ')}>
                      {q}
                      {q !== line.quantity && <span className={styles.was}> was {line.quantity}</span>}
                    </td>
                    <td className={styles.num}>{cost(lineTotal(line, q), order.currency)}</td>
                  </tr>
                  {isOpen && (
                    <tr className={styles.detailRow} id={`${line.id}-detail`}>
                      <td colSpan={narrow ? 4 : 6}>
                        <LineDetail line={line} quantity={q} order={order} weekStarts={weekStarts} locked={locked}
                          setQuantity={(n) => setQuantities((prev) => ({ ...prev, [line.id]: n }))} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={narrow ? 3 : 5}>Total</th>
              <td className={styles.num}>{cost(total, order.currency)}</td>
            </tr>
          </tfoot>
        </table>

        {order.intelligenceQuestionId && (
          <AnchoredQuestion questionId={order.intelligenceQuestionId} headline="1 question could change this order" />
        )}
      </div>

      <ActionBar order={order} total={total} lineCount={ordering}
        progress={progress} onProgress={setProgress} onReview={() => setReviewing(true)} />
      <SubmitDialog order={order} total={total} lineCount={ordering} open={reviewing} onClose={() => setReviewing(false)}
        onProgress={setProgress} example={example} />
    </>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { formatMoney, plural } from '@/domain/language/plain'
import { PriceVsMarket, ReputationLine } from '@/features/network/NetworkBits'
import { compareToMarket, unitPrice, WMV_HELP, WMV_TERM } from '@/features/network/pricing'
import { addToOrder, setLineQuantity, startOrder, useDrafts } from '@/features/orders/drafts'
import { retailerLabel } from '@/features/orders/network'
import type { NetworkListing } from '@/features/orders/types'
import { attributeLabels } from './attributes'
import { ExampleMarker } from '@/ui/Example'
import { Icon } from '@/ui/Icon'
import { InfoTip } from '@/ui/InfoTip'
import { confirmLabel, current, destinations, itemKey, placements, type Destination } from './ordering'
import { ProductImage } from './ProductImage'
import { bestSource, orderNote, perUnit, shortName, stockLabel, type OrderContexts } from './sourcing'
import type { CatalogProduct, CatalogVariant } from './types'
import styles from './Catalog.module.css'

const CONFIDENCE: Record<string, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }

/**
 * One product (Figma reference: Product Detail). The left column is the
 * product: image, name, its options, the selected option's attributes, every
 * supplier's offer for it and other retailers'. The right column is the
 * decision for the selected option: the recommendation when there is one, a
 * quantity, and adding it to an order, at the best source or another
 * supplier (the side tray). A recommendation is for one option (a proposed
 * order line), so it says which.
 */
export function ProductDetail({ product, initialOption, orders, backHref, backLabel }: {
  product: CatalogProduct
  initialOption?: string
  orders: OrderContexts
  backHref: string
  backLabel: string
}) {
  const [optionId, setOptionId] = useState(() =>
    product.variants.find((v) => v.id === initialOption)?.id
    // Otherwise the option with a recommendation, so the page opens on what matters now.
    ?? product.variants.find((v) => v.own.recommended)?.id
    ?? product.variants[0]?.id)
  const variant = product.variants.find((v) => v.id === optionId) ?? product.variants[0]!
  const suppliers = [...new Set(product.variants.flatMap((v) => v.offers.map((o) => o.supplierName)))]

  // The chosen option lives in the address, so it can be shared and Back keeps it.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (product.variants.length > 1) url.searchParams.set('option', variant.id)
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [variant.id, product.variants.length])

  const attributes = Object.entries(variant.attributes)
  const otherRecs = product.variants.filter((v) => v.id !== variant.id && v.own.recommended)

  return (
    <div className={styles.detail}>
      <Link href={backHref} className={styles.back}><Icon name="chevron-left" size={16} />{backLabel}</Link>

      <div className={styles.detailGrid}>
        <div className={styles.detailTop}>
          <div className={styles.intro}>
            <figure className={styles.gallery}>
              <ProductImage image={product.image} size="hero" />
              <figcaption className={styles.provenance}>
                {product.image
                  ? <>Image: <a href={product.image.source.url} target="_blank" rel="noreferrer">{product.image.source.name}</a></>
                  : 'No product image matched yet'}
              </figcaption>
            </figure>
            <div className={styles.summary}>
              <p className={styles.detailEyebrow}>{product.brand} · {product.category}{product.example && <ExampleMarker quiet />}</p>
              <h1 className={styles.detailTitle}>{product.name}</h1>
              <p className={styles.detailSub}>
                {plural(product.variants.length, 'option')} · {suppliers.length === 1 ? `Supplied by ${suppliers[0]}` : `${suppliers.length} suppliers`}
              </p>
            </div>
          </div>

          {product.variants.length > 1 && (
            <section className={styles.optionsField} aria-labelledby="options-title">
              <div className={styles.blockHead}>
                <h2 id="options-title" className={styles.blockTitle}>Available options</h2>
                <span className={styles.blockMeta}>{plural(product.variants.length, 'option')}</span>
              </div>
              <div className={styles.optionChips}>
                {product.variants.map((v) => (
                  <button type="button" key={v.id} className={styles.optionChip} aria-pressed={v.id === variant.id} onClick={() => setOptionId(v.id)}>
                    {v.label}
                    {v.own.recommended && <><span className={styles.optionDot} aria-hidden="true" /><span className="visually-hidden">, recommended</span></>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {attributes.length > 0 && (
            <section className={styles.attributes} aria-labelledby="attributes-title">
              <h2 id="attributes-title" className={styles.blockTitle}>Product attributes</h2>
              <dl className={styles.attributeGrid}>
                {attributes.map(([key, a]) => (
                  <div key={key} className={styles.attribute}>
                    <dt>{attributeLabels[key] ?? key}</dt>
                    <dd>{a.designation}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className={styles.side} aria-label="Buying">
          <BuyCard key={variant.id} product={product} variant={variant} orders={orders} />
          {otherRecs.length > 0 && (
            <section className={styles.similar} aria-labelledby="similar-title">
              <h2 id="similar-title" className={styles.similarTitle}>Other recommended options</h2>
              <ul>
                {otherRecs.map((v) => (
                  <li key={v.id}>
                    <button type="button" className={styles.similarRow} onClick={() => setOptionId(v.id)}>
                      <span>
                        <span className={styles.similarName}>{v.label}</span>
                        <span className={styles.similarMeta}>{v.own.recommended!.quantity} recommended · {v.own.onHand} on hand</span>
                      </span>
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <div className={styles.detailRest}>
          <Offers variant={variant} orders={orders} optionLabel={product.variants.length > 1 ? variant.label : undefined} />
          {variant.network && variant.network.listings.some((l) => l.available > 0) && (
            <RetailerNetwork listings={variant.network.listings.filter((l) => l.available > 0)} wholesaleMarketValue={variant.network.wholesaleMarketValue} />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The decision for the selected option, on the dark surface: what we
 * recommend and from whom (the best source), a quantity that starts at the
 * recommendation, and the way into an order. Every add goes through the tray,
 * where the destination (or another supplier) is chosen and confirmed.
 */
function BuyCard({ product, variant, orders }: { product: CatalogProduct; variant: CatalogVariant; orders: OrderContexts }) {
  const drafts = useDrafts()
  const rec = variant.own.recommended
  const best = bestSource(variant, orders)
  const [quantity, setQuantity] = useState(rec?.quantity ?? 1)
  const [tray, setTray] = useState<null | 'best' | 'choose'>(null)
  if (!best) return null
  const dests = destinations(product.id, variant, orders, drafts)
  const target = dests.find((d) => d.offer.supplierId === best.offer.supplierId)!
  const where = placements(dests)
  const who = shortName(best.offer.supplierName)
  const stock = [`${variant.own.onHand} on hand`, variant.own.onOrder > 0 ? `${variant.own.onOrder} incoming` : 'none incoming'].join(' · ')
  const freight = target.kind === 'new' ? 'Would start a new order'
    : target.freightGap !== undefined ? `${formatMoney(Math.ceil(target.freightGap), best.offer.currency)} to free freight` : 'Ships free'
  const already = current(target) === quantity

  return (
    <section className={styles.buy} aria-labelledby="buy-title">
      <div className={styles.buyMain}>
        <p className={styles.recEyebrow}>Buying recommendation{product.variants.length > 1 && <> · {variant.label}</>}</p>
        <h2 id="buy-title" className={styles.buyTitle}>
          {rec ? `Order ${rec.quantity} from ${who}.` : 'Choose an order quantity.'}
        </h2>
        <p className={styles.recBody}>
          {rec ? rec.reason : `You have ${stock.replace(' · ', ' and ')}. Nothing is recommended for this option right now.`}
        </p>
        <p className={styles.buyFacts}>
          {rec && <span className={styles.confidence}>{CONFIDENCE[rec.confidence] ?? rec.confidence}</span>}
          <span>{unitPrice(perUnit(best.offer), best.offer.currency)} each · {freight}</span>
        </p>
      </div>

      <div className={styles.buyAct}>
        <div className={styles.buyQtyHead}>
          <span>
            <span className={styles.buyQtyLabel} id="buy-qty">Quantity</span>
            <span className={styles.buyQtyNote}>
              {rec ? (quantity === rec.quantity ? 'Recommendation applied' : <>Recommended {rec.quantity} · <button type="button" className={styles.buyReset} onClick={() => setQuantity(rec.quantity)}>Use {rec.quantity}</button></>) : 'Choose an order quantity'}
            </span>
          </span>
          {rec && quantity === rec.quantity && <span className={styles.buyPill}>Recommended</span>}
        </div>
        <DarkStepper value={quantity} onChange={setQuantity} labelledBy="buy-qty" accent={Boolean(rec && quantity === rec.quantity)} />
        <p className={styles.buyTotal}>
          <span>Estimated total</span>
          <b>{formatMoney(Math.round(perUnit(best.offer) * quantity * 100) / 100, best.offer.currency)}</b>
        </p>
        {already
          ? <Link href={`/orders/${target.orderId}${target.line ? `?line=${encodeURIComponent(target.line.lineId)}` : ''}`} className={styles.buyPrimary}>Review in {who} order</Link>
          : <button type="button" className={styles.buyPrimary} onClick={() => setTray('best')}>
              {target.kind === 'new' ? `Begin ${who} order` : current(target) !== undefined ? `Update ${who} order` : `Add ${quantity} to ${who} order`}
            </button>}
        {variant.offers.length > 1 && (
          <button type="button" className={styles.buySecondary} onClick={() => setTray('choose')}>Choose another supplier</button>
        )}
        {where.length > 0 && (
          <p className={styles.buyWhere}>
            In your orders: {where.map((p, i) => (
              <span key={p.orderId}>{i > 0 && ' · '}<Link href={`/orders/${p.orderId}`}>{shortName(p.supplierName)} {p.quantity}</Link></span>
            ))}
          </p>
        )}
      </div>

      {tray && (
        <AddTray product={product} variant={variant} dests={dests} initial={tray === 'best' ? target : undefined}
          quantity={quantity} onQuantity={setQuantity} onClose={() => setTray(null)} />
      )}
    </section>
  )
}

function DarkStepper({ value, onChange, labelledBy, accent }: { value: number; onChange: (n: number) => void; labelledBy: string; accent: boolean }) {
  return (
    <div className={styles.darkStepper} data-accent={accent || undefined} role="group" aria-labelledby={labelledBy}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}><Icon name="minus" size={16} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(Math.min(999, value + 1))}><Icon name="plus" size={16} /></button>
    </div>
  )
}

/**
 * Add to order (Figma: the side tray). Each supplier offering this option is
 * a destination: its proposed order (where this option may already be a
 * line), an order started earlier from the Catalog, or a new order. Moving a
 * recommendation to another supplier can take it off the order it was in,
 * so it isn't bought twice. Example only: kept in this browser (drafts.ts).
 */
function AddTray({ product, variant, dests, initial, quantity, onQuantity, onClose }: {
  product: CatalogProduct; variant: CatalogVariant; dests: Destination[]; initial?: Destination
  quantity: number; onQuantity: (n: number) => void; onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [chosen, setChosen] = useState<string>((initial ?? dests[0]!).offer.supplierId)
  const [done, setDone] = useState<{ label: string; orderId: string } | null>(null)
  const rec = variant.own.recommended
  const dest = dests.find((d) => d.offer.supplierId === chosen) ?? dests[0]!
  // The recommendation's own line, when this add would put the option in a different order.
  const recLine = rec && variant.orderLines?.find((l) => l.lineId === rec.lineId)
  const recDest = recLine && dests.find((d) => d.orderId === recLine.orderId)
  const moving = recDest && recDest.orderId !== dest.orderId && (recDest.line?.quantity ?? 0) > 0 ? recDest : undefined
  const [takeOff, setTakeOff] = useState(true)
  const who = shortName(dest.offer.supplierName)
  const name = `${product.name}${variant.label ? ` ${variant.label}` : ''}`

  useEffect(() => {
    const d = ref.current
    d?.showModal()
    return () => d?.close()
  }, [])

  const confirm = () => {
    let orderId = dest.orderId
    if (dest.kind === 'new') orderId = startOrder(dest.offer.supplierId, dest.offer.supplierName, dest.offer.currency)
    if (dest.line) setLineQuantity(orderId!, dest.line.lineId, quantity)
    else addToOrder(orderId!, { key: itemKey(product.id, variant.id), productId: product.id, optionId: variant.id, product: product.name, variant: variant.label || undefined, quantity, unitCost: perUnit(dest.offer) })
    if (moving && takeOff) setLineQuantity(moving.orderId!, moving.line!.lineId, 0)
    setDone({ label: current(dest) !== undefined ? `${who} order set to ${quantity}` : dest.kind === 'new' ? `Started a ${who} order with ${quantity}` : `Added ${quantity} to ${who} order`, orderId: orderId! })
  }

  return (
    <dialog ref={ref} className={styles.tray} aria-labelledby="tray-title" onCancel={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <header className={styles.trayHead}>
        <span>
          <span id="tray-title" className={styles.trayTitle}>Add to order</span>
          <span className={styles.traySub}>{name}</span>
        </span>
        <button type="button" className={styles.dialogBack} aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
      </header>

      <div className={styles.trayBody}>
        <p className={styles.paneLabel} id="tray-dest">Destination</p>
        <div className={styles.dests} role="radiogroup" aria-labelledby="tray-dest">
          {dests.map((d) => {
            const s = stockLabel(d.offer)
            const on = d.offer.supplierId === dest.offer.supplierId
            const facts = [
              `${unitPrice(perUnit(d.offer), d.offer.currency)} each`,
              d.kind !== 'new' && d.orderTotal !== undefined && `${formatMoney(Math.round(d.orderTotal), d.offer.currency)} order`,
              d.kind === 'proposed' && (d.freightGap !== undefined ? `${formatMoney(Math.ceil(d.freightGap), d.offer.currency)} to free freight` : 'ships free'),
              s.tone !== 'good' && s.text,
            ].filter(Boolean).join(' · ')
            return (
              <button type="button" role="radio" aria-checked={on} key={d.offer.supplierId} disabled={Boolean(done)}
                className={styles.dest} data-kind={d.kind} onClick={() => setChosen(d.offer.supplierId)}>
                <span className={styles.destText}>
                  <span className={styles.destName}>
                    {d.kind === 'new' ? `Start a new ${d.offer.supplierName} order` : `${d.offer.supplierName} ${d.kind === 'started' ? 'new order' : 'proposed order'}`}
                  </span>
                  <span className={styles.destFacts}>{facts}</span>
                  {d.line && <span className={styles.destFacts}>This option is a line here · {d.line.quantity} now</span>}
                  {d.added > 0 && <span className={styles.destFacts}>Added from the Catalog · {d.added} now</span>}
                </span>
                {on ? <span className={styles.destCheck} aria-hidden="true"><Icon name="check" size={12} /></span> : d.kind === 'new' && <Icon name="plus" size={16} />}
              </button>
            )
          })}
        </div>

        <p className={styles.paneLabel} id="tray-qty">Quantity</p>
        <div className={styles.trayQty}>
          <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1 || Boolean(done)} onClick={() => onQuantity(Math.max(1, quantity - 1))}><Icon name="minus" size={16} /></button>
          <output aria-labelledby="tray-qty" aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Increase quantity" disabled={Boolean(done)} onClick={() => onQuantity(Math.min(999, quantity + 1))}><Icon name="plus" size={16} /></button>
        </div>

        {moving && (
          <label className={styles.trayMove}>
            <input type="checkbox" checked={takeOff} disabled={Boolean(done)} onChange={(e) => setTakeOff(e.target.checked)} />
            <span>Take it off the {shortName(moving.offer.supplierName)} order ({moving.line!.quantity} now), so it isn’t ordered twice</span>
          </label>
        )}

        {rec && (
          <div className={styles.trayWhy}>
            <p className={styles.trayWhyLabel}>Why {rec.quantity}</p>
            <p>{rec.reason} You have {variant.own.onHand} on hand{variant.own.onOrder > 0 ? ` and ${variant.own.onOrder} incoming` : ' and none incoming'}.</p>
          </div>
        )}
        <p className={styles.trayNote}>Example only: kept in this browser until orders are built.</p>
      </div>

      <footer className={styles.trayFoot}>
        <p className={styles.trayTotal}>
          <span>Estimated line total</span>
          <b>{formatMoney(Math.round(perUnit(dest.offer) * quantity * 100) / 100, dest.offer.currency)}</b>
        </p>
        {done ? (
          <div className={styles.trayDone} role="status">
            <span><Icon name="check" size={14} /> {done.label}</span>
            <Link href={`/orders/${done.orderId}`}>View order →</Link>
          </div>
        ) : (
          <button type="button" className={styles.dialogApply} onClick={confirm} disabled={current(dest) === quantity && !(moving && takeOff)}>
            {confirmLabel(dest, quantity)}
          </button>
        )}
      </footer>
    </dialog>
  )
}

/**
 * Every supplier's offer for the selected option (Figma: Supplier options):
 * unit price, availability, arrival when the order says; a row opens its
 * details. The best source is marked.
 */
function Offers({ variant, orders, optionLabel }: { variant: CatalogVariant; orders: OrderContexts; optionLabel?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const best = bestSource(variant, orders)
  const bestId = best?.label === 'Best source' ? best.offer.supplierId : undefined
  const offers = [...variant.offers].sort((a, b) => Number(b.supplierId === bestId) - Number(a.supplierId === bestId) || perUnit(a) - perUnit(b))
  return (
    <section className={styles.offers} aria-labelledby="offers-title">
      <header className={styles.offersHead}>
        <h2 id="offers-title" className={styles.sectionTitle}>Supplier options</h2>
        {optionLabel && <p className={styles.blockMeta}>For {optionLabel}</p>}
      </header>
      <div className={styles.offerTable}>
        <div className={styles.offerCols} aria-hidden="true">
          <span>Supplier</span><span>Unit price</span><span>Available</span><span>Arrival</span><span />
        </div>
        {offers.map((o) => {
          const stock = stockLabel(o)
          const ctx = orders[o.supplierId]
          const isOpen = open === o.supplierId
          const id = `offer-${o.supplierId}`
          return (
            <div key={o.supplierId} className={styles.offerRow} data-best={o.supplierId === bestId || undefined} data-open={isOpen || undefined}>
              <button type="button" className={styles.offerButton} aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? null : o.supplierId)}>
                <span className={styles.offerName}>
                  {o.supplierName}
                  {o.supplierId === bestId && <span className={styles.bestTag}>Best source</span>}
                </span>
                <span className={styles.offerCell}><span className={styles.cellLabel}>Unit price</span><b>{unitPrice(perUnit(o), o.currency)}</b></span>
                <span className={styles.offerCell} data-tone={stock.tone}><span className={styles.cellLabel}>Available</span>{stock.text.split(' · ')[0]}</span>
                <span className={styles.offerCell}><span className={styles.cellLabel}>Arrival</span>{ctx?.leadTimeDays ? `About ${plural(ctx.leadTimeDays, 'day')}` : '—'}</span>
                <span className={styles.offerChevron} aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
              </button>
              {isOpen && (
                <div id={id} className={styles.offerDetail}>
                  <dl>
                    <div><dt>Unit price</dt><dd>{unitPrice(perUnit(o), o.currency)}{o.pack > 1 && ` (${unitPrice(o.unitCost, o.currency)} per pack of ${o.pack})`}</dd></div>
                    <div><dt>Pack size</dt><dd>{plural(o.pack, 'unit')}</dd></div>
                    <div><dt>Availability</dt><dd>{stock.text}</dd></div>
                    <div><dt>Your proposed order</dt><dd>{orderNote(ctx) ?? 'None yet; adding would start one'}</dd></div>
                    <div><dt>Your usual supplier</dt><dd>{o.usual ? 'Yes' : 'No'}</dd></div>
                    {o.illustrative && <div><dt>Offer</dt><dd>Example comparison</dd></div>}
                  </dl>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className={styles.offersNote}>
        {best && <>{best.label}: {best.reason} </>}Unit prices are the supplier’s price per unit; freight and terms aren’t included.
      </p>
    </section>
  )
}

/**
 * Other retailers with this option (the retailer network, Phase 2): a
 * summary, opened on request. Example listings only, with the same mocked
 * introduction as orders.
 */
function RetailerNetwork({ listings, wholesaleMarketValue }: { listings: NetworkListing[]; wholesaleMarketValue?: number }) {
  const [open, setOpen] = useState(false)
  const available = listings.reduce((n, l) => n + l.available, 0)
  const sorted = [...listings].sort((a, b) => a.price - b.price || b.available - a.available)
  return (
    <section className={styles.network} aria-labelledby="network-title">
      <div className={styles.networkHead}>
        <div>
          <p className={styles.networkEyebrow}>Retailer network <ExampleMarker quiet /></p>
          <p className={styles.networkSummary}>
            <span id="network-title" className={styles.networkTitle}>{available} units available</span>
            <span>{plural(listings.length, 'retailer')}</span>
            <span>From <b>{unitPrice(sorted[0]!.price)}</b></span>
          </p>
        </div>
        <button type="button" className={styles.networkToggle} aria-expanded={open} aria-controls="network-list" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide retailer options' : 'View retailer options'}<Icon name="chevron-down" size={16} />
        </button>
      </div>
      {open && (
        <div id="network-list">
          {wholesaleMarketValue !== undefined && (
            <p className={styles.networkMarket}>
              {WMV_TERM} <b>{unitPrice(wholesaleMarketValue)}</b>
              <InfoTip term={WMV_TERM}>{`${WMV_TERM}: ${WMV_HELP}`}</InfoTip>
            </p>
          )}
          <ul className={styles.networkList}>
            {sorted.map((l) => <NetworkRow key={l.id} listing={l} wholesaleMarketValue={wholesaleMarketValue} />)}
          </ul>
        </div>
      )}
    </section>
  )
}

function NetworkRow({ listing, wholesaleMarketValue }: { listing: NetworkListing; wholesaleMarketValue?: number }) {
  const [requested, setRequested] = useState(false)
  const who = retailerLabel(listing)
  return (
    <li className={styles.networkRow}>
      <span className={styles.networkWho}>
        <span className={styles.offerName}>{who.name}</span>
        <span className={styles.offerSub}>{who.place}</span>
        <ReputationLine reputation={who.reputation} />
      </span>
      <span>{listing.available} available</span>
      <span className={styles.networkPrice}>
        <span><b>{unitPrice(listing.price)}</b> each</span>
        {wholesaleMarketValue !== undefined && <PriceVsMarket comparison={compareToMarket(listing.price, wholesaleMarketValue)} short />}
      </span>
      <span className={styles.networkAct}>
        {requested
          ? <span className={styles.networkDone} role="status">Requested · you’ll arrange payment and shipping directly</span>
          : <button type="button" className={styles.textAction} onClick={() => setRequested(true)} aria-label={`Contact ${who.name}`}>Contact retailer</button>}
      </span>
    </li>
  )
}

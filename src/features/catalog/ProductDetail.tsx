'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { plural } from '@/domain/language/plain'
import { PriceVsMarket, ReputationLine } from '@/features/network/NetworkBits'
import { compareToMarket, unitPrice, WMV_HELP, WMV_TERM } from '@/features/network/pricing'
import { retailerLabel } from '@/features/orders/network'
import type { NetworkListing } from '@/features/orders/types'
import { ButtonLink } from '@/ui/Button'
import { ExampleMarker } from '@/ui/Example'
import { Icon } from '@/ui/Icon'
import { InfoTip } from '@/ui/InfoTip'
import { ProductImage } from './ProductImage'
import { bestSource, orderNote, perUnit, shortName, stockLabel, type OrderContexts } from './sourcing'
import type { CatalogProduct, CatalogVariant } from './types'
import styles from './Catalog.module.css'

const CONFIDENCE: Record<string, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }

/** What the options differ by, for the chips' heading ("Size", "Color"…), from the attributes read. */
function optionsHeading(product: CatalogProduct): string {
  const keys = new Set(product.variants.flatMap((v) => Object.keys(v.attributes)))
  if (keys.has('wheel_size') || keys.has('tire_width')) return keys.has('valve_type') ? 'Size and valve' : 'Size'
  if (keys.has('drivetrain_speed')) return 'Speed'
  if (keys.has('color')) return 'Color'
  if (keys.has('volume')) return 'Size'
  return 'Options'
}

/** The option's name in running text; a one-option product has none. */
const optionName = (v: CatalogVariant) => v.label || 'this product'

/**
 * One product: what it is, its options and which one is selected, who can
 * supply that option and on what terms, and what it means to this retailer
 * now. Product → Variant → Supplier offer, without naming any of them: the
 * retailer picks an option and everything below follows it. A recommendation
 * is for one option (a proposed order line), so it says which.
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
  const best = bestSource(variant, orders)
  const suppliers = [...new Set(product.variants.flatMap((v) => v.offers.map((o) => o.supplierName)))]
  const otherRecs = product.variants.filter((v) => v.id !== variant.id && v.own.recommended)

  // The chosen option lives in the address, so it can be shared and Back keeps it.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (product.variants.length > 1) url.searchParams.set('option', variant.id)
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [variant.id, product.variants.length])

  return (
    <div className={styles.detail}>
      <Link href={backHref} className={styles.back}><Icon name="chevron-left" size={16} />{backLabel}</Link>

      <div className={styles.detailTop}>
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

          <Recommendation variant={variant} single={product.variants.length === 1} orders={orders} />
          {otherRecs.length > 0 && (
            <p className={styles.alsoRecommended}>
              Also recommended: {otherRecs.map((v, i) => (
                <span key={v.id}>{i > 0 && ', '}
                  <button type="button" className={styles.inlineLink} onClick={() => setOptionId(v.id)}>{v.own.recommended!.quantity} of {v.label}</button>
                </span>
              ))}
            </p>
          )}

          {product.variants.length > 1 && (
            <fieldset className={styles.optionsField}>
              <legend className={styles.sectionLabel}>{optionsHeading(product)}</legend>
              <div className={styles.optionChips}>
                {product.variants.map((v) => (
                  <button type="button" key={v.id} className={styles.optionChip} aria-pressed={v.id === variant.id} onClick={() => setOptionId(v.id)}>
                    {v.label}
                    {v.own.recommended && <><span className={styles.optionDot} aria-hidden="true" /><span className="visually-hidden">, recommended</span></>}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {best && (
            <div className={styles.best}>
              <div className={styles.bestText}>
                <p className={styles.bestLabel}>{best.label}{product.variants.length > 1 && <> · {variant.label}</>}</p>
                <p className={styles.bestValue}>
                  {best.offer.supplierName} · <b>{unitPrice(perUnit(best.offer), best.offer.currency)}</b> each
                </p>
                <p className={styles.bestReason}>{best.reason}</p>
              </div>
              {variant.own.recommended && orders[best.offer.supplierId]?.orderId === variant.own.recommended.orderId && (
                <ButtonLink variant="primary" href={`/orders/${variant.own.recommended.orderId}?line=${encodeURIComponent(variant.own.recommended.lineId)}`}>
                  Review in order
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </div>

      <Offers variant={variant} orders={orders} bestSupplier={best?.label === 'Best source' ? best.offer.supplierId : undefined}
        optionLabel={product.variants.length > 1 ? variant.label : undefined} />

      {variant.network && variant.network.listings.some((l) => l.available > 0) && (
        <RetailerNetwork listings={variant.network.listings.filter((l) => l.available > 0)} wholesaleMarketValue={variant.network.wholesaleMarketValue} />
      )}
    </div>
  )
}

/**
 * The recommendation for the selected option, on the dark surface, or what
 * the retailer has of it when there is none. Never a product-wide total.
 */
function Recommendation({ variant, single, orders }: { variant: CatalogVariant; single: boolean; orders: OrderContexts }) {
  const { own } = variant
  const stock = [`${own.onHand} on hand`, own.onOrder > 0 ? `${own.onOrder} incoming` : 'none incoming'].join(' · ')
  if (!own.recommended) {
    return (
      <p className={styles.ownStock}>
        <span className={styles.ownLabel}>{single ? 'You have' : `${variant.label}:`}</span> {stock}
        {own.perWeek !== undefined && <> · {own.perWeek} sold / week</>}
        <span className={styles.ownNote}> · No replenishment recommended now</span>
      </p>
    )
  }
  const order = Object.values(orders).find((o) => o.orderId === own.recommended!.orderId)
  return (
    <section className={styles.recommendation} aria-labelledby="rec-title">
      <p className={styles.recEyebrow}>Buying recommendation</p>
      <h2 id="rec-title" className={styles.recTitle}>
        {single ? `${plural(own.recommended.quantity, 'unit')} recommended` : `${own.recommended.quantity} recommended for ${optionName(variant)}`}
      </h2>
      <p className={styles.recBody}>{own.recommended.reason}</p>
      <p className={styles.recFacts}>
        <span>{stock}</span>
        {own.perWeek !== undefined && <span>{own.perWeek} sold / week</span>}
        <span>{CONFIDENCE[own.recommended.confidence] ?? own.recommended.confidence}</span>
        {order && <span>In your proposed {shortName(order.supplierName)} order</span>}
      </p>
    </section>
  )
}

/** Every supplier offer for the selected option: cost per unit, stock, and what your proposed orders mean for it. */
function Offers({ variant, orders, bestSupplier, optionLabel }: {
  variant: CatalogVariant; orders: OrderContexts; bestSupplier?: string; optionLabel?: string
}) {
  const offers = [...variant.offers].sort((a, b) => Number(b.supplierId === bestSupplier) - Number(a.supplierId === bestSupplier) || perUnit(a) - perUnit(b))
  return (
    <section className={styles.offers} aria-labelledby="offers-title">
      <header className={styles.sectionHead}>
        <h2 id="offers-title" className={styles.sectionTitle}>Supplier offers</h2>
        <p className={styles.sectionLead}>
          {optionLabel ? `For ${optionLabel}: ` : ''}supplier cost per unit, stock, and how each fits the orders you already have proposed.
        </p>
      </header>
      <ul className={styles.offerList}>
        {offers.map((o) => {
          const stock = stockLabel(o)
          const note = orderNote(orders[o.supplierId])
          return (
            <li key={o.supplierId} className={styles.offer} data-best={o.supplierId === bestSupplier || undefined}>
              <span className={styles.offerWho}>
                <span className={styles.offerName}>
                  <Link href={`/suppliers/${o.supplierId}`}>{o.supplierName}</Link>
                  {o.supplierId === bestSupplier && <span className={styles.bestTag}>Best source</span>}
                </span>
                {o.usual && <span className={styles.offerSub}>Your usual supplier</span>}
                {o.illustrative && <span className={styles.offerSub}>Example comparison</span>}
              </span>
              <span className={styles.offerCost}>
                <span><b>{unitPrice(perUnit(o), o.currency)}</b> each</span>
                {o.pack > 1 && <span className={styles.offerSub}>{unitPrice(o.unitCost, o.currency)} per pack of {o.pack}</span>}
              </span>
              <span className={styles.offerStock} data-tone={stock.tone}>{stock.text}</span>
              <span className={styles.offerOrder}>{note ?? <span className={styles.offerSub}>No proposed order with this supplier</span>}</span>
            </li>
          )
        })}
      </ul>
      <p className={styles.offersNote}>Costs are the supplier’s price per unit. Freight and terms aren’t included.</p>
    </section>
  )
}

/**
 * Other retailers with this option (the retailer network, Phase 2): shown
 * from example listings only, with the same mocked introduction as orders.
 */
function RetailerNetwork({ listings, wholesaleMarketValue }: { listings: NetworkListing[]; wholesaleMarketValue?: number }) {
  const available = listings.reduce((n, l) => n + l.available, 0)
  const sorted = [...listings].sort((a, b) => a.price - b.price || b.available - a.available)
  return (
    <section className={styles.network} aria-labelledby="network-title">
      <div className={styles.networkHead}>
        <div>
          <p className={styles.networkEyebrow}>Retailer network <ExampleMarker quiet /></p>
          <h2 id="network-title" className={styles.networkTitle}>Other retailers have {available} available</h2>
          <p className={styles.networkLead}>If you want to add to your stock or source this option locally.</p>
        </div>
        {wholesaleMarketValue !== undefined && (
          <p className={styles.networkMarket}>
            {WMV_TERM} <b>{unitPrice(wholesaleMarketValue)}</b>
            <InfoTip term={WMV_TERM}>{`${WMV_TERM}: ${WMV_HELP}`}</InfoTip>
          </p>
        )}
      </div>
      <ul className={styles.networkList}>
        {sorted.map((l) => <NetworkRow key={l.id} listing={l} wholesaleMarketValue={wholesaleMarketValue} />)}
      </ul>
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

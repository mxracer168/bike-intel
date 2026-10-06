import type { Reputation } from '@/features/network/reputation'

/**
 * What the proposed-order screens need to render. Presentation shapes, not
 * database models: real orders will be mapped into these from
 * recommendation_line / purchase_order_line when that logic exists.
 */
export type Confidence = 'high' | 'medium' | 'low'

/** ok: nothing to look at · review: worth a second look · question: we need an answer first. */
export type LineState = 'ok' | 'review' | 'question'

/**
 * Units another participating retailer has chosen to make available. The
 * seller side (opting in, the excess rule, price exceptions) happens in their
 * Excess inventory; this is what a buyer sees: enough to understand the
 * trade before contacting anyone.
 */
export type NetworkListing = {
  id: string
  /** The seller, named alongside their reputation (docs/network.md). */
  retailer: { name: string; place: string; reputation: Reputation }
  available: number
  /** The seller's network price per unit: Wholesale Market Value unless they changed it. */
  price: number
}

/** available: normal · limited: few left · delayed: late delivery · out: can't supply now. */
export type SupplierStatus = 'available' | 'limited' | 'delayed' | 'out'
export type SupplierCondition = {
  status: SupplierStatus
  note: string
  /** When an out-of-stock or delayed item is expected back at the supplier, if known. */
  expectedInDays?: number
}

export type OrderLineView = {
  id: string
  product: string
  variant?: string
  onHand: number
  onOrder: number
  /** Suggested quantity, in ordering units. */
  quantity: number
  unitCost: number
  state: LineState
  /** How well the supplier can fill this line right now. */
  supplier: SupplierCondition
  /** Level 2: the reason in a full plain sentence, shown when the line is opened. */
  reason: string
  /** Only when state is "question". */
  question?: { prompt: string; choices: string[] }
  // Evidence: shown only on request.
  weeklySales: number[]
  /** Placeholder until confidence scoring exists: example data only. */
  confidence: Confidence
  season?: string
  /** How much faster (+) or slower (−) than normal for this time of year, e.g. 0.2. Example data only. */
  seasonalPace?: number
  availability: string
  assumptions: string[]
  alternatives: string[]
  /** Other retailers' available units for this item (absent or empty: nothing to show). */
  network?: NetworkListing[]
  /** The platform's Wholesale Market Value per unit, the benchmark for network prices. Example data only. */
  wholesaleMarketValue?: number
}

export type ProposedOrderView = {
  id: string
  supplier: string
  currency: string
  leadTimeDays: number
  /** Order total that ships free, if the supplier has one. */
  freeFreightAt?: number
  /** Plain-words cutoff for this order, e.g. "Thursday". */
  orderBy?: string
  lines: OrderLineView[]
  /** A conversation question whose answer could change this order (shown anchored at the bottom). */
  intelligenceQuestionId?: string
}

/** One row on Today / Orders: the whole order at a glance, no line detail. */
export type OrderSummary = {
  id: string
  supplier: string
  currency: string
  lineCount: number
  total: number
  confident: number
  review: number
  questions: number
  /** Amount still needed for free freight; absent when already free or no threshold. */
  freightGap?: number
  orderBy?: string
}

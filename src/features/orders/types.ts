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
 * seller side (opting in, how many) happens elsewhere; this is what a buyer
 * sees. No price: that is agreed between the two retailers.
 */
export type NetworkListing = {
  id: string
  /** How the other retailer is identified. How much is revealed, and when, is a policy decision not yet made. */
  retailer: { name: string; place: string }
  available: number
}

/** available: normal · limited: few left · delayed: late delivery · out: can't supply now. */
export type SupplierStatus = 'available' | 'limited' | 'delayed' | 'out'
export type SupplierCondition = { status: SupplierStatus; note: string }

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
  /** Level 1, visible while scanning: one short reason and one piece of proof. */
  signal: { reason: string; proof: string }
  /** How well the supplier can fill this line right now. */
  supplier: SupplierCondition
  /** Level 2: the reason in a full plain sentence, shown when the line is opened. */
  reason: string
  /** Only when state is "question". */
  question?: { prompt: string; choices: string[] }
  // Evidence: shown only on request.
  weeklySales: number[]
  confidence: Confidence
  season?: string
  availability: string
  assumptions: string[]
  alternatives: string[]
  /** Other retailers' available units for this item (absent or empty: nothing to show). */
  network?: NetworkListing[]
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

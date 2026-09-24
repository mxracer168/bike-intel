/**
 * What the proposed-order screens need to render. Presentation shapes, not
 * database models: real orders will be mapped into these from
 * recommendation_line / purchase_order_line when that logic exists.
 */
export type Confidence = 'high' | 'medium' | 'low'

/** ok: nothing to look at · review: worth a second look · question: we need an answer first. */
export type LineState = 'ok' | 'review' | 'question'

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
  /** The one reason behind the quantity, in plain words. */
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
  /** A conversation question whose answer could change this order, shown inline. */
  intelligenceQuestionId?: string
  /** Why that question matters here, in a few words. */
  intelligenceQuestionLead?: string
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

/**
 * What a recommendation card needs to render. This is a presentation shape,
 * not the database model: real recommendations will be mapped into it from
 * recommendation / recommendation_line when that logic exists.
 */
export type Confidence = 'high' | 'medium' | 'low'

export type RecommendationView = {
  id: string
  decision: 'order' | 'skip'
  /** Suggested quantity in selling units (0 when skipping). */
  quantity: number
  product: string
  variant?: string
  supplier: string
  /** One or two plain facts: the "reason" layer. */
  reason: string
  confidence: Confidence
  /** Weekly unit sales, oldest first (the chart in the evidence layer). */
  weeklySales: number[]
  onHand: number
  onOrder: number
  leadTimeDays?: number
  coverWeeks?: number
  unitCost?: number
  currency?: string
  /** Context that shaped the number, in plain words. */
  context?: string
  /** For low-confidence items: the one thing we'd like to know. */
  question?: string
}

export type AttentionItem = { id: string; title: string; detail: string; href?: string; tone: 'info' | 'consider' }

/**
 * Insights presentation shapes. Nothing here is computed yet; see
 * docs/insights.md for what each will eventually be built from.
 */

/**
 * One reviewed purchase: what we recommended, what the buyer approved, and
 * what demand turned out to be. Kept separately on purpose: agreeing with the
 * recommendation is not the same as matching demand.
 */
export type DecisionOutcome = {
  id: string
  item: string
  recommended: number
  approved: number
  demand: number
  /** Which lesson it belongs to. Chosen by hand in the example. */
  group: 'judgment' | 'recommendation' | 'improve'
  /** One constructive sentence about what happened. */
  note: string
}

export type InsightAction = { label: string; href: string }

/** An observation worth the retailer's attention, with a fact or two. */
export type PatternView = {
  id: string
  observation: string
  facts: string[]
  action?: InsightAction
  /** When the data can't explain it: the id of a question in the intelligence system. */
  questionId?: string
}

export type OpportunityView = {
  id: string
  title: string
  detail: string
  /** Retailer-specific Program fit, when the opportunity is a supplier program. */
  programFit?: number
  action?: InsightAction
}

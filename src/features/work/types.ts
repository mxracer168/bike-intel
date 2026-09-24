/**
 * One item on Today's work queue beyond orders. Generic on purpose: a booking
 * deadline, excess stock, unusual sales, an order ready for approval, a
 * supplier opportunity or a question all render the same way.
 */
export type WorkKind = 'booking' | 'excess' | 'unusual' | 'approval' | 'opportunity' | 'question'

export type WorkItemView = {
  id: string
  kind: WorkKind
  title: string
  detail?: string
  /** Where to act on it, with a short verb for the link. */
  action?: { href: string; label: string }
  /** Quick answers, for questions we can take right here. */
  choices?: string[]
}

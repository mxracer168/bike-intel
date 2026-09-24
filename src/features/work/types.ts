/**
 * One item on Today's ranked priority list. Generic on purpose: an order to
 * review, a booking deadline, excess stock, unusual sales, an order ready for
 * approval, a supplier opportunity, a sync problem or a question all render
 * the same way. The kind is for ranking and logic later, not for display.
 */
export type WorkKind = 'order' | 'booking' | 'excess' | 'unusual' | 'approval' | 'opportunity' | 'sync' | 'question'

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

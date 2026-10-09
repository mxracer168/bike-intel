/**
 * One item on Today's ranked priority list. Generic on purpose: an order to
 * review, a booking deadline, excess stock, unusual sales, an order ready for
 * approval, a supplier opportunity, a sync problem or a question all render
 * the same way. The kind sets the small status label and dot; whatever sits
 * first gets the larger "hero" treatment, wherever it came from.
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
  /** A short status for the label above the title ("Ready for review"); defaults by kind. */
  status?: string
  /** The figures worth showing when this item leads the list. Only real values; omit what isn't known. */
  facts?: WorkFacts
}

export type WorkFacts = {
  /** The one figure that sizes the decision ("$4,824"), with what it is ("Recommended · 79 lines"). */
  figure?: { value: string; label: string }
  /** Progress toward a threshold (free freight), 0–1. */
  progress?: { label: string; ratio: number }
  /** One sentence for the lead position, when it says more than `detail`. */
  summary?: string
}

export type WorkTone = 'info' | 'caution' | 'good' | 'risk'

const kindStatus: Record<WorkKind, string> = {
  order: 'Ready for review', booking: 'Deadline', excess: 'Inventory', unusual: 'Unusual sales',
  approval: 'Ready to approve', opportunity: 'Opportunity', sync: 'Connection', question: 'Question for you',
}
const kindTone: Record<WorkKind, WorkTone> = {
  order: 'info', booking: 'info', excess: 'caution', unusual: 'caution',
  approval: 'info', opportunity: 'good', sync: 'risk', question: 'info',
}

export const workStatus = (item: WorkItemView) => item.status ?? kindStatus[item.kind]
export const workTone = (item: WorkItemView) => kindTone[item.kind]

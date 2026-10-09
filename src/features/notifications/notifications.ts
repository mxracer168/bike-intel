import type { ConnectionView } from '@/features/connections/types'
import { questionTopic, type IntelligenceQuestionView } from '@/features/intelligence/types'
import type { ProposedOrderView } from '@/features/orders/types'
import type { SupplierPresentation } from '@/features/suppliers/presentation'

/**
 * Notifications: what changed or needs attention, derived from states the
 * application can actually determine. Not a second work queue: a
 * notification is something that went wrong, is about to close, or is new
 * (a connection that stopped working, items a supplier can't ship, a program
 * closing soon, a new question). Nothing is stored; the id is a fingerprint
 * of the state, so when the state changes it reads as new again.
 */

export type NotificationKind = 'connection' | 'availability' | 'deadline' | 'question'

export type NotificationView = {
  /** Stable for as long as the state it describes is unchanged. */
  id: string
  kind: NotificationKind
  title: string
  detail?: string
  /** Where to act. Questions open the conversation instead. */
  href?: string
  /** The question it's about, for kind "question". */
  questionId?: string
  /** Problems first, then what's closing, then what's new. */
  attention: boolean
}

/** Programs closing within this many days are worth a notification. */
export const DEADLINE_WINDOW_DAYS = 30

export function connectionNotifications(connections: ConnectionView[]): NotificationView[] {
  return connections.filter((c) => c.status === 'attention').map((c) => ({
    id: `connection:${c.id}:${c.lastSync ?? ''}`,
    kind: 'connection',
    title: `${c.name} needs attention`,
    detail: c.attention,
    href: `/connections?connection=${encodeURIComponent(c.id)}`,
    attention: true,
  }))
}

/** Items on a proposed order that the supplier can't ship now (out of stock or delayed). */
export function availabilityNotifications(orders: ProposedOrderView[]): NotificationView[] {
  return orders.flatMap((o) => {
    const stuck = o.lines.filter((l) => l.supplier.status === 'out' || l.supplier.status === 'delayed')
    if (stuck.length === 0) return []
    const short = o.supplier.split(' ')[0]
    const names = stuck.map((l) => [l.product, l.variant].filter(Boolean).join(' '))
    return [{
      id: `availability:${o.id}:${stuck.map((l) => `${l.id}=${l.supplier.status}`).sort().join(',')}`,
      kind: 'availability' as const,
      title: stuck.length === 1 ? `1 item on your ${short} order can’t ship now` : `${stuck.length} items on your ${short} order can’t ship now`,
      detail: names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and '),
      href: `/orders/${o.id}?line=${encodeURIComponent(stuck[0]!.id)}`,
      attention: true,
    }]
  })
}

/**
 * "October 31" as the next date it can mean from `today`: this year, or
 * null when it has passed or can't be read. Supplier pages give dates
 * without a year.
 */
export function upcomingDate(text: string, today: Date): Date | null {
  const d = new Date(`${text}, ${today.getFullYear()}`)
  if (Number.isNaN(d.getTime())) return null
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return d >= start ? d : null
}

/** Supplier programs that close within the window. Closed ones are left out, never shown as new. */
export function deadlineNotifications(suppliers: SupplierPresentation[], today: Date): NotificationView[] {
  const day = 24 * 60 * 60 * 1000
  return suppliers.flatMap((s) => s.sections.flatMap((section) => section.type !== 'programs' ? [] : section.programs.flatMap((p) => {
    const closes = p.closes ? upcomingDate(p.closes, today) : null
    if (!closes) return []
    const days = Math.round((closes.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / day)
    if (days > DEADLINE_WINDOW_DAYS) return []
    return [{
      id: `deadline:${s.identity.id}:${p.name}:${p.closes}`,
      kind: 'deadline' as const,
      title: `${s.identity.name.split(' ')[0]}’s ${p.name} closes ${p.closes}`,
      detail: days === 0 ? 'Closes today.' : days === 1 ? 'Closes tomorrow.' : `${days} days left.`,
      href: `/suppliers/${s.identity.id}`,
      attention: false,
    }]
  })))
}

/** A question we haven't asked before is news; one already answered or set aside is not. */
export function questionNotifications(questions: IntelligenceQuestionView[]): NotificationView[] {
  return questions.filter((q) => q.status === 'open').map((q) => ({
    id: `question:${q.id}`,
    kind: 'question',
    title: `New question: ${questionTopic(q)}`,
    detail: q.prompt,
    questionId: q.id,
    attention: false,
  }))
}

const rank: Record<NotificationKind, number> = { connection: 0, availability: 1, deadline: 2, question: 3 }

export function sortNotifications(items: NotificationView[]): NotificationView[] {
  return [...items].sort((a, b) => rank[a.kind] - rank[b.kind])
}

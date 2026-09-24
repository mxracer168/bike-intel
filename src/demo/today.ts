/**
 * EXAMPLE DATA for Today, the context panel and the sync line. Never written
 * to the database. Suppliers and places are fictional.
 */
import type { ConversationEntry, IntelligenceQuestionView, SyncStatus } from '@/features/intelligence/types'
import { summarizeOrder } from '@/features/orders/summarize'
import type { HealthMetric } from '@/features/today/types'
import { orderPriority } from '@/features/work/fromOrder'
import type { WorkItemView } from '@/features/work/types'
import { findDemoOrder } from './orders'

export const demoHealth: HealthMetric[] = [
  { label: 'Sales this week', value: '$12,480', note: 'Up 6% on last year' },
  { label: 'In stock', value: '96%', note: 'Of the items you always carry' },
  { label: 'Stock on hand', value: '$184,200', note: 'About 11 weeks of sales' },
  { label: 'On order', value: '$9,860', note: 'From 3 suppliers' },
  { label: 'Not selling', value: '$8,400', note: 'No sales in 90 days' },
]

function order(id: string): WorkItemView[] {
  const o = findDemoOrder(id)
  return o ? [orderPriority(summarizeOrder(o))] : []
}

/** Ranked by hand for the example: what needs the buyer first, then deadlines, then money. */
export const demoPriorities: WorkItemView[] = [
  ...order('northline'),
  ...order('summit'),
  {
    id: 'ridgeline-booking',
    kind: 'booking',
    title: 'Ridgeline’s spring 2027 booking closes October 2.',
    detail: 'Booking 12 bikes earns the first discount tier.',
    action: { href: '/suppliers/demo-ridgeline', label: 'See the program' },
  },
  ...order('cascade'),
  {
    id: 'fox-dropper-excess',
    kind: 'excess',
    title: 'You have more Fox Transfer droppers than you’re likely to sell before spring.',
    detail: '9 on hand; you usually sell about 3 by March.',
  },
]

/**
 * Already ranked; the conversation asks at most three at a time. Example
 * questions are answered locally and never saved.
 */
export const DEMO_CEDAR_RIDGE = 'demo-cedar-ridge'

export const demoIntelligenceQuestions: IntelligenceQuestionView[] = [
  { id: DEMO_CEDAR_RIDGE, prompt: 'Should we carry more trail tires ahead of the Cedar Ridge opening?', choices: ['Yes, a few more', 'Keep it normal', 'Not sure yet'], status: 'open', example: true },
  { id: 'demo-winter-service', prompt: 'Are you running a winter service special this year?', choices: ['Yes', 'No', 'Not decided'], status: 'open', example: true },
  { id: 'demo-tubes-26', prompt: 'Do you want to keep stocking 26-inch tubes?', choices: ['Yes', 'Just a few', 'No'], status: 'open', example: true },
]

export const demoSync: SyncStatus = { state: 'ok', label: 'All synced · 7:40 am' }

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

function said(id: string, author: 'you' | 'system', body: string, at: string, note?: string): ConversationEntry {
  return {
    id: `demo-${id}`, kind: 'text', author, authorId: null, body, createdAt: at,
    questionId: null, answerChoice: null, attachment: null, example: true, note,
  }
}

/**
 * An example conversation, shown before the real one in development only so
 * the interaction can be reviewed. Never written to the database. The
 * assistant replies are illustrative: nothing generates them yet.
 */
export const demoConversation: ConversationEntry[] = [
  said('1', 'you', 'We’re expecting the Cedar Ridge trails to open in March. That usually gives us a bump in mountain bike traffic.', hoursAgo(27)),
  said('2', 'system', 'That’s helpful. I’ll treat March as a likely increase in mountain bike demand for your Columbia store.\n\nDo you expect that to affect complete-bike sales, service traffic, or both?', hoursAgo(27)),
  said('3', 'you', 'Mostly service and accessories. We usually see more tires, sealant and suspension work before people start riding again.', hoursAgo(26.9)),
  said('4', 'system', 'Got it. I’ll keep that in mind when we review spring inventory and service-related recommendations.', hoursAgo(26.9)),
  said('5', 'you', 'When was the last time I ordered from Northline Distribution?', hoursAgo(2)),
  said('6', 'system', 'For this example, your most recent Northline order was September 18 for about $4,860 across 73 lines.\n\nWhen live order data is connected, I’ll answer this from your actual order history.', hoursAgo(2),
    'Example answer. Not from your order history.'),
]

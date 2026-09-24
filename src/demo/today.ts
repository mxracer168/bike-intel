/**
 * EXAMPLE DATA for Today, the context panel and the sync line. Never written
 * to the database. Suppliers and places are fictional.
 */
import type { IntelligenceQuestionView, SyncStatus } from '@/features/intelligence/types'
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
  { id: DEMO_CEDAR_RIDGE, prompt: 'Will the new Cedar Ridge trails open before spring?', choices: ['Yes, this spring', 'Not sure yet', 'No'], status: 'open', example: true },
  { id: 'demo-winter-service', prompt: 'Are you running a winter service special this year?', choices: ['Yes', 'No', 'Not decided'], status: 'open', example: true },
  { id: 'demo-tubes-26', prompt: 'Do you want to keep stocking 26-inch tubes?', choices: ['Yes', 'Just a few', 'No'], status: 'open', example: true },
]

export const demoSync: SyncStatus = { state: 'ok', label: 'All synced · 7:40 am' }

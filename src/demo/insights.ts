/**
 * EXAMPLE DATA for Insights: invented outcomes for fictional purchases.
 * Never written to the database; no calculation behind any of it.
 */
import type { DecisionOutcome, OpportunityView, PatternView } from '@/features/insights/types'
import type { HealthMetric } from '@/features/today/types'
import { demoProgramFit } from './suppliers'
import { DEMO_KIDS_BIKES } from './today'

export const demoPerformance: HealthMetric[] = [
  { label: 'Matched demand', value: '82%', note: '18 of 22 reviewed purchases landed close to actual demand' },
  { label: 'Ran short', value: '7 items', trend: { direction: 'down', text: '5 from the previous 90 days', good: true } },
  { label: 'Sat too long', value: '$8,400', trend: { direction: 'down', text: '$1,240 from the previous 90 days', good: true } },
]

/** A spread on purpose: your change helped, ours was closer, both close, both short. */
export const demoDecisions: DecisionOutcome[] = [
  { id: 'd-service', item: 'Winter service parts', recommended: 24, approved: 30, demand: 31, group: 'judgment',
    note: 'Your increase for the service season matched demand better than our recommendation.' },
  { id: 'd-road', item: 'Road tires, 700 × 28', recommended: 20, approved: 16, demand: 17, group: 'judgment',
    note: 'Your smaller order fit September better; we expected more road riding than came.' },
  { id: 'd-trail', item: 'Trail tires', recommended: 36, approved: 30, demand: 34, group: 'recommendation',
    note: 'The recommendation was closer; the smaller order ran short in the last two weeks.' },
  { id: 'd-pads', item: 'Brake pads', recommended: 48, approved: 48, demand: 51, group: 'recommendation',
    note: 'Close to demand. Timing between deliveries still left a few short days.' },
  { id: 'd-dropper', item: 'Fox Transfer droppers', recommended: 4, approved: 9, demand: 3, group: 'recommendation',
    note: 'The larger order is now about 19 weeks of supply.' },
  { id: 'd-kids', item: 'Kids’ bikes', recommended: 10, approved: 12, demand: 21, group: 'improve',
    note: 'We underestimated August. Your increase got closer; both fell short.' },
]

export const demoPatterns: PatternView[] = [
  {
    id: 'p-kids',
    observation: 'Kids’ bike sales were much stronger than expected in August.',
    facts: ['21 sold', '10–12 expected'],
    questionId: DEMO_KIDS_BIKES,
  },
  {
    id: 'p-trail',
    observation: 'Trail tire sales have run about 18% ahead of last year for six weeks.',
    facts: ['Minion DHF, DHR II and Assegai lead', 'Steady, not one busy week'],
  },
  {
    id: 'p-droppers',
    observation: 'Fox Transfer droppers are building up faster than they sell.',
    facts: ['9 on hand', 'About 19 weeks of supply'],
    action: { label: 'View inventory', href: '/inventory' },
  },
  {
    id: 'p-pads',
    observation: 'Brake pads ran out three times in the last 60 days.',
    facts: ['Each for 2–4 days', 'Always just before a Northline delivery'],
  },
]

export const demoOpportunities: OpportunityView[] = [
  {
    id: 'o-tire-program',
    title: 'Northline’s tire pre-season program fits your current demand.',
    detail: 'Closes November 15. Tiered discounts on 24 or more tires, split across two deliveries.',
    programFit: demoProgramFit('demo-northline')['Tire pre-season']?.score,
    action: { label: 'View program', href: '/suppliers/demo-northline' },
  },
  {
    id: 'o-trail-position',
    title: 'Trail tire demand supports a deeper fall position.',
    detail: 'Sales running 18% ahead of last year, with the busiest trail months still ahead.',
  },
  {
    id: 'o-suspension',
    title: '$3,200 of slow-moving suspension inventory may be worth reviewing.',
    detail: 'Droppers and two rear shocks, most with no sale in the last 60 days.',
    action: { label: 'Review items', href: '/inventory' },
  },
  {
    id: 'o-network',
    title: 'Another retailer may be looking for inventory you have in excess.',
    detail: 'Palmetto Cycles is looking for Fox Transfer droppers.',
  },
]

/**
 * EXAMPLE DATA for the Today preview. Never written to the database.
 * Products are real product names; suppliers and places are fictional.
 */
import type { AttentionItem, RecommendationView } from '@/features/recommendations/types'

export const demoRecommendations: RecommendationView[] = [
  {
    id: 'demo-brake-pads',
    decision: 'order',
    quantity: 6,
    product: 'Shimano B01S resin disc brake pads',
    variant: 'Pair',
    supplier: 'Northline Distribution',
    reason: 'You typically sell about 2 each week and have 2 left. Your next Northline delivery is 5 days out.',
    confidence: 'high',
    weeklySales: [1, 2, 1, 3, 2, 2, 3, 2, 3, 2, 2, 3],
    onHand: 2,
    onOrder: 0,
    leadTimeDays: 5,
    coverWeeks: 3,
    unitCost: 9.4,
    currency: 'USD',
    context: 'Trail riding usually stays busy through October for you.',
  },
  {
    id: 'demo-dhf',
    decision: 'order',
    quantity: 4,
    product: 'Maxxis Minion DHF 29 × 2.5 WT EXO+',
    supplier: 'Northline Distribution',
    reason: 'You have 1 left and sold 5 last October. Fall trail riding keeps these moving.',
    confidence: 'medium',
    weeklySales: [0, 1, 1, 0, 1, 2, 1, 1, 2, 1, 1, 2],
    onHand: 1,
    onOrder: 0,
    leadTimeDays: 5,
    coverWeeks: 4,
    unitCost: 58,
    currency: 'USD',
  },
  {
    id: 'demo-seatpost',
    decision: 'skip',
    quantity: 0,
    product: 'Fox Transfer dropper seatpost 150 mm',
    supplier: 'Summit Parts Supply',
    reason: 'You have 3, which usually lasts you about 4 months. No need to reorder yet.',
    confidence: 'high',
    weeklySales: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    onHand: 3,
    onOrder: 0,
    currency: 'USD',
  },
  {
    id: 'demo-chain-tool',
    decision: 'order',
    quantity: 2,
    product: 'Park Tool CT-3.3 chain tool',
    supplier: 'Northline Distribution',
    reason: 'This is new to your store, so we started small.',
    confidence: 'low',
    weeklySales: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    onHand: 0,
    onOrder: 0,
    leadTimeDays: 5,
    unitCost: 21.5,
    currency: 'USD',
    question: 'Do you plan to keep chain tools on the shelf, or order them for customers as needed?',
  },
]

export const demoAttention: AttentionItem[] = [
  {
    id: 'demo-freight',
    title: 'You’re $42 away from free freight with Northline.',
    detail: 'Adding the brake pads and tires above gets you there.',
    tone: 'info',
  },
  {
    id: 'demo-booking',
    title: 'Ridgeline’s spring 2027 booking closes in 9 days.',
    detail: 'It looks like a good fit for your trail customers. We can walk through it with you.',
    href: '/suppliers/demo-ridgeline',
    tone: 'consider',
  },
]

export const demoQuestion = {
  prompt: 'Will the new Cedar Ridge trails open before spring?',
  detail: 'It helps us decide how much trail gear to suggest for early spring.',
  choices: ['Yes, this spring', 'Not sure yet', 'No'],
}

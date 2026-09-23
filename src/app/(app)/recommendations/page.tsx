import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Recommendations' }

/** Placeholder until this area is built. */
export default function RecommendationsPage() {
  return (
    <Placeholder
      eyebrow='Recommendations'
      title='Nothing to recommend yet.'
      lead='Every buying suggestion, with the reason and the evidence behind it.'
      body='Once your sales are connected, each recommendation will show what to order, why, and the history behind the number. You decide; we never order for you.'
    />
  )
}

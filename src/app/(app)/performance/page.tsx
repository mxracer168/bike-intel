import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Performance' }

/** Placeholder until this area is built. */
export default function PerformancePage() {
  return (
    <Placeholder
      eyebrow='Performance'
      title='Not enough history yet.'
      lead='How your buying decisions worked out.'
      body='Over time this will show how close your orders came to what you actually sold, where stock ran short and where it sat too long.'
    />
  )
}

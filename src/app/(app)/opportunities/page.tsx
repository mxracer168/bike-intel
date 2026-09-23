import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Opportunities' }

/** Placeholder until this area is built. */
export default function OpportunitiesPage() {
  return (
    <Placeholder
      eyebrow='Opportunities'
      title='Nothing to point out yet.'
      lead='Things worth your attention beyond this week’s reorders.'
      body='Categories that are growing, programs that fit your store, and stock that could be put to better use.'
    />
  )
}

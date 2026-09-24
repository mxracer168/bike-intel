import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Programs' }

/** Placeholder until this area is built. */
export default function ProgramsPage() {
  return (
    <Placeholder
      title="No programs yet."
      body="Upload a booking or preseason program you’ve received, or open one a supplier has published, and see what it means for your store before you commit."
    />
  )
}

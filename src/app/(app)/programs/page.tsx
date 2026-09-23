import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Programs' }

/** Placeholder until this area is built. */
export default function ProgramsPage() {
  return (
    <Placeholder
      eyebrow='Programs'
      title='No programs yet.'
      lead='Booking, preseason and promotional programs from your suppliers.'
      body='You’ll be able to upload a program you’ve received, or open one a supplier has published, and see what it means for your business before you commit.'
    />
  )
}

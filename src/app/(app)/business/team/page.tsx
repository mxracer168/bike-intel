import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Team' }

/** Placeholder until this area is built. */
export default function TeamPage() {
  return (
    <Placeholder
      eyebrow='Team'
      title='Your team will appear here.'
      lead='The people who work in this business with you.'
      body='Inviting teammates, and deciding who can approve orders, comes later.'
    />
  )
}

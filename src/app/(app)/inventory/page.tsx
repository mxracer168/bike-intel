import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Inventory' }

/** Placeholder until this area is built. */
export default function InventoryPage() {
  return (
    <Placeholder
      eyebrow='Inventory'
      title='No inventory to show yet.'
      lead='What you have on hand at each location, and how long it will last.'
      body='Once your point-of-sale system is connected, you’ll see stock by location, in plain terms like “about 3 weeks left”.'
    />
  )
}

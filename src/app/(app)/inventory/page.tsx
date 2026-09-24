import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Inventory' }

/** Placeholder until this area is built. */
export default function InventoryPage() {
  return (
    <Placeholder
      title="No inventory to show yet."
      body="Once your point-of-sale system is connected, you’ll see stock at each location and how long it will last."
    />
  )
}

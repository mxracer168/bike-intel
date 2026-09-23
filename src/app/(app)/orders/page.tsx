import type { Metadata } from 'next'
import { Placeholder } from '@/features/placeholder/Placeholder'

export const metadata: Metadata = { title: 'Orders' }

/** Placeholder until this area is built. */
export default function OrdersPage() {
  return (
    <Placeholder
      eyebrow='Orders'
      title='No orders yet.'
      lead='Orders you build here, from draft to sent.'
      body='When you’re ready to buy, we’ll prepare the order from the recommendations you accept. You review it, change anything, and approve it.'
    />
  )
}

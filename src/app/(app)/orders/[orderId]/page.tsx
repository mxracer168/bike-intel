import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { findDemoOrder } from '@/demo/orders'
import { OrderReview } from '@/features/orders/OrderReview'
import { requireOrganization } from '@/server/session'
import { ExampleMarker } from '@/ui/Example'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Proposed order' }

/** One supplier's proposed order. Example data only until orders are built. */
export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireOrganization()
  const { orderId } = await params
  const order = isDemoPreviewEnabled() ? findDemoOrder(orderId) : undefined
  if (!order) notFound()

  return (
    <Page>
      <OrderReview order={order} example eyebrow={<><Link href="/orders">Orders</Link><ExampleMarker /></>} />
    </Page>
  )
}

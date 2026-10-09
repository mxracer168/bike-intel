import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoHandoff, findDemoOrder } from '@/demo/orders'
import { OrderReview } from '@/features/orders/OrderReview'
import { completeWeekStarts } from '@/features/orders/why'
import { requireOrganization } from '@/server/session'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Proposed order' }

/** One supplier's proposed order. Example data only until orders are built. */
export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ handoff?: string | string[]; line?: string | string[] }>
}) {
  await requireOrganization()
  const { orderId } = await params
  const found = isDemoPreviewEnabled() ? findDemoOrder(orderId) : undefined
  if (!found) notFound()
  // Example review only: ?handoff=a|b|c|d shows each combination of supplier and POS connections.
  const { handoff: handoffParam, line } = await searchParams
  const handoff = demoHandoff(handoffParam)
  const order = handoff ? { ...found, handoff } : found

  return (
    <Page>
      <OrderReview order={order} openLine={typeof line === 'string' ? line : undefined} example weekStarts={completeWeekStarts(12, new Date())} backHref="/orders" />
    </Page>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoProductImage } from '@/demo/catalog'
import { demoHandoff, findDemoOrder, withDemoCash } from '@/demo/orders'
import { OrderReview } from '@/features/orders/OrderReview'
import { StartedOrder } from '@/features/orders/StartedOrder'
import { completeWeekStarts, currentWeekStart } from '@/features/orders/why'
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
  // An order started from the Catalog: kept in the browser (example only).
  if (isDemoPreviewEnabled() && /^draft-[a-z0-9-]{1,60}$/.test(orderId)) return <Page><StartedOrder id={orderId} /></Page>
  const found = isDemoPreviewEnabled() ? findDemoOrder(orderId) : undefined
  if (!found) notFound()
  // Example review only: ?handoff=a|b|c|d shows each combination of supplier and POS connections.
  const { handoff: handoffParam, line } = await searchParams
  const handoff = demoHandoff(handoffParam)
  const order = withDemoCash(handoff ? { ...found, handoff } : found, currentWeekStart(new Date()))
  const images = Object.fromEntries(order.lines.map((l) => [l.id, demoProductImage(l.product)]))

  return (
    <Page>
      <OrderReview order={order} images={images} openLine={typeof line === 'string' ? line : undefined} example weekStarts={completeWeekStarts(12, new Date())} backHref="/orders" />
    </Page>
  )
}

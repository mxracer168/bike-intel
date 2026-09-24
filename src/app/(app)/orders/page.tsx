import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoOrders } from '@/demo/orders'
import { OrderList } from '@/features/orders/OrderList'
import { summarizeOrder } from '@/features/orders/summarize'
import styles from '@/features/orders/Orders.module.css'
import { Placeholder } from '@/features/placeholder/Placeholder'
import { ExampleMarker } from '@/ui/Example'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Orders' }

export default function OrdersPage() {
  if (!isDemoPreviewEnabled()) {
    return (
      <Placeholder
        title="No orders yet."
        body="When it’s time to buy, we’ll propose an order for each supplier. You review it, change anything, and approve it."
      />
    )
  }
  const orders = demoOrders.map(summarizeOrder)
  return (
    <Page>
      <header className={styles.head}>
        <p className={styles.eyebrow}><ExampleMarker /></p>
        <h1 className={styles.title}>{orders.length} proposed orders</h1>
      </header>
      <OrderList orders={orders} label="Proposed orders" />
    </Page>
  )
}

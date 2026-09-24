import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoOrders, demoWork } from '@/demo/orders'
import { listLocations } from '@/domain/location/list'
import { OrderList } from '@/features/orders/OrderList'
import { summarizeOrder } from '@/features/orders/summarize'
import styles from '@/features/orders/Orders.module.css'
import { formatToday } from '@/features/today/formatToday'
import { WorkList } from '@/features/work/WorkList'
import { requireOrganization } from '@/server/session'
import { ExampleMarker } from '@/ui/Example'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

const numberWords = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

function headline(orders: number) {
  if (orders === 0) return 'Nothing needs your attention yet.'
  const n = orders < numberWords.length ? numberWords[orders]!.toLowerCase() : String(orders)
  return orders === 1 ? 'We found one order worth working on.' : `We found ${n} orders worth working on.`
}

/** What deserves attention today: orders at supplier level first, then everything else. */
export default async function TodayPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  const today = formatToday(locations[0]?.timezone)
  const demo = isDemoPreviewEnabled()
  const orders = demo ? demoOrders.map(summarizeOrder) : []
  const work = demo ? demoWork : []

  return (
    <Page>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{today}{demo && <ExampleMarker />}</p>
        <h1 className={styles.title}>{headline(orders.length)}</h1>
        {!demo && <p className={styles.lead}>Once your sales are connected, this is where you’ll see what to reorder and anything else worth your time.</p>}
      </header>

      {orders.length > 0 && (
        <section className={styles.section} aria-labelledby="today-orders">
          <h2 id="today-orders" className="visually-hidden">Orders</h2>
          <OrderList orders={orders} label="Proposed orders" />
        </section>
      )}

      {work.length > 0 && (
        <section className={styles.section} aria-labelledby="today-other">
          <h2 id="today-other" className={styles.sectionTitle}>Also today</h2>
          <WorkList items={work} example={demo} />
        </section>
      )}
    </Page>
  )
}

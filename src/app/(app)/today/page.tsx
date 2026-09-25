import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoHealth, demoPriorities } from '@/demo/today'
import { listLocations } from '@/domain/location/list'
import styles from '@/features/orders/Orders.module.css'
import { formatToday } from '@/features/today/formatToday'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import today from '@/features/today/Today.module.css'
import { WeeklyCheckIn } from '@/features/today/WeeklyCheckIn'
import { PriorityList } from '@/features/work/PriorityList'
import { requireOrganization } from '@/server/session'
import { ExampleMarker } from '@/ui/Example'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

/**
 * Today, in three zones: business health (how are we doing?), priorities
 * (what should I work on?) and questions for you (what does the system need
 * from me?). Layout does the explaining; no headline sentence.
 */
export default async function TodayPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  const date = formatToday(locations[0]?.timezone)
  const demo = isDemoPreviewEnabled()
  const health = demo ? demoHealth : []
  const priorities = demo ? demoPriorities : []

  return (
    <Page>
      <header className={styles.head}>
        <h1 className="visually-hidden">Today</h1>
        <p className={styles.eyebrow}>{date}{demo && <ExampleMarker />}</p>
        {!demo && <p className={styles.lead}>Once your sales are connected, this is where you’ll see how the business is doing and what to work on.</p>}
      </header>

      <div className={today.zones}>
        {health.length > 0 && (
          <section aria-labelledby="today-health">
            <h2 id="today-health" className="visually-hidden">Business health</h2>
            <HealthSnapshot metrics={health} />
          </section>
        )}

        {priorities.length > 0 && (
          <section className={today.zone} aria-labelledby="today-priorities">
            <div className={today.zoneHead}>
              <h2 id="today-priorities" className={today.zoneTitle}>Priorities</h2>
              <p className={today.zoneLead}>What deserves your attention today.</p>
            </div>
            <div className={today.priorityPanel}>
              <PriorityList items={priorities} storageKey={`today-order:${organization.id}`} label="Priorities" example={demo} />
            </div>
          </section>
        )}

        <WeeklyCheckIn />
      </div>
    </Page>
  )
}

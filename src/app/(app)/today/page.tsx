import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoHealth, demoPriorities } from '@/demo/today'
import { listLocations } from '@/domain/location/list'
import styles from '@/features/orders/Orders.module.css'
import { formatToday } from '@/features/today/formatToday'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import { WeeklyCheckIn } from '@/features/today/WeeklyCheckIn'
import { WorkList } from '@/features/work/WorkList'
import { requireOrganization } from '@/server/session'
import { ExampleMarker } from '@/ui/Example'
import { Page } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

const numberWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

function headline(count: number) {
  if (count === 0) return 'Nothing needs your attention yet.'
  const n = count < numberWords.length ? numberWords[count]! : String(count)
  const sentence = count === 1 ? 'One thing is worth your time today.' : `${n} things are worth your time today.`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/** Today does two things: a small health snapshot and one ranked list of what to do. */
export default async function TodayPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  const today = formatToday(locations[0]?.timezone)
  const demo = isDemoPreviewEnabled()
  const health = demo ? demoHealth : []
  const priorities = demo ? demoPriorities : []

  return (
    <Page>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{today}{demo && <ExampleMarker />}</p>
        <h1 className={styles.title}>{headline(priorities.length)}</h1>
        {!demo && <p className={styles.lead}>Once your sales are connected, this is where you’ll see what to reorder and anything else worth your time.</p>}
      </header>

      {health.length > 0 && (
        <section aria-labelledby="today-health">
          <h2 id="today-health" className="visually-hidden">This week at a glance</h2>
          <HealthSnapshot metrics={health} />
        </section>
      )}

      {priorities.length > 0 && (
        <section aria-labelledby="today-priorities">
          <h2 id="today-priorities" className="visually-hidden">Priorities</h2>
          <WorkList items={priorities} label="Priorities, most important first" example={demo} />
        </section>
      )}

      <WeeklyCheckIn />
    </Page>
  )
}

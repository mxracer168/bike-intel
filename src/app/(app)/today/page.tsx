import type { Metadata } from 'next'
import Link from 'next/link'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoHealth, demoPriorities } from '@/demo/today'
import { listLocations } from '@/domain/location/list'
import { formatToday } from '@/features/today/formatToday'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import { todaySummary } from '@/features/today/summary'
import today from '@/features/today/Today.module.css'
import { WeeklyCheckIn } from '@/features/today/WeeklyCheckIn'
import { PriorityList } from '@/features/work/PriorityList'
import { requireOrganization } from '@/server/session'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

/** Today keeps the band small: three figures support the priorities, they don't compete with them. */
const TODAY_METRICS = 3

/**
 * Today answers one question: what deserves my attention? A sentence says how
 * much; a band of three health figures says how the business is doing; the
 * priorities, the first one large, say what to work on; the rail says what
 * the system needs from you.
 */
export default async function TodayPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  const date = formatToday(locations[0]?.timezone)
  const demo = isDemoPreviewEnabled()
  const health = demo ? demoHealth.slice(0, TODAY_METRICS) : []
  const priorities = demo ? demoPriorities : []
  const connected = health.length > 0 || priorities.length > 0

  return (
    <Page>
      <PageHeader
        eyebrow={date}
        title="Today"
        lead={connected
          ? todaySummary(priorities.length, health)
          : 'Once your sales are connected, this is where you’ll see how the business is doing and what to work on.'}
      />

      {health.length > 0 && (
        <section aria-labelledby="today-health">
          <h2 id="today-health" className="visually-hidden">Business health</h2>
          <HealthSnapshot metrics={health} variant="panel" />
        </section>
      )}

      <div className={today.columns}>
        {priorities.length > 0 ? (
          <section aria-labelledby="today-priorities">
            <div className={today.zoneHead}>
              <h2 id="today-priorities" className={today.zoneTitle}>Priorities</h2>
              <p className={today.zoneNote}>Ranked for your business</p>
            </div>
            <PriorityList items={priorities} storageKey={`today-order:${organization.id}`} label="Priorities" example={demo} />
          </section>
        ) : <div />}

        <WeeklyCheckIn />
      </div>

      {/* Temporary: a way into the onboarding conversation prototype for demos. Remove with the prototype. */}
      {demo && (
        <p className={today.demoLink}>
          <Link href="/demo/onboarding" className={today.railAction}>Preview the onboarding conversation</Link>
        </p>
      )}
    </Page>
  )
}

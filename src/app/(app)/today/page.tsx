import type { Metadata } from 'next'
import Link from 'next/link'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoOrders } from '@/demo/orders'
import { demoAhead, demoHealth, demoPriorities, demoSync } from '@/demo/today'
import { listLocations } from '@/domain/location/list'
import { summarizeOrder } from '@/features/orders/summarize'
import { Ahead } from '@/features/today/Ahead'
import { CurrentQuestions } from '@/features/today/CurrentQuestions'
import { formatToday } from '@/features/today/formatToday'
import { HealthSnapshot } from '@/features/today/HealthSnapshot'
import { buildPlan } from '@/features/today/plan'
import { ReplenishmentPlan } from '@/features/today/ReplenishmentPlan'
import { todaySummary } from '@/features/today/summary'
import today from '@/features/today/Today.module.css'
import { PriorityList } from '@/features/work/PriorityList'
import { requireOrganization } from '@/server/session'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Today' }

/** Today keeps the band small: three figures support the priorities, they don't compete with them. */
const TODAY_METRICS = 3

/**
 * Today answers one question: what deserves my attention? A sentence says how
 * much and three health figures say how the business is doing. The wide
 * column holds the replenishment plan and the questions worth answering; the
 * narrow one is the ranked queue of what needs attention, then what's ahead.
 */
export default async function TodayPage() {
  const { db, organization } = await requireOrganization()
  const locations = await listLocations(db, organization.id)
  const date = formatToday(locations[0]?.timezone)
  const demo = isDemoPreviewEnabled()
  const health = demo ? demoHealth.slice(0, TODAY_METRICS) : []
  const priorities = demo ? demoPriorities : []
  // The plan is the proposed orders taken together (example orders only, until orders are real).
  const plan = demo ? buildPlan(demoOrders.map(summarizeOrder)) : null
  const ahead = demo ? demoAhead : []
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
        <div className={today.main}>
          {plan && <ReplenishmentPlan plan={plan} href="/orders" freshness={demoSync.state === 'ok' ? demoSync.label.replace('All synced · ', 'Updated ') : undefined} />}
          <CurrentQuestions />
        </div>

        <aside className={today.side} aria-label="What needs attention and what's ahead">
          <section aria-labelledby="today-priorities">
            <div className={today.zoneHead}>
              <h2 id="today-priorities" className={today.zoneTitle}>What needs attention</h2>
              <p className={today.zoneNote}>Prioritized for your business</p>
            </div>
            {priorities.length > 0
              ? <PriorityList items={priorities} storageKey={`today-order:${organization.id}`} label="What needs attention" example={demo} />
              : <p className={today.zoneEmpty}>Nothing needs your attention right now.</p>}
          </section>
          <Ahead items={ahead} />
        </aside>
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

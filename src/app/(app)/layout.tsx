import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoConnections } from '@/demo/connections'
import { demoOrders } from '@/demo/orders'
import { demoSuppliers } from '@/demo/suppliers'
import { demoConversation, demoIntelligenceQuestions, demoSync } from '@/demo/today'
import { loadOpenQuestions } from '@/domain/intelligence/conversation'
import {
  availabilityNotifications, connectionNotifications, deadlineNotifications, type NotificationView,
} from '@/features/notifications/notifications'
import { getOnboardingStatus } from '@/server/session'
import { AppShell, type ShellExtras } from '@/ui/AppShell'
import { SIDEBAR_COOKIE } from '@/ui/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, organization, user, facts, db } = await getOnboardingStatus()
  if (!status.complete || !organization) redirect('/onboarding')
  const demo = isDemoPreviewEnabled()
  // Real questions come from the database; example questions are never saved.
  const questions = (await loadOpenQuestions(db, organization.id)) ?? []
  // Notifications come only from states we can determine. Real orders, connections and
  // programs aren't stored yet, so today every source is example data; questions are added
  // in the browser from the live conversation.
  const notifications: NotificationView[] = demo ? [
    ...connectionNotifications(demoConnections(organization.name)),
    ...availabilityNotifications(demoOrders),
    ...deadlineNotifications(demoSuppliers.map((s) => s.presentation), new Date()),
  ] : []
  const extras: ShellExtras = {
    intelligence: {
      questions,
      exampleQuestions: demo ? demoIntelligenceQuestions : [],
      exampleConversation: demo ? demoConversation : [],
    },
    sync: demo ? demoSync : undefined,
    notifications: { items: notifications, storageKey: `bi:notifications-read:${organization.id}:${user.id}` },
  }
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed'
  return (
    <AppShell
      retailer={{ name: organization.name, locationCount: facts.locationCount }}
      account={{ email: user.email }}
      extras={extras}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </AppShell>
  )
}

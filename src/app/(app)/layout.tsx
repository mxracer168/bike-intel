import { redirect } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoContextQuestions, demoSync } from '@/demo/today'
import { getOnboardingStatus } from '@/server/session'
import { AppShell, type ShellExtras } from '@/ui/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, organization, user, facts } = await getOnboardingStatus()
  if (!status.complete || !organization) redirect('/onboarding')
  // Context gathering and sync status are example-only until they are built.
  const extras: ShellExtras = isDemoPreviewEnabled()
    ? { context: { questions: demoContextQuestions, example: true }, sync: demoSync }
    : { context: null }
  return (
    <AppShell
      retailer={{ name: organization.name, locationCount: facts.locationCount }}
      account={{ email: user.email }}
      extras={extras}
    >
      {children}
    </AppShell>
  )
}

import { redirect } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoIntelligenceQuestions, demoSync } from '@/demo/today'
import { loadOpenQuestions } from '@/domain/intelligence/conversation'
import { getOnboardingStatus } from '@/server/session'
import { AppShell, type ShellExtras } from '@/ui/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, organization, user, facts, db } = await getOnboardingStatus()
  if (!status.complete || !organization) redirect('/onboarding')
  const demo = isDemoPreviewEnabled()
  // Real questions come from the database; example questions are never saved.
  const questions = (await loadOpenQuestions(db, organization.id)) ?? []
  const extras: ShellExtras = {
    intelligence: { questions, exampleQuestions: demo ? demoIntelligenceQuestions : [] },
    sync: demo ? demoSync : undefined,
  }
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

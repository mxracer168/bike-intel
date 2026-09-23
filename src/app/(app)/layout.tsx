import { redirect } from 'next/navigation'
import { getOnboardingStatus } from '@/server/session'
import { AppShell } from '@/ui/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, organization, user, facts } = await getOnboardingStatus()
  if (!status.complete || !organization) redirect('/onboarding')
  return (
    <AppShell
      retailer={{ name: organization.name, locationCount: facts.locationCount }}
      account={{ email: user.email }}
    >
      {children}
    </AppShell>
  )
}

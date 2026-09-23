import { redirect } from 'next/navigation'
import { getOnboardingStatus } from '@/server/session'
import { AppShell } from '@/ui/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, organization, user } = await getOnboardingStatus()
  if (!status.complete || !organization) redirect('/onboarding')
  return <AppShell organizationName={organization.name} email={user.email}>{children}</AppShell>
}

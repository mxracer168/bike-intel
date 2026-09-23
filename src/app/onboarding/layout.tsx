import { signOutAction } from '@/server/actions/auth'
import { requireUser } from '@/server/session'
import { FocusedShell } from '@/ui/AppShell'
import { Button } from '@/ui/Button'
import { Page } from '@/ui/Layout'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser()
  return (
    <FocusedShell
      aside={
        <form action={signOutAction}>
          <Button type="submit" variant="quiet" size="sm">Sign out</Button>
        </form>
      }
    >
      <Page width="narrow">{children}</Page>
    </FocusedShell>
  )
}

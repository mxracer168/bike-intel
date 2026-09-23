import { FocusedShell } from '@/ui/AppShell'
import { Page } from '@/ui/Layout'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <FocusedShell>
      <Page width="narrow">{children}</Page>
    </FocusedShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isDemoPreviewEnabled } from '@/demo/config'
import { papaWheelies } from '@/demo/onboarding'
import { OnboardingCall } from '@/features/onboarding-call/OnboardingCall'
import { openingLine } from '@/features/onboarding-call/script'
import { requireUser } from '@/server/session'
import { FocusedShell } from '@/ui/AppShell'
import styles from '@/features/onboarding-call/OnboardingCall.module.css'

export const metadata: Metadata = { title: 'Getting to know your business' }

/**
 * Prototype of the first conversation with a new retailer (example only, for
 * demonstrations). Signed in, but outside the app's onboarding gate so it can
 * be shown from any account. ?at=start | wrap | end opens at that point.
 */
export default async function OnboardingCallPage({ searchParams }: { searchParams: Promise<{ at?: string | string[] }> }) {
  await requireUser()
  if (!isDemoPreviewEnabled()) notFound()
  const { at } = await searchParams
  return (
    <FocusedShell sub={`Private to ${papaWheelies.retailer}`}
      aside={<Link href="/today" className={styles.later}>Finish later</Link>}>
      <OnboardingCall key={String(at)} script={papaWheelies} initial={openingLine(papaWheelies, at)} example />
    </FocusedShell>
  )
}

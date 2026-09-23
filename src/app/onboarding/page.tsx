import { redirect } from 'next/navigation'
import { getOnboardingStatus } from '@/server/session'

/** Sends the person to the first thing still missing, or into the app. */
export default async function OnboardingIndex() {
  const { status } = await getOnboardingStatus()
  redirect(status.nextStep ? `/onboarding/${status.nextStep}` : '/today')
}

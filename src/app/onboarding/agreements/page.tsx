import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AgreementsForm } from '@/forms/AgreementsForm'
import { getOnboardingStatus } from '@/server/session'
import { PageHeader } from '@/ui/Layout'
import { StepIndicator } from '../StepIndicator'

export const metadata: Metadata = { title: 'Your data, your choice' }

export default async function AgreementsStep() {
  const { status } = await getOnboardingStatus()
  if (status.complete) redirect('/today')
  if (status.nextStep !== 'agreements') redirect('/onboarding')

  return (
    <>
      <StepIndicator current="agreements" />
      <PageHeader title="Your data, your choice." lead="Two quick decisions, recorded separately." />
      <AgreementsForm presentationId={crypto.randomUUID()} />
    </>
  )
}

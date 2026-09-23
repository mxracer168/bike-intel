import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BusinessForm } from '@/forms/BusinessForm'
import { getOnboardingStatus } from '@/server/session'
import { PageHeader } from '@/ui/Layout'
import { StepIndicator } from '../StepIndicator'

export const metadata: Metadata = { title: 'About your business' }

export default async function BusinessStep() {
  const { organization, status } = await getOnboardingStatus()
  if (status.complete) redirect('/today')

  const creating = !organization
  return (
    <>
      <StepIndicator current="business" />
      <PageHeader title="Tell us about your business." lead="Just the basics for now. You can add more detail later." />
      <BusinessForm
        requestId={creating ? crypto.randomUUID() : undefined}
        defaults={{
          name: organization?.name,
          defaultCountry: organization?.defaultCountry ?? undefined,
          legalName: organization?.legalName ?? undefined,
          website: organization?.website ?? undefined,
        }}
      />
    </>
  )
}

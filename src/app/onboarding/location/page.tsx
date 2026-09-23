import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { CountryCode } from '@/domain/reference/countries'
import { LocationForm } from '@/forms/LocationForm'
import { getOnboardingStatus } from '@/server/session'
import { PageHeader } from '@/ui/Layout'
import { StepIndicator } from '../StepIndicator'

export const metadata: Metadata = { title: 'Your first location' }

export default async function LocationStep() {
  const { organization, status, facts } = await getOnboardingStatus()
  if (status.complete) redirect('/today')
  if (!organization || !organization.defaultCountry) redirect('/onboarding/business')
  if (facts.locationCount > 0) redirect('/onboarding')

  return (
    <>
      <StepIndicator current="location" />
      <PageHeader
        title="Where do you sell?"
        lead="Add your store. If you have more stores or a warehouse, you can add them later."
      />
      <LocationForm defaultCountry={organization.defaultCountry as CountryCode} />
    </>
  )
}

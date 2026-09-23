'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { agreements } from '@/content/agreements'
import { recordAgreementDecisions } from '@/domain/agreements/recordDecisions'
import { addLocation } from '@/domain/location/addLocation'
import { locationSchema } from '@/domain/location/schema'
import { createRetailerOrganization } from '@/domain/organization/bootstrap'
import { updateOrganizationProfile } from '@/domain/organization/profile'
import { organizationProfileSchema } from '@/domain/organization/schema'
import { DomainError, validate } from '@/domain/validation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { errorState, readFields, type FormState } from '@/server/forms'
import { requireUser } from '@/server/session'

const uuid = z.uuid()

function failure(values: Record<string, string>, e: unknown): FormState {
  if (e instanceof DomainError) return errorState(values, e.field ? { [e.field]: e.message } : {}, e.field ? undefined : e.message)
  console.error(e)
  return errorState(values, {}, 'Something went wrong on our side. Please try again.')
}

/**
 * Business details. Creates the retailer organization the first time
 * (idempotent per requestId); afterwards updates it. The organization is
 * never taken from the form: it comes from the signed-in user's membership.
 */
export async function saveBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readFields(formData, ['name', 'defaultCountry', 'legalName', 'website', 'requestId'])
  const parsed = validate(organizationProfileSchema, values)
  if (!parsed.ok) return errorState(values, parsed.errors)

  const { db, user, organization } = await requireUser()
  try {
    if (organization) {
      await updateOrganizationProfile(db, organization.id, parsed.value)
    } else {
      const requestId = uuid.safeParse(values.requestId)
      if (!requestId.success) return errorState(values, {}, 'This form expired. Please reload the page and try again.')
      await createRetailerOrganization(createSupabaseAdminClient(), {
        userId: user.id,
        requestId: requestId.data,
        profile: parsed.value,
      })
    }
  } catch (e) {
    return failure(values, e)
  }
  redirect('/onboarding')
}

export async function addLocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readFields(formData, [
    'name', 'locationType', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country', 'timezone',
  ])
  const parsed = validate(locationSchema, values)
  if (!parsed.ok) return errorState(values, parsed.errors)

  const { db, organization } = await requireUser()
  if (!organization) redirect('/onboarding')
  try {
    await addLocation(db, organization.id, parsed.value)
  } catch (e) {
    return failure(values, e)
  }
  redirect('/onboarding')
}

export async function recordAgreementsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readFields(formData, ['industryIntelligence', 'presentationId'])
  const platformTerms = formData.get('platformTerms') === 'accepted'
  const errors: Record<string, string> = {}
  if (!platformTerms) errors.platformTerms = agreements.platformTerms.required
  if (values.industryIntelligence !== 'accepted' && values.industryIntelligence !== 'declined') {
    errors.industryIntelligence = agreements.industryIntelligence.required
  }
  const presentationId = uuid.safeParse(values.presentationId)
  if (!presentationId.success) return errorState(values, {}, 'This form expired. Please reload the page and try again.')
  if (Object.keys(errors).length) return errorState(values, errors)

  const { db, user, organization } = await requireUser()
  if (!organization) redirect('/onboarding')
  try {
    await recordAgreementDecisions(db, {
      organizationId: organization.id,
      userId: user.id,
      presentationId: presentationId.data,
      platformTermsAccepted: true,
      industryIntelligence: values.industryIntelligence as 'accepted' | 'declined',
      context: 'onboarding',
    })
  } catch (e) {
    return failure(values, e)
  }
  redirect('/onboarding')
}

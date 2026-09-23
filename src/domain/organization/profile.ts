import type { Db } from '@/lib/supabase/types'
import { DomainError } from '@/domain/validation'
import type { OrganizationProfile } from './schema'

/** Updates the organization's basic profile as the signed-in user (RLS applies). */
export async function updateOrganizationProfile(db: Db, organizationId: string, profile: OrganizationProfile) {
  const { data, error } = await db
    .from('organization')
    .update({
      name: profile.name,
      default_country: profile.defaultCountry,
      legal_name: profile.legalName ?? null,
      website: profile.website ?? null,
    })
    .eq('id', organizationId)
    .select('id')
  if (error) throw new DomainError('We couldn’t save those details. Please try again.')
  if (!data?.length) throw new DomainError('Only an owner or admin can change these details.')
}

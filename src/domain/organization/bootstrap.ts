import type { Db } from '@/lib/supabase/types'
import { DomainError } from '@/domain/validation'
import type { OrganizationProfile } from './schema'

/**
 * Creates a retailer organization with the user as its owner, in one
 * database transaction. Must be called with the server-only admin client,
 * after the caller has verified the user's identity.
 *
 * requestId makes the call safe to repeat: the same request returns the
 * organization it already created instead of creating another.
 */
export async function createRetailerOrganization(
  admin: Db,
  params: { userId: string; requestId: string; profile: OrganizationProfile },
): Promise<string> {
  const { userId, requestId, profile } = params
  const { data, error } = await admin.rpc('bootstrap_retailer_organization', {
    p_user_id: userId,
    p_request_id: requestId,
    p_name: profile.name,
    p_default_country: profile.defaultCountry,
    p_legal_name: profile.legalName ?? null,
    p_website: profile.website ?? null,
  })
  if (error || !data) {
    throw new DomainError('We couldn’t set up your business just now. Please try again.')
  }
  return data
}

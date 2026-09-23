import type { Db } from '@/lib/supabase/types'
import { DomainError } from '@/domain/validation'
import { locationTypeDefaults, type LocationInput } from './schema'

/** Adds a location to the organization as the signed-in user (RLS applies). */
export async function addLocation(db: Db, organizationId: string, input: LocationInput): Promise<string> {
  const flags = locationTypeDefaults[input.locationType]
  const { data, error } = await db
    .from('location')
    .insert({
      organization_id: organizationId,
      name: input.name,
      location_type: input.locationType,
      ...flags,
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
      postal_code: input.postalCode ?? null,
      country: input.country,
      timezone: input.timezone,
    })
    .select('id')
    .single()
  if (error || !data) throw new DomainError('We couldn’t save this location. Please try again.')
  return data.id
}

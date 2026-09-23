import type { Db } from '@/lib/supabase/types'

export type LocationSummary = {
  id: string
  name: string
  code: string | null
  locationType: 'store' | 'warehouse' | 'office' | 'ship_to'
  sells: boolean
  stocks: boolean
  receives: boolean
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  country: string
  timezone: string
  status: 'active' | 'inactive'
}

/** The organization's locations as the signed-in user may see them (RLS applies). */
export async function listLocations(db: Db, organizationId: string): Promise<LocationSummary[]> {
  const { data, error } = await db
    .from('location')
    .select('id, name, code, location_type, sells, stocks, receives, address_line1, address_line2, city, region, postal_code, country, timezone, status')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    locationType: l.location_type as LocationSummary['locationType'],
    sells: l.sells,
    stocks: l.stocks,
    receives: l.receives,
    addressLine1: l.address_line1,
    addressLine2: l.address_line2,
    city: l.city,
    region: l.region,
    postalCode: l.postal_code,
    country: l.country,
    timezone: l.timezone,
    status: l.status as LocationSummary['status'],
  }))
}

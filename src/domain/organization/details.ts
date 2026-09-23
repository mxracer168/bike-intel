import type { Db } from '@/lib/supabase/types'

export type OrganizationDetails = {
  id: string
  name: string
  legalName: string | null
  website: string | null
  industry: string
  defaultCountry: string | null
  contact: { name: string | null; email: string | null; phone: string | null }
  billing: {
    line1: string | null; line2: string | null; city: string | null
    region: string | null; postalCode: string | null; country: string | null
  }
}

/** The retailer's profile as the signed-in member sees it (RLS applies). */
export async function getOrganizationDetails(db: Db, organizationId: string): Promise<OrganizationDetails | null> {
  const { data, error } = await db
    .from('organization')
    .select('id, name, legal_name, website, industry, default_country, primary_contact_name, primary_contact_email, primary_contact_phone, billing_address_line1, billing_address_line2, billing_city, billing_region, billing_postal_code, billing_country')
    .eq('id', organizationId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    legalName: data.legal_name,
    website: data.website,
    industry: data.industry,
    defaultCountry: data.default_country,
    contact: { name: data.primary_contact_name, email: data.primary_contact_email, phone: data.primary_contact_phone },
    billing: {
      line1: data.billing_address_line1, line2: data.billing_address_line2, city: data.billing_city,
      region: data.billing_region, postalCode: data.billing_postal_code, country: data.billing_country,
    },
  }
}

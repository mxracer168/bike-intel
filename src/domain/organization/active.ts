import type { Db } from '@/lib/supabase/types'

export type ActiveOrganization = {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  defaultCountry: string | null
  legalName: string | null
  website: string | null
}

/**
 * The retailer organization the signed-in user is working in.
 *
 * A person may belong to several organizations. Until an organization
 * switcher exists, this is their earliest active retailer membership.
 * Everything that needs "the current organization" goes through here, so
 * adding a switcher later changes only this function.
 */
export async function resolveActiveOrganization(db: Db, userId: string): Promise<ActiveOrganization | null> {
  const { data: memberships, error } = await db
    .from('membership')
    .select('organization_id, role, created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!memberships?.length) return null

  const { data: orgs, error: orgError } = await db
    .from('organization')
    .select('id, name, kind, default_country, legal_name, website')
    .in('id', memberships.map((m) => m.organization_id))
    .eq('kind', 'retailer')
  if (orgError) throw orgError

  for (const m of memberships) {
    const org = orgs?.find((o) => o.id === m.organization_id)
    if (org) {
      return {
        id: org.id,
        name: org.name,
        role: m.role as ActiveOrganization['role'],
        defaultCountry: org.default_country,
        legalName: org.legal_name,
        website: org.website,
      }
    }
  }
  return null
}

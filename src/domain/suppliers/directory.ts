import { z } from 'zod'
import type { Db } from '@/lib/supabase/types'
import type {
  DirectoryEntry, RelationshipView, SupplierPresentation, SupplierSection,
} from '@/features/suppliers/presentation'

/**
 * Supplier-controlled public profile (organization.public_profile, jsonb).
 * Parsed leniently: unknown keys are ignored, bad values dropped. The shape
 * lives in code only so it can evolve without a migration.
 */
const httpUrl = z.string().trim().refine((v) => {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
})
const publicProfile = z.object({
  tagline: z.string().trim().max(160).optional().catch(undefined),
  description: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
  website: httpUrl.optional().catch(undefined),
  brands: z.array(z.string().trim().max(80)).max(60).optional().catch(undefined),
  kind: z.enum(['distributor', 'brand', 'brand_and_distributor']).optional().catch(undefined),
}).catch({})

type Profile = z.infer<typeof publicProfile>

const rank: Record<RelationshipView['status'], number> = { none: 0, inactive: 1, suspended: 1, claimed: 2, verified: 3 }

async function loadSuppliers(db: Db, retailerId: string, supplierId?: string) {
  let orgQuery = db.from('organization').select('id, name, website, public_profile').eq('kind', 'supplier').order('name')
  if (supplierId) orgQuery = orgQuery.eq('id', supplierId)
  const { data: orgs, error } = await orgQuery
  if (error) throw error
  if (!orgs?.length) return []

  const ids = orgs.map((o) => o.id)
  const [{ data: markets, error: mErr }, { data: rels, error: rErr }] = await Promise.all([
    db.from('supplier_market').select('id, supplier_organization_id, name, country, currency, status').in('supplier_organization_id', ids),
    db.from('supplier_relationship').select('supplier_market_id, status, preference').eq('organization_id', retailerId),
  ])
  if (mErr) throw mErr
  if (rErr) throw rErr

  return orgs.map((o) => {
    const profile: Profile = publicProfile.parse(o.public_profile ?? {})
    const own = (markets ?? []).filter((m) => m.supplier_organization_id === o.id && m.status === 'active')
    const ownIds = new Set(own.map((m) => m.id))
    let relationship: RelationshipView = { status: 'none' }
    for (const r of rels ?? []) {
      if (!ownIds.has(r.supplier_market_id)) continue
      const status = r.status as RelationshipView['status']
      if (rank[status] > rank[relationship.status]) {
        relationship = { status, preference: r.preference as RelationshipView['preference'] }
      }
    }
    const website = profile.website ?? (o.website && httpUrl.safeParse(o.website).success ? o.website : undefined)
    return { org: o, profile, markets: own, relationship, website }
  })
}

/** Suppliers in the directory, with the signed-in retailer's own relationship. */
export async function listSupplierDirectory(db: Db, retailerId: string): Promise<DirectoryEntry[]> {
  const rows = await loadSuppliers(db, retailerId)
  return rows.map(({ org, profile, markets, relationship }) => ({
    id: org.id,
    name: org.name,
    tagline: profile.tagline,
    kind: profile.kind,
    countries: [...new Set(markets.map((m) => m.country))],
    relationship,
    example: false,
  }))
}

/** One supplier's page, built from whatever the supplier has provided. */
export async function getSupplier(db: Db, retailerId: string, supplierId: string) {
  const [row] = await loadSuppliers(db, retailerId, supplierId)
  if (!row) return null
  const { org, profile, markets, relationship, website } = row
  const sections: SupplierSection[] = []
  const paragraphs = Array.isArray(profile.description) ? profile.description : profile.description ? [profile.description] : []
  if (paragraphs.length) sections.push({ type: 'about', paragraphs })
  if (profile.brands?.length) sections.push({ type: 'brands', brands: profile.brands })
  const presentation: SupplierPresentation = {
    identity: {
      id: org.id,
      name: org.name,
      tagline: profile.tagline,
      kind: profile.kind,
      website,
      markets: markets.map((m) => ({ country: m.country, name: m.name, currency: m.currency })),
    },
    sections,
  }
  return { presentation, relationship }
}

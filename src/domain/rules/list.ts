import { isMissingTable } from '@/lib/supabase/schema'
import type { Db } from '@/lib/supabase/types'

export type BusinessRule = { id: string; statement: string; createdAt: string; updatedAt: string }

/**
 * The business's active rules, oldest first (RLS applies). Returns null
 * before the business-rules migration (20260927000100) is applied, so the
 * page can leave the section out instead of failing.
 */
export async function listBusinessRules(db: Db, organizationId: string): Promise<BusinessRule[] | null> {
  const { data, error } = await db
    .from('business_rule')
    .select('id, statement, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (isMissingTable(error)) return null
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, statement: r.statement, createdAt: r.created_at, updatedAt: r.updated_at }))
}

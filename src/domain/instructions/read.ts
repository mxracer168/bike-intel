import { isMissingTable } from '@/lib/supabase/schema'
import type { Db } from '@/lib/supabase/types'
import type { InstructionsDoc } from './document'

export type BusinessInstructions = {
  /** null before the first save. */
  version: number | null
  content: InstructionsDoc | null
  isEmpty: boolean
  updatedAt: string | null
}

/**
 * The current business instructions (RLS applies: members see only the
 * current version). Returns null before the migration (20260928000100) is
 * applied, so the page can leave the section out instead of failing.
 */
export async function getBusinessInstructions(db: Db, organizationId: string): Promise<BusinessInstructions | null> {
  const { data, error } = await db
    .from('business_instructions_current')
    .select('version, content, content_text, created_at')
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (isMissingTable(error)) return null
  if (error) throw error
  if (!data) return { version: null, content: null, isEmpty: true, updatedAt: null }
  return {
    version: data.version,
    content: data.content as InstructionsDoc,
    isEmpty: data.content_text.trim() === '',
    updatedAt: data.created_at,
  }
}

export const canEditInstructions = (role: 'owner' | 'admin' | 'member') => role === 'owner' || role === 'admin'

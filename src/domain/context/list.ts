import type { Db } from '@/lib/supabase/types'

export type ContextEntry = {
  id: string
  statement: string
  scopeType: string
  lifespan: 'evergreen' | 'seasonal' | 'temporary'
  source: 'retailer_stated' | 'system_inferred' | 'imported'
  category: string | null
  confidence: number | null
  expiresAt: string | null
  confirmedAt: string | null
  reviewAt: string | null
  /** Learned from the conversation (a message or an attached file). */
  fromConversation: boolean
}

/** Active things we believe about the business (RLS applies). */
export async function listActiveContext(db: Db, organizationId: string): Promise<ContextEntry[]> {
  const { data, error } = await db
    .from('context_item')
    .select('id, statement, scope_type, lifespan, source_type, category, confidence, expires_at, retailer_confirmed_at, review_at, source_message_id, source_document_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((c) => ({
    id: c.id,
    statement: c.statement,
    scopeType: c.scope_type,
    lifespan: c.lifespan as ContextEntry['lifespan'],
    source: c.source_type as ContextEntry['source'],
    category: c.category,
    confidence: c.confidence,
    expiresAt: c.expires_at,
    confirmedAt: c.retailer_confirmed_at,
    reviewAt: c.review_at,
    fromConversation: Boolean(c.source_message_id || c.source_document_id),
  }))
}

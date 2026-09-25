import { isMissingColumn } from '@/lib/supabase/schema'
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

const BASE_COLUMNS = 'id, statement, scope_type, lifespan, source_type, category, confidence, expires_at, retailer_confirmed_at'
/** Added with the intelligence conversation (migration 20260925000100). */
const CONVERSATION_COLUMNS = 'review_at, source_message_id, source_document_id'

type Row = {
  id: string; statement: string; scope_type: string; lifespan: string; source_type: string
  category: string | null; confidence: number | null; expires_at: string | null; retailer_confirmed_at: string | null
  review_at?: string | null; source_message_id?: string | null; source_document_id?: string | null
}

/**
 * Active things we believe about the business (RLS applies). Before the
 * conversation migration is applied, the review date and conversation source
 * don't exist yet; the list still loads without them.
 */
export async function listActiveContext(db: Db, organizationId: string): Promise<ContextEntry[]> {
  const query = (columns: string) => db
    .from('context_item')
    .select(columns)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .overrideTypes<Row[], { merge: false }>()

  let result = await query(`${BASE_COLUMNS}, ${CONVERSATION_COLUMNS}`)
  if (isMissingColumn(result.error)) result = await query(BASE_COLUMNS)
  if (result.error) throw result.error
  return (result.data ?? []).map((c) => ({
    id: c.id,
    statement: c.statement,
    scopeType: c.scope_type,
    lifespan: c.lifespan as ContextEntry['lifespan'],
    source: c.source_type as ContextEntry['source'],
    category: c.category,
    confidence: c.confidence,
    expiresAt: c.expires_at,
    confirmedAt: c.retailer_confirmed_at,
    reviewAt: c.review_at ?? null,
    fromConversation: Boolean(c.source_message_id || c.source_document_id),
  }))
}

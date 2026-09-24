import type { Db } from '@/lib/supabase/types'

/** One entry in the retailer's conversation, shaped for display. */
export type ConversationEntry = {
  id: string
  kind: 'text' | 'question' | 'answer' | 'attachment' | 'check_in'
  author: 'you' | 'teammate' | 'system'
  authorId: string | null
  body: string | null
  createdAt: string
  questionId: string | null
  answerChoice: string | null
  attachment: { id: string; name: string; mime: string | null; size: number | null } | null
  /** For question and answer entries: what was asked. */
  question?: { prompt: string } | null
  /** Example content (development only); never saved. */
  example?: boolean
  /** A plain caveat shown under the entry, e.g. that an answer is illustrative. */
  note?: string
}

export type QuestionState = 'open' | 'answered' | 'deferred' | 'withdrawn'

export type IntelligenceQuestionView = {
  id: string
  prompt: string
  choices: string[]
  status: QuestionState
  answer?: { choice: string | null; body: string | null }
  example?: boolean
}

export type Conversation =
  | { available: true; entries: ConversationEntry[]; questions: IntelligenceQuestionView[] }
  | { available: false }

/** PostgREST/Postgres codes for "that table doesn't exist" (migration not applied yet). */
function missingTable(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

/** How many entries the panel loads. Older history stays stored. */
export const HISTORY_LIMIT = 200

/** The retailer's conversation, oldest first (RLS applies). */
export async function loadConversation(db: Db, organizationId: string, userId: string): Promise<Conversation> {
  const [messages, questions] = await Promise.all([
    db.from('intelligence_message')
      .select('id, kind, author_type, author_user_id, body, created_at, question_id, answer_choice, document_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    loadOpenQuestions(db, organizationId),
  ])
  if (missingTable(messages.error) || questions === null) return { available: false }
  if (messages.error) throw messages.error

  // Quick answers are structured (on the question), not conversation. Older
  // choice-only answer messages, from before that rule, stay stored but unshown.
  const rows = (messages.data ?? []).reverse().filter((m) => m.kind !== 'answer' || Boolean(m.body?.trim()))
  const docIds = rows.map((m) => m.document_id).filter((d): d is string => Boolean(d))
  const docs = new Map<string, { file_name: string; mime_type: string | null; size_bytes: number | null }>()
  if (docIds.length) {
    const { data, error } = await db.from('document').select('id, file_name, mime_type, size_bytes').in('id', docIds)
    if (error) throw error
    for (const d of data ?? []) docs.set(d.id, d)
  }

  const questionIds = [...new Set(rows.map((m) => m.question_id).filter((q): q is string => Boolean(q)))]
  const prompts = new Map<string, string>()
  if (questionIds.length) {
    const { data, error } = await db.from('intelligence_question').select('id, prompt').in('id', questionIds)
    if (error) throw error
    for (const q of data ?? []) prompts.set(q.id, q.prompt)
  }

  const entries: ConversationEntry[] = rows.map((m) => {
    const doc = m.document_id ? docs.get(m.document_id) : undefined
    return {
      id: m.id,
      kind: m.kind as ConversationEntry['kind'],
      author: m.author_type === 'system' ? 'system' : m.author_user_id === userId ? 'you' : 'teammate',
      authorId: m.author_user_id,
      body: m.body,
      createdAt: m.created_at,
      questionId: m.question_id,
      answerChoice: m.answer_choice,
      question: m.question_id ? { prompt: prompts.get(m.question_id) ?? '' } : null,
      attachment: m.document_id
        ? { id: m.document_id, name: doc?.file_name ?? 'File', mime: doc?.mime_type ?? null, size: doc?.size_bytes ?? null }
        : null,
    }
  })
  return { available: true, entries, questions }
}

/** Questions still worth asking, most important first. Null when the table isn't there yet. */
export async function loadOpenQuestions(db: Db, organizationId: string): Promise<IntelligenceQuestionView[] | null> {
  const { data, error } = await db
    .from('intelligence_question')
    .select('id, prompt, choices, status, deferred_until')
    .eq('organization_id', organizationId)
    .in('status', ['open', 'deferred'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10)
  if (missingTable(error)) return null
  if (error) throw error
  const now = Date.now()
  return (data ?? [])
    // Deferred with a date: wait until then. Deferred without one: next check-in.
    .filter((q) => q.status === 'open' || !q.deferred_until || Date.parse(q.deferred_until) <= now)
    .map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: Array.isArray(q.choices) ? q.choices.filter((c): c is string => typeof c === 'string') : [],
      status: q.status as QuestionState,
    }))
}

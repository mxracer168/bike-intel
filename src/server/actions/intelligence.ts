'use server'

import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { attachmentPath, attachmentProblem } from '@/domain/intelligence/attachments'
import { loadConversation, type Conversation, type ConversationEntry } from '@/domain/intelligence/conversation'
import { requireOrganization } from '@/server/session'

/**
 * The retailer's intelligence conversation. The organization always comes
 * from the signed-in user's membership, never from the request; every write
 * runs as the user, so row-level security applies.
 */

type Result<T> = { ok: true; value: T } | { ok: false; message: string }

const SAVE_FAILED = 'That didn’t save. Please try again.'
const uuid = z.uuid()
const surface = z.enum(['panel', 'check_in', 'order']).catch('panel')

export async function loadConversationAction(): Promise<Conversation> {
  const { db, user, organization } = await requireOrganization()
  return loadConversation(db, organization.id, user.id)
}

export async function sendMessageAction(text: string): Promise<Result<ConversationEntry>> {
  const body = z.string().trim().min(1).max(10000).safeParse(text)
  if (!body.success) return { ok: false, message: 'Write something first.' }
  const { db, user, organization } = await requireOrganization()
  const { data, error } = await db
    .from('intelligence_message')
    .insert({ organization_id: organization.id, author_type: 'retailer', author_user_id: user.id, kind: 'text', body: body.data, surface: 'panel' })
    .select('id, created_at')
    .single()
  if (error || !data) {
    console.error(error)
    return { ok: false, message: SAVE_FAILED }
  }
  return {
    ok: true,
    value: {
      id: data.id, kind: 'text', author: 'you', authorId: user.id, body: body.data, createdAt: data.created_at,
      questionId: null, answerChoice: null, attachment: null,
    },
  }
}

/**
 * Stores the original file in the organization's private folder, records it
 * as a document, and adds it to the conversation. Nothing reads the file yet.
 */
export async function uploadAttachmentAction(formData: FormData): Promise<Result<ConversationEntry>> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, message: 'Choose a file to add.' }
  const problem = attachmentProblem(file)
  if (problem) return { ok: false, message: problem }

  const { db, user, organization } = await requireOrganization()
  const documentId = randomUUID()
  const path = attachmentPath(organization.id, documentId, file.name)
  const bytes = new Uint8Array(await file.arrayBuffer())

  const upload = await db.storage.from('documents').upload(path, bytes, { contentType: file.type, upsert: false })
  if (upload.error) {
    console.error(upload.error)
    return { ok: false, message: 'That file didn’t upload. Please try again.' }
  }

  const doc = await db.from('document').insert({
    id: documentId,
    organization_id: organization.id,
    storage_bucket: 'documents',
    storage_path: path,
    file_name: file.name.slice(0, 255),
    mime_type: file.type,
    size_bytes: file.size,
    content_sha256: createHash('sha256').update(bytes).digest('hex'),
    document_type: 'conversation_attachment',
    uploaded_by: user.id,
  })
  const message = doc.error ? null : await db
    .from('intelligence_message')
    .insert({ organization_id: organization.id, author_type: 'retailer', author_user_id: user.id, kind: 'attachment', document_id: documentId, surface: 'panel' })
    .select('id, created_at')
    .single()

  if (doc.error || !message || message.error || !message.data) {
    console.error(doc.error ?? message?.error)
    // Don't leave unreferenced bytes behind. (A document row without its
    // message can't happen: the message insert only runs after it.)
    if (doc.error) await db.storage.from('documents').remove([path])
    return { ok: false, message: SAVE_FAILED }
  }
  return {
    ok: true,
    value: {
      id: message.data.id, kind: 'attachment', author: 'you', authorId: user.id, body: null, createdAt: message.data.created_at,
      questionId: null, answerChoice: null,
      attachment: { id: documentId, name: file.name, mime: file.type, size: file.size },
    },
  }
}

/** Answers the one underlying question, wherever it was shown. */
export async function answerQuestionAction(input: {
  questionId: string; choice: string | null; body: string | null; surface?: string
}): Promise<Result<null>> {
  const id = uuid.safeParse(input.questionId)
  if (!id.success) return { ok: false, message: SAVE_FAILED }
  const { db } = await requireOrganization()
  const { error } = await db.rpc('answer_intelligence_question', {
    p_question_id: id.data,
    p_choice: input.choice,
    p_body: input.body?.trim().slice(0, 10000) || null,
    p_surface: surface.parse(input.surface),
  })
  if (error) {
    console.error(error)
    return { ok: false, message: SAVE_FAILED }
  }
  return { ok: true, value: null }
}

/** Until scheduled check-ins exist, "Not now" means "ask again next week". */
const DEFER_DAYS = 7

/** "Not now": set the question aside until the next weekly check-in. */
export async function deferQuestionAction(questionId: string): Promise<Result<null>> {
  const id = uuid.safeParse(questionId)
  if (!id.success) return { ok: false, message: SAVE_FAILED }
  const { db, organization } = await requireOrganization()
  const { error } = await db
    .from('intelligence_question')
    .update({ status: 'deferred', deferred_until: new Date(Date.now() + DEFER_DAYS * 86400000).toISOString() })
    .eq('id', id.data)
    .eq('organization_id', organization.id)
    .eq('status', 'open')
  if (error) {
    console.error(error)
    return { ok: false, message: SAVE_FAILED }
  }
  return { ok: true, value: null }
}

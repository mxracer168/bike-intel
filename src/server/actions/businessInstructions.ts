'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { MAX_TEXT, parseInstructions } from '@/domain/instructions/document'
import { canEditInstructions } from '@/domain/instructions/read'
import type { Json } from '@/lib/supabase/database.types'
import { requireOrganization } from '@/server/session'

/**
 * Saves the business instructions as a new version, as the signed-in user.
 * The database checks they're an owner or admin, numbers the version, records
 * them as its author, and refuses the save if someone else saved since they
 * opened the document (supabase/migrations/20260928000100_business_instructions.sql).
 * The organization always comes from their membership, never from the request.
 * Nothing else in the app writes instructions: AI and background jobs cannot.
 */

type Result = { ok: true } | { ok: false; message: string; conflict?: boolean }

const baseVersion = z.number().int().min(1).nullable()
const MAX_JSON = 1_000_000

/**
 * `document` is the editor's JSON as a string: ProseMirror builds attributes
 * as prototype-less objects, which can't cross a server action as objects.
 */
export async function saveBusinessInstructionsAction(document: string, basedOn: number | null): Promise<Result> {
  const base = baseVersion.safeParse(basedOn)
  if (typeof document !== 'string' || document.length > MAX_JSON || !base.success) {
    return { ok: false, message: 'That didn’t save. Please reload and try again.' }
  }

  let parsed: ReturnType<typeof parseInstructions>
  try {
    parsed = parseInstructions(JSON.parse(document))
  } catch (e) {
    console.error('Business instructions rejected:', e instanceof Error ? e.message : e)
    return { ok: false, message: `That didn’t save. Instructions can be up to ${MAX_TEXT.toLocaleString('en-US')} characters of text.` }
  }

  const { db, organization } = await requireOrganization()
  if (!canEditInstructions(organization.role)) {
    return { ok: false, message: 'Only owners and admins can change the business instructions.' }
  }

  const { error } = await db.from('business_instructions_version').insert({
    organization_id: organization.id,
    based_on_version: base.data,
    content: parsed.content as Json,
    content_text: parsed.text,
  })
  if (error?.code === '40001' || error?.code === '23505') {
    return {
      ok: false,
      conflict: true,
      message: 'Someone else saved changes while you were editing. Copy anything you want to keep, then reload to see their version.',
    }
  }
  if (error) {
    console.error(error)
    return { ok: false, message: 'That didn’t save. Please try again.' }
  }
  revalidatePath('/business/profile')
  return { ok: true }
}

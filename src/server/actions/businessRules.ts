'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { canManageRules, ruleStatement } from '@/domain/rules/schema'
import { requireOrganization } from '@/server/session'

/**
 * Business rules: decisions only an owner or admin makes. Every write runs as
 * the signed-in user, so the database checks their role and records them as
 * the author (supabase/migrations/20260927000100_business_rules.sql). The
 * organization always comes from their membership, never from the request.
 * Nothing else in the app writes rules: AI and background jobs cannot.
 */

type Result = { ok: true } | { ok: false; message: string }

const NOT_ALLOWED = 'Only owners and admins can change business rules.'
const SAVE_FAILED = 'That didn’t save. Please try again.'
const GONE = 'That rule has already changed. Refresh to see the latest.'
const uuid = z.uuid()

async function manager() {
  const ctx = await requireOrganization()
  return canManageRules(ctx.organization.role) ? ctx : null
}

function done(): Result {
  revalidatePath('/business/profile')
  return { ok: true }
}

export async function addBusinessRuleAction(text: string): Promise<Result> {
  const statement = ruleStatement.safeParse(text)
  if (!statement.success) return { ok: false, message: statement.error.issues[0]?.message ?? SAVE_FAILED }
  const ctx = await manager()
  if (!ctx) return { ok: false, message: NOT_ALLOWED }
  const { error } = await ctx.db.from('business_rule').insert({ organization_id: ctx.organization.id, statement: statement.data })
  if (error) {
    console.error(error)
    return { ok: false, message: SAVE_FAILED }
  }
  return done()
}

export async function editBusinessRuleAction(id: string, text: string): Promise<Result> {
  const statement = ruleStatement.safeParse(text)
  if (!statement.success) return { ok: false, message: statement.error.issues[0]?.message ?? SAVE_FAILED }
  if (!uuid.safeParse(id).success) return { ok: false, message: GONE }
  const ctx = await manager()
  if (!ctx) return { ok: false, message: NOT_ALLOWED }
  const { data, error } = await ctx.db
    .from('business_rule')
    .update({ statement: statement.data })
    .eq('id', id)
    .eq('organization_id', ctx.organization.id)
    .eq('status', 'active')
    .select('id')
  if (error) {
    console.error(error)
    return { ok: false, message: SAVE_FAILED }
  }
  return data?.length ? done() : { ok: false, message: GONE }
}

export async function stopBusinessRuleAction(id: string): Promise<Result> {
  if (!uuid.safeParse(id).success) return { ok: false, message: GONE }
  const ctx = await manager()
  if (!ctx) return { ok: false, message: NOT_ALLOWED }
  const { data, error } = await ctx.db
    .from('business_rule')
    .update({ status: 'stopped' })
    .eq('id', id)
    .eq('organization_id', ctx.organization.id)
    .eq('status', 'active')
    .select('id')
  if (error) {
    console.error(error)
    return { ok: false, message: SAVE_FAILED }
  }
  return data?.length ? done() : { ok: false, message: GONE }
}

import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { resolveActiveOrganization } from '@/domain/organization/active'
import { computeOnboardingStatus, loadOnboardingFacts } from '@/domain/onboarding/status'
import { createSupabaseServerClient, getSignedInUser } from '@/lib/supabase/server'

/** The signed-in user and their active organization, once per request. */
export const getSessionContext = cache(async () => {
  const db = await createSupabaseServerClient()
  const user = await getSignedInUser(db)
  if (!user) return { db, user: null, organization: null } as const
  const organization = await resolveActiveOrganization(db, user.id)
  return { db, user, organization } as const
})

export async function requireUser() {
  const ctx = await getSessionContext()
  if (!ctx.user) redirect('/sign-in')
  return { ...ctx, user: ctx.user }
}

export const getOnboardingStatus = cache(async () => {
  const ctx = await requireUser()
  const facts = await loadOnboardingFacts(ctx.db, ctx.organization)
  return { ...ctx, status: computeOnboardingStatus(facts), facts }
})

/** Signed-in user with a retailer organization; otherwise sends them to onboarding. */
export async function requireOrganization() {
  const ctx = await requireUser()
  if (!ctx.organization) redirect('/onboarding')
  return { ...ctx, organization: ctx.organization }
}

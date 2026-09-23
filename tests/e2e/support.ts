import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/supabase/database.types'

function need(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`E2E needs ${name} (from \`supabase status -o env\`).`)
  return v
}

export const e2eEnv = {
  get url() {
    const url = need('NEXT_PUBLIC_SUPABASE_URL')
    // Safety: automated accounts must never be created in the live project.
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) {
      throw new Error(`Refusing to run E2E against ${url}: only a local Supabase stack is allowed.`)
    }
    return url
  },
  get publishableKey() { return need('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') },
  get secretKey() { return need('SUPABASE_SECRET_KEY') },
  get mailpitUrl() { return (process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:54324').replace(/\/$/, '') },
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

export function adminClient() {
  return createClient<Database>(e2eEnv.url, e2eEnv.secretKey, noSession)
}

/** A client acting as a real signed-in user, exactly like browser code could. */
export async function userClient(email: string, password: string) {
  const client = createClient<Database>(e2eEnv.url, e2eEnv.publishableKey, noSession)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw error ?? new Error('sign-in failed')
  return { client, userId: data.user.id }
}

export const PASSWORD = 'correct-horse-battery-staple'

export function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

export async function createConfirmedUser(email: string) {
  const { data, error } = await adminClient().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  return data.user.id
}

/** Reads the confirmation link from the local stack's mail catcher. */
export async function confirmationLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${e2eEnv.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    if (search.ok) {
      const { messages } = (await search.json()) as { messages?: { ID: string }[] }
      const id = messages?.[0]?.ID
      if (id) {
        const msg = (await (await fetch(`${e2eEnv.mailpitUrl}/api/v1/message/${id}`)).json()) as { HTML?: string; Text?: string }
        const match = (msg.HTML ?? msg.Text ?? '').match(/href="([^"]*(?:auth\/confirm|auth\/v1\/verify)[^"]*)"/)
        if (match?.[1]) return match[1].replace(/&amp;/g, '&')
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No confirmation email for ${email}`)
}

export async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function completeBusiness(page: Page, name: string) {
  await expect(page).toHaveURL(/\/onboarding\/business$/)
  await page.getByLabel('Business name').fill(name)
  await page.getByLabel('Country').selectOption({ label: 'United States' })
  await page.getByRole('button', { name: 'Continue' }).click()
}

export async function completeLocation(page: Page, name: string) {
  await expect(page).toHaveURL(/\/onboarding\/location$/)
  await page.getByLabel('Location name').fill(name)
  await page.getByLabel('Time zone').selectOption({ label: 'Mountain' })
  await page.getByRole('button', { name: 'Save location' }).click()
}

export async function completeAgreements(page: Page, industry: 'accepted' | 'declined') {
  await expect(page).toHaveURL(/\/onboarding\/agreements$/)
  await page.getByLabel('I agree to the platform terms.').check()
  await page.getByRole('radio', { name: industry === 'accepted' ? 'Yes, include my business' : 'No, keep it out' }).check()
  await page.getByRole('button', { name: 'Finish setup' }).click()
  await expect(page).toHaveURL(/\/today$/)
}

export async function organizationFor(userId: string) {
  const admin = adminClient()
  const { data, error } = await admin.from('membership').select('organization_id, role').eq('user_id', userId)
  if (error) throw error
  return data
}

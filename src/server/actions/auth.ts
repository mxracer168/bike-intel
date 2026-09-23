'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { publicEnv } from '@/lib/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/domain/auth/password'
import { validate } from '@/domain/validation'
import { errorState, readFields, type FormState } from '@/server/forms'

const credentialsSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password.'),
})

const signUpSchema = credentialsSchema.extend({
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`).max(MAX_PASSWORD_LENGTH, `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`),
})

function authMessage(code: string | undefined): string {
  switch (code) {
    case 'invalid_credentials':
      return 'That email and password don’t match.'
    case 'email_not_confirmed':
      return 'Please confirm your email first. The link is in your inbox.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts just now. Please wait a few minutes and try again.'
    case 'weak_password':
      return 'Please choose a stronger password.'
    default:
      return 'Something went wrong on our side. Please try again.'
  }
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readFields(formData, ['email'])
  const parsed = validate(signUpSchema, { email: values.email, password: formData.get('password') })
  if (!parsed.ok) return errorState(values, parsed.errors)

  const db = await createSupabaseServerClient()
  const { error } = await db.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/onboarding` },
  })
  if (error) return errorState(values, {}, authMessage(error.code))
  // Same response whether or not the address already has an account.
  redirect(`/check-email?email=${encodeURIComponent(parsed.value.email)}`)
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readFields(formData, ['email'])
  const parsed = validate(credentialsSchema, { email: values.email, password: formData.get('password') })
  if (!parsed.ok) return errorState(values, parsed.errors)

  const db = await createSupabaseServerClient()
  const { error } = await db.auth.signInWithPassword(parsed.value)
  if (error) return errorState(values, {}, authMessage(error.code))
  redirect('/')
}

export async function signOutAction() {
  const db = await createSupabaseServerClient()
  await db.auth.signOut()
  redirect('/sign-in')
}

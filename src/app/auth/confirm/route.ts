import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const OTP_TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

/** Only same-site relative paths, to avoid open redirects. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/onboarding'
}

/**
 * Email confirmation callback. Supports both link formats:
 *  - token_hash + type (recommended email template; works on any device)
 *  - code (Supabase default template; same browser that signed up)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const next = safeNext(url.searchParams.get('next'))
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const code = url.searchParams.get('code')

  const db = await createSupabaseServerClient()
  let ok = false
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error
  } else if (code) {
    ok = !(await db.auth.exchangeCodeForSession(code)).error
  }

  const target = url.clone()
  target.search = ''
  target.pathname = ok ? next : '/sign-in'
  if (!ok) target.searchParams.set('notice', 'link-expired')
  return NextResponse.redirect(target)
}

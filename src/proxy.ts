import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/check-email', '/auth/']
const AUTH_PAGES = ['/sign-in', '/sign-up']

function redirectTo(request: NextRequest, sessionResponse: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  // Keep any cookies the session refresh just set.
  for (const cookie of sessionResponse.cookies.getAll()) redirect.cookies.set(cookie)
  return redirect
}

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p))
}

/**
 * Session refresh + signed-in gate. Onboarding completeness is checked in
 * the app and onboarding layouts (it needs database reads).
 */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (!signedIn && !isPublic(pathname)) return redirectTo(request, response, '/sign-in')
  if (signedIn && AUTH_PAGES.includes(pathname)) return redirectTo(request, response, '/')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
}

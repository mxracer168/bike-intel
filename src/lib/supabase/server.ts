import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'
import type { Db } from './types'

export type { Db }

/**
 * Supabase client acting as the signed-in user (publishable key + session
 * cookie). Row-level security applies to every query made with it.
 */
export async function createSupabaseServerClient(): Promise<Db> {
  const cookieStore = await cookies()
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Server Components cannot set cookies; the proxy refreshes sessions.
        }
      },
    },
  })
}

/** The verified signed-in user, or null. Verified with the Auth server. */
export async function getSignedInUser(db: Db) {
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? '' }
}

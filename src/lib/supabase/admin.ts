import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Service-role client. Bypasses row-level security.
 *
 * Used ONLY for operations the database restricts to the server (currently:
 * organization bootstrap). The `server-only` import makes the build fail if
 * any browser code imports this module.
 */
export function createSupabaseAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error('Missing environment variable SUPABASE_SECRET_KEY. See .env.example.')
  return createClient<Database>(publicEnv.supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

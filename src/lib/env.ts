/**
 * Browser-safe configuration. Values are inlined at build time, so only
 * NEXT_PUBLIC_* variables may appear here. The secret key is read in
 * lib/supabase/admin.ts only.
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`)
  return value
}

export const publicEnv = {
  get supabaseUrl() { return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL) },
  get supabasePublishableKey() { return required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) },
  get siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '') },
}

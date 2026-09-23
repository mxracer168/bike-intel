import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** A Supabase client typed with our schema (user-scoped or admin). */
export type Db = SupabaseClient<Database>

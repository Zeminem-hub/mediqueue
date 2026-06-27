// The single Supabase client for the whole app, built with the public
// "anon" key only. Every read/write it makes is subject to the RLS policies
// in supabase/migrations/0001_init.sql — there is no privileged access here.
// Privileged operations (inviting/deleting staff) live in supabase/functions/
// and use the service-role key, which never reaches the browser.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

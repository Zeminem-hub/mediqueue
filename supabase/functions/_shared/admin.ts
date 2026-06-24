import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase Edge Function secrets.')

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function requireReceptionist(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Authentication is required.')

  const supabase = adminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) throw new Error('Invalid session.')

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userData.user.id)
    .eq('role', 'receptionist')
    .eq('is_active', true)
    .maybeSingle()

  if (profileError || !profile?.clinic_id) throw new Error('Not authorized.')
  return { supabase, receptionist: profile }
}

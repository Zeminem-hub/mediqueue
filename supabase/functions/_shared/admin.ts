import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// The browser sends a CORS preflight (OPTIONS) before every functions.invoke
// call, and expects these headers on every actual response too. Without
// them the browser blocks the request before our code even runs, which
// supabase-js surfaces as the unhelpful "Failed to send a request to the
// Edge Function" — handleCors()/json() below are what fix that.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Call this first in every function's Deno.serve handler. Returns a
// Response for OPTIONS preflight requests, or null to continue handling.
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

// Small JSON response helper so every function returns a consistent shape,
// with CORS headers attached so the browser actually accepts the response.
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// A Supabase client authenticated as the service role. This is the ONLY
// place in the codebase that touches `auth.admin.*` (inviting/deleting auth
// users) — the browser never has this key, only the Edge Function runtime
// does.
//
// On projects using Supabase's newer "publishable/secret" key system, the
// platform-auto-injected SUPABASE_SERVICE_ROLE_KEY does not reliably carry
// bypass-RLS privileges the way the legacy service_role JWT does. So we
// prefer an explicitly-set secret (PROJECT_SERVICE_ROLE_KEY — get this from
// Supabase dashboard -> Project Settings -> API -> "Legacy anon,
// service_role API keys" tab -> service_role, then
// `supabase secrets set PROJECT_SERVICE_ROLE_KEY=...`) and fall back to the
// auto-injected one only if that custom secret isn't set.
export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('PROJECT_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase Edge Function secrets.')

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Resolves the caller's own `users` row from their bearer token, regardless
// of role. Throws if there's no valid session.
async function requireCaller(req: Request) {
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
    .eq('is_active', true)
    .maybeSingle()

  if (profileError || !profile) throw new Error('Not authorized.')
  return { supabase, caller: profile }
}

// Caller must be an active admin (global access, no clinic scoping).
export async function requireAdmin(req: Request) {
  const { supabase, caller } = await requireCaller(req)
  if (caller.role !== 'admin') throw new Error('Only admin can perform this action.')
  return { supabase, caller }
}

// Caller must be an active admin OR the receptionist of `clinicId`. Used by
// invite-staff when inviting a doctor (either role may do this) but NOT when
// inviting a receptionist (admin only — checked separately by the caller).
export async function requireAdminOrReceptionistOfClinic(req: Request, clinicId: string) {
  const { supabase, caller } = await requireCaller(req)
  const isAdmin = caller.role === 'admin'
  const isClinicReceptionist = caller.role === 'receptionist' && caller.clinic_id === clinicId && caller.is_active
  if (!isAdmin && !isClinicReceptionist) throw new Error('Not authorized.')
  return { supabase, caller, isAdmin }
}

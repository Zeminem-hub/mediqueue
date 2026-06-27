import { supabase } from '../lib/supabase'

function genericStaffError() {
  return new Error('Unable to sign in with those credentials.')
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase()
  if (['doctor', 'dr', 'physician'].includes(value)) return 'doctor'
  if ([
    'receptionist',
    'receiptionist',
    'recepitonist',
    'recepitonit',
    'reception',
    'frontdesk',
    'front_desk',
    'staff',
  ].includes(value)) return 'receptionist'
  if (value === 'patient') return 'patient'
  if (['admin', 'administrator', 'owner'].includes(value)) return 'admin'
  return value || null
}

function normalizeProfile(row, user) {
  if (!row) return null

  return {
    ...row,
    id: row.id || row.user_id || user?.id,
    email: row.email || user?.email || '',
    role: normalizeRole(row.role || row.user_role || row.account_type),
    is_active: row.is_active ?? row.active ?? true,
    clinic_id: row.clinic_id || row.clinicId || null,
  }
}

async function getProfileFrom(tableName, userId, user) {
  const byId = await supabase
    .from(tableName)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!byId.error && byId.data) return normalizeProfile(byId.data, user)
  if (byId.error && !['PGRST116', 'PGRST205', '42P01'].includes(byId.error.code)) throw byId.error

  const byUserId = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!byUserId.error && byUserId.data) return normalizeProfile(byUserId.data, user)
  if (byUserId.error && !['PGRST116', 'PGRST205', '42P01', '42703'].includes(byUserId.error.code)) throw byUserId.error

  return null
}

export async function getAppProfile(userId) {
  if (!userId) return null

  const { data: { user } } = await supabase.auth.getUser()
  const usersProfile = await getProfileFrom('users', userId, user)
  if (usersProfile) return usersProfile

  return getProfileFrom('profiles', userId, user)
}

export async function signUpPatientEmail({ email, password, name, age }) {
  if (!name?.trim()) throw new Error('Full name is required.')
  if (!age || Number(age) < 1 || Number(age) > 120) throw new Error('Enter a valid age.')
  if (!email?.trim()) throw new Error('Email is required.')
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')

  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
  if (error) throw error
  return data
}

export async function signInPatientEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('Incorrect email or password.')
  return data
}

export async function signInStaff({ email, password, expectedRole }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw genericStaffError()

  // Doctor/receptionist/admin accounts only ever exist via the invite-staff
  // Edge Function. Accepting the invite link confirms the email in the same
  // step, so an unconfirmed email here means the user hasn't finished setup.
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut()
    throw new Error('Please finish setting up your account from the invite email before signing in.')
  }

  const profile = await getAppProfile(data.user?.id)
  if (!profile?.is_active || profile.role !== expectedRole) {
    await supabase.auth.signOut()
    throw new Error(`This account is not active as a ${expectedRole}.`)
  }

  return { ...data, profile }
}

export async function signOut() {
  await supabase.auth.signOut()
}

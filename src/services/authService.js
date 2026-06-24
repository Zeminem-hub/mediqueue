import { supabase } from '../lib/supabase'
import { normalizeIndianPhone } from '../lib/phone'

function genericStaffError() {
  return new Error('Unable to sign in with those credentials.')
}

export async function getAppProfile(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function sendPatientOtp(phone) {
  const normalizedPhone = normalizeIndianPhone(phone)
  if (!normalizedPhone) throw new Error('Enter a valid 10-digit Indian mobile number.')

  const { data, error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone })
  if (error) throw error
  return { data, phone: normalizedPhone }
}

export async function verifyPatientOtp({ phone, token }) {
  const normalizedPhone = normalizeIndianPhone(phone)
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token,
    type: 'sms',
  })

  if (error) throw error
  return data
}

export async function signInStaff({ email, password, expectedRole }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw genericStaffError()

  const profile = await getAppProfile(data.user?.id)
  if (!profile?.is_active || profile.role !== expectedRole) {
    await supabase.auth.signOut()
    throw genericStaffError()
  }

  return { ...data, profile }
}

export async function signOut() {
  await supabase.auth.signOut()
}

import { supabase } from '../lib/supabase'

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
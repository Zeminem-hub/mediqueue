// A patient's own profile. Unlike staff accounts, patients write these rows
// directly (no Edge Function) — the "patient self-registers" / "patient
// manages own profile" RLS policies in 0001_init.sql only let a patient
// touch the row matching their own auth.uid(), so this is safe even though
// it's a plain table upsert.
import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

export async function upsertPatientProfileEmail({ name, age }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      role: 'patient',
      email: user.email,
      is_active: true
    }, { onConflict: 'id' })

  throwIfError(userError)

  const { data, error } = await supabase
    .from('patients')
    .upsert({
      user_id: user.id,
      name: name.trim(),
      age: Number(age),
      is_walk_in: false
    }, { onConflict: 'user_id' })
    .select()
    .single()

  throwIfError(error)
  return data
}

export async function getOwnPatient() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  throwIfError(error)
  return data
}
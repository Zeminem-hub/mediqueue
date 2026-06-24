import { supabase } from '../lib/supabase'
import { normalizeIndianPhone } from '../lib/phone'

const PENDING_PATIENT_KEY = 'mediqueue_pending_patient'

function throwIfError(error) {
  if (error) throw error
}

export function savePendingPatientRegistration({ name, age, phone }) {
  const normalizedPhone = normalizeIndianPhone(phone)
  const parsedAge = Number(age)

  if (!name?.trim()) throw new Error('Full name is required.')
  if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
    throw new Error('Enter an age between 1 and 120.')
  }
  if (!normalizedPhone) throw new Error('Enter a valid 10-digit Indian mobile number.')

  const pending = { name: name.trim(), age: parsedAge, phone: normalizedPhone }
  sessionStorage.setItem(PENDING_PATIENT_KEY, JSON.stringify(pending))
  return pending
}

export function getPendingPatientRegistration() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_PATIENT_KEY) || 'null')
  } catch {
    sessionStorage.removeItem(PENDING_PATIENT_KEY)
    return null
  }
}

export function clearPendingPatientRegistration() {
  sessionStorage.removeItem(PENDING_PATIENT_KEY)
}

export async function upsertPatientProfile({ name, age, phone }) {
  const { data, error } = await supabase.rpc('upsert_patient_profile', {
    p_name: name,
    p_age: Number(age),
    p_phone_number: normalizeIndianPhone(phone),
  })

  throwIfError(error)
  return data
}

export async function getOwnPatient() {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  throwIfError(error)
  return data
}

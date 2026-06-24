import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

export async function createDoctorAccount(payload) {
  const { data, error } = await supabase.functions.invoke('create-doctor', { body: payload })
  throwIfError(error)
  return data
}

export async function resetDoctorPassword({ doctorId, temporaryPassword }) {
  const { data, error } = await supabase.functions.invoke('reset-doctor-password', {
    body: { doctorId, temporaryPassword },
  })
  throwIfError(error)
  return data
}

export async function disableDoctor(doctorId) {
  const { data, error } = await supabase.functions.invoke('disable-doctor', {
    body: { doctorId },
  })
  throwIfError(error)
  return data
}

export async function enableDoctor(doctorId) {
  const { data, error } = await supabase.functions.invoke('disable-doctor', {
    body: { doctorId, isActive: true },
  })
  throwIfError(error)
  return data
}

export async function editDoctorAccount({ doctorId, name, specialization }) {
  const { data, error } = await supabase.functions.invoke('update-doctor', {
    body: { doctorId, name, specialization },
  })
  throwIfError(error)
  return data
}

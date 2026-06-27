// Staff lifecycle: inviting doctors/receptionists, enabling/disabling/deleting
// them, and the admin-only clinic management RPCs. Used by both the
// Receptionist dashboard (doctors only, own clinic) and the Admin dashboard
// (doctors, receptionists, and clinics, anywhere) — the server-side
// authorization check in each Edge Function/RPC decides what's actually
// allowed for the caller.
import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

// supabase-js is supposed to keep the Functions client's Authorization
// header in sync with the current session automatically, but we pass it
// explicitly here too — every Edge Function checks this exact header to
// know who's calling, so we don't want that to depend on internal SDK sync
// timing. Without a fresh access token here, the function sees the wrong
// (or no) caller and replies "Not authorized."
async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Sends a Supabase invite email. The recipient sets their own password by
// clicking the link, which also confirms their email — see
// supabase/functions/invite-staff for the server-side authorization rules.
export async function inviteStaff({ role, name, email, clinicId, specialization }) {
  const { data, error } = await supabase.functions.invoke('invite-staff', {
    body: { role, name, email, clinicId, specialization },
    headers: await authHeader(),
  })
  throwIfError(error)
  return data
}

export async function disableStaff({ targetRole, targetId }) {
  const { data, error } = await supabase.functions.invoke('manage-staff', {
    body: { action: 'disable', targetRole, targetId },
    headers: await authHeader(),
  })
  throwIfError(error)
  return data
}

export async function enableStaff({ targetRole, targetId }) {
  const { data, error } = await supabase.functions.invoke('manage-staff', {
    body: { action: 'enable', targetRole, targetId },
    headers: await authHeader(),
  })
  throwIfError(error)
  return data
}

export async function deleteStaff({ targetRole, targetId }) {
  const { data, error } = await supabase.functions.invoke('manage-staff', {
    body: { action: 'delete', targetRole, targetId },
    headers: await authHeader(),
  })
  throwIfError(error)
  return data
}

export async function updateDoctorDetails({ doctorId, name, specialization }) {
  const { data, error } = await supabase.rpc('admin_update_doctor', {
    p_doctor_id: doctorId,
    p_name: name,
    p_specialization: specialization,
  })
  throwIfError(error)
  return data
}

export async function setDoctorActive({ doctorId, isActive }) {
  const { error } = await supabase.rpc('admin_set_doctor_active', {
    p_doctor_id: doctorId,
    p_is_active: isActive,
  })
  throwIfError(error)
}

// --- Admin-only clinic management -------------------------------------------

export async function listAllClinics() {
  const { data, error } = await supabase.from('clinics').select('*').order('name')
  throwIfError(error)
  return data || []
}

export async function createClinic(name) {
  const { data, error } = await supabase.rpc('admin_create_clinic', { p_name: name })
  throwIfError(error)
  return data
}

export async function setClinicActive({ clinicId, isActive }) {
  const { error } = await supabase.rpc('admin_set_clinic_active', {
    p_clinic_id: clinicId,
    p_is_active: isActive,
  })
  throwIfError(error)
}

export async function listReceptionists() {
  const { data, error } = await supabase
    .from('users')
    .select('*, clinics(name)')
    .eq('role', 'receptionist')
    .order('email')
  throwIfError(error)
  return data || []
}

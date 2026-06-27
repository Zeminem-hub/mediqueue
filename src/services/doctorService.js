// Doctor reads. listDoctors(clinicId) is used two ways: the receptionist
// dashboard always passes its own clinic_id (RLS + the UI both keep them
// scoped to one clinic), while the admin dashboard calls it with no
// argument to see every doctor across every clinic.
import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

export async function listDoctors(clinicId) {
  let query = supabase.from('doctors').select('*').order('name')
  if (clinicId) query = query.eq('clinic_id', clinicId)

  const { data, error } = await query
  throwIfError(error)
  return data || []
}

export async function getDoctor(doctorId) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', doctorId)
    .maybeSingle()

  throwIfError(error)
  return data
}

export async function listDoctorsWithQueueSummary(clinicId) {
  const { data, error } = await supabase.rpc('list_doctors_with_queue_summary', {
    p_clinic_id: clinicId,
  })

  throwIfError(error)
  return data || []
}

export async function getOwnDoctor() {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle()

  throwIfError(error)
  return data
}

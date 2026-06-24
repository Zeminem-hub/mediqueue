import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

export async function getClinics() {
  const { data, error } = await supabase.from('clinics').select('*').order('name')
  throwIfError(error)
  return data || []
}

export async function getClinic(clinicId) {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .maybeSingle()
  throwIfError(error)
  return data
}

export async function getDoctors(clinicId) {
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

export async function getQueueForDoctor(doctorId) {
  const { data, error } = await supabase
    .from('queues')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: true })
  throwIfError(error)
  return data || []
}

export async function joinQueue(doctorId, patientId) {
  const rpc = await supabase.rpc('join_queue', { p_doctor_id: doctorId })
  if (!rpc.error) return Array.isArray(rpc.data) ? rpc.data[0] : rpc.data

  const payloads = [
    { doctor_id: doctorId, patient_id: patientId, status: 'waiting' },
    { doctor_id: doctorId, user_id: patientId, status: 'waiting' },
  ]

  let lastError = rpc.error
  for (const payload of payloads) {
    const { data, error } = await supabase.from('queues').insert(payload).select().single()
    if (!error) return data
    lastError = error
    if (error.code !== 'PGRST204') break
  }

  throw lastError
}

export async function updateQueueEntry(id, changes) {
  const { data, error } = await supabase
    .from('queues')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data
}

export function subscribeToDoctorQueue(doctorId, onChange) {
  const channel = supabase
    .channel(`queue:${doctorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'queues',
        filter: `doctor_id=eq.${doctorId}`,
      },
      onChange,
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function queueToken(entry, fallback = 0) {
  return entry?.token_number ?? entry?.token ?? entry?.queue_number ?? fallback
}

export function queuePatientName(entry) {
  return entry?.patient_name
    || entry?.profiles?.full_name
    || entry?.patient?.full_name
    || 'Patient'
}

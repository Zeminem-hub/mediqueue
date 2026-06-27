// All queue reads/writes. Every write here calls a Postgres RPC (not a raw
// table insert/update) because token assignment must be atomic and the
// authorization rules ("only this doctor, their clinic's receptionist, or
// admin") are easier to express in SQL than in RLS — see supabase/SCHEMA.md.
import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

export async function getQueueForDoctor(doctorId) {
  const { data, error } = await supabase.rpc('get_queue_for_doctor', {
    p_doctor_id: doctorId,
  })

  throwIfError(error)
  return data || []
}

export async function joinQueue(doctorId) {
  const { data, error } = await supabase.rpc('join_queue', {
    p_doctor_id: doctorId,
  })

  throwIfError(error)
  return Array.isArray(data) ? data[0] : data
}

export async function callNextPatient(doctorId) {
  const { data, error } = await supabase.rpc('call_next_patient', {
    p_doctor_id: doctorId,
  })

  throwIfError(error)
  return Array.isArray(data) ? data[0] || null : data
}

export async function completeCurrentPatient(doctorId) {
  const { error } = await supabase.rpc('complete_current_patient', {
    p_doctor_id: doctorId,
  })

  throwIfError(error)
}

export async function addWalkInPatient({ doctorId, name, age, phone }) {
  const { data, error } = await supabase.rpc('add_walk_in_patient', {
    p_doctor_id: doctorId,
    p_name: name,
    p_age: Number(age),
    p_phone_number: phone || null,
  })

  throwIfError(error)
  return Array.isArray(data) ? data[0] : data
}

export async function removeQueueEntry(queueEntryId) {
  const { error } = await supabase.rpc('remove_queue_entry', {
    p_queue_entry_id: queueEntryId,
  })

  throwIfError(error)
}

// Opens a Supabase Realtime channel for one doctor's queue_entries rows and
// calls onChange on every insert/update/delete, so dashboards/queue boards
// update live instead of polling. The channel name includes today's date so
// it naturally re-subscribes to a fresh channel after midnight.
export function subscribeToDoctorQueue(doctorId, onChange, onStatus = () => {}) {
  if (!doctorId) return () => {}

  const channel = supabase
    .channel(`queue:${doctorId}:${new Date().toISOString().slice(0, 10)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'queue_entries',
        filter: `doctor_id=eq.${doctorId}`,
      },
      onChange,
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus('Live')
      if (status === 'CHANNEL_ERROR') onStatus('Offline')
      if (status === 'TIMED_OUT') onStatus('Reconnecting')
    })

  return () => {
    supabase.removeChannel(channel)
  }
}

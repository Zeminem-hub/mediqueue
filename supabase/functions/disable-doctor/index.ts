import { json, requireReceptionist } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  try {
    const { supabase, receptionist } = await requireReceptionist(req)
    const { doctorId, isActive = false } = await req.json()

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, user_id, clinic_id')
      .eq('id', doctorId)
      .eq('clinic_id', receptionist.clinic_id)
      .maybeSingle()
    if (doctorError || !doctor) throw new Error('Doctor not found.')

    const { error: doctorUpdateError } = await supabase
      .from('doctors')
      .update({ is_active: Boolean(isActive) })
      .eq('id', doctor.id)
    if (doctorUpdateError) throw doctorUpdateError

    const { error: profileUpdateError } = await supabase
      .from('users')
      .update({ is_active: Boolean(isActive) })
      .eq('id', doctor.user_id)
    if (profileUpdateError) throw profileUpdateError

    if (!isActive) {
      await supabase.auth.admin.signOut(doctor.user_id, 'global')
    }

    return json({ success: true })
  } catch (error) {
    return json({ error: error.message || 'Unable to update doctor.' }, 400)
  }
})

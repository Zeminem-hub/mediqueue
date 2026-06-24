import { json, requireReceptionist } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  try {
    const { supabase, receptionist } = await requireReceptionist(req)
    const { doctorId, temporaryPassword } = await req.json()

    if (!doctorId || !temporaryPassword) {
      return json({ error: 'Doctor and temporary password are required.' }, 400)
    }

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, user_id, clinic_id')
      .eq('id', doctorId)
      .eq('clinic_id', receptionist.clinic_id)
      .maybeSingle()
    if (doctorError || !doctor) throw new Error('Doctor not found.')

    const { error: authError } = await supabase.auth.admin.updateUserById(doctor.user_id, {
      password: temporaryPassword,
    })
    if (authError) throw authError

    const { error: profileError } = await supabase
      .from('users')
      .update({ must_change_password: true })
      .eq('id', doctor.user_id)
    if (profileError) throw profileError

    return json({ success: true })
  } catch (error) {
    return json({ error: error.message || 'Unable to reset password.' }, 400)
  }
})

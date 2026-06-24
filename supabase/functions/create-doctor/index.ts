import { json, requireReceptionist } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  try {
    const { supabase, receptionist } = await requireReceptionist(req)
    const { name, specialization, email, temporaryPassword } = await req.json()

    if (!name || !specialization || !email || !temporaryPassword) {
      return json({ error: 'All doctor details are required.' }, 400)
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role: 'doctor' },
    })
    if (authError) throw authError

    const userId = authData.user.id
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        clinic_id: receptionist.clinic_id,
        role: 'doctor',
        email,
        must_change_password: true,
      })

    const { data: doctor, error: doctorError } = profileError
      ? { data: null, error: profileError }
      : await supabase
        .from('doctors')
        .insert({
          clinic_id: receptionist.clinic_id,
          user_id: userId,
          name,
          specialization,
        })
        .select()
        .single()

    if (doctorError) {
      await supabase.auth.admin.deleteUser(userId)
      throw doctorError
    }

    return json({ doctor })
  } catch (error) {
    return json({ error: error.message || 'Unable to create doctor.' }, 400)
  }
})

// Invites a new doctor or receptionist account by email.
//
// Why an Edge Function: creating an `auth.users` row via the invite flow
// requires the service-role key, which the browser must never see. This
// function holds that key, does the role check, sends Supabase's built-in
// invite email (which doubles as email verification — clicking the link both
// confirms the address and lets the user set their password), and writes
// the matching `public.users` (+ `public.doctors`) row.
//
// Authorization:
//   - inviting a doctor   -> caller must be admin, or the receptionist of that clinic
//   - inviting a receptionist -> caller must be admin
import { handleCors, json, requireAdmin, requireAdminOrReceptionistOfClinic } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = await req.json()
    const { role, name, email, clinicId, specialization } = body

    if (!['doctor', 'receptionist'].includes(role)) {
      return json({ error: 'role must be "doctor" or "receptionist".' }, 400)
    }
    if (!name?.trim() || !email?.trim() || !clinicId) {
      return json({ error: 'name, email, and clinicId are required.' }, 400)
    }
    if (role === 'doctor' && !specialization?.trim()) {
      return json({ error: 'specialization is required for doctors.' }, 400)
    }

    const { supabase } = role === 'receptionist'
      ? await requireAdmin(req)
      : await requireAdminOrReceptionistOfClinic(req, clinicId)

    // Sends the Supabase invite email. The link lets the user set their own
    // password; accepting it also marks the email as confirmed, which is
    // what our login flow checks before allowing sign-in.
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email.trim(), {
      data: { role, name: name.trim() },
    })
    if (authError) throw authError

    const userId = authData.user.id

    const { error: profileError } = await supabase
      .from('users')
      .insert({ id: userId, clinic_id: clinicId, role, email: email.trim() })
    if (profileError) {
      await supabase.auth.admin.deleteUser(userId)
      throw profileError
    }

    let doctor = null
    if (role === 'doctor') {
      const { data, error: doctorError } = await supabase
        .from('doctors')
        .insert({ clinic_id: clinicId, user_id: userId, name: name.trim(), specialization: specialization.trim() })
        .select()
        .single()
      if (doctorError) {
        await supabase.auth.admin.deleteUser(userId)
        throw doctorError
      }
      doctor = data
    }

    return json({ userId, doctor })
  } catch (error) {
    return json({ error: error.message || 'Unable to send invite.' }, 400)
  }
})

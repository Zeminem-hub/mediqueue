// Disable, enable, or permanently delete a doctor or receptionist account.
//
// Deleting an `auth.users` row (and therefore their ability to log in at
// all) requires the service-role key, so even though disabling could be done
// with a plain RLS-guarded update, every staff-lifecycle action is routed
// through this one function for consistency and a single audit point.
//
// Authorization:
//   - targetRole = 'doctor'       -> caller must be admin, or the receptionist of that doctor's clinic
//   - targetRole = 'receptionist' -> caller must be admin (receptionists cannot manage other receptionists)
import { adminClient, handleCors, json, requireAdmin, requireAdminOrReceptionistOfClinic } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { action, targetRole, targetId } = await req.json()

    if (!['disable', 'enable', 'delete'].includes(action)) {
      return json({ error: 'action must be "disable", "enable", or "delete".' }, 400)
    }
    if (!['doctor', 'receptionist'].includes(targetRole)) {
      return json({ error: 'targetRole must be "doctor" or "receptionist".' }, 400)
    }
    if (!targetId) {
      return json({ error: 'targetId is required.' }, 400)
    }

    // Resolve which auth user + clinic we're acting on, then check the
    // caller is allowed to act on that specific clinic.
    let userId: string
    let doctorRowId: string | null = null

    if (targetRole === 'doctor') {
      // We don't yet know the doctor's clinic, so look it up with a
      // service-role client first, then check authorization for that clinic.
      const peek = adminClient()
      const { data: doctor, error: doctorError } = await peek
        .from('doctors')
        .select('id, user_id, clinic_id')
        .eq('id', targetId)
        .maybeSingle()
      if (doctorError || !doctor) return json({ error: 'Doctor not found.' }, 404)

      const { supabase } = await requireAdminOrReceptionistOfClinic(req, doctor.clinic_id)
      userId = doctor.user_id
      doctorRowId = doctor.id

      if (action === 'delete') {
        await supabase.from('doctors').delete().eq('id', doctorRowId)
        await supabase.from('users').delete().eq('id', userId)
        await supabase.auth.admin.deleteUser(userId)
        return json({ success: true })
      }

      const isActive = action === 'enable'
      await supabase.from('doctors').update({ is_active: isActive }).eq('id', doctorRowId)
      await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
      if (!isActive) await supabase.auth.admin.signOut(userId, 'global')
      return json({ success: true })
    }

    // targetRole === 'receptionist': admin only.
    const { supabase } = await requireAdmin(req)
    userId = targetId

    if (action === 'delete') {
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return json({ success: true })
    }

    const isActive = action === 'enable'
    await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
    if (!isActive) await supabase.auth.admin.signOut(userId, 'global')
    return json({ success: true })
  } catch (error) {
    return json({ error: error.message || 'Unable to update staff member.' }, 400)
  }
})

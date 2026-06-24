import { json, requireReceptionist } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  try {
    const { supabase, receptionist } = await requireReceptionist(req)
    const { doctorId, name, specialization } = await req.json()

    if (!doctorId || !name || !specialization) {
      return json({ error: 'Doctor name and specialization are required.' }, 400)
    }

    const { data: doctor, error } = await supabase
      .from('doctors')
      .update({ name, specialization })
      .eq('id', doctorId)
      .eq('clinic_id', receptionist.clinic_id)
      .select()
      .single()

    if (error) throw error
    return json({ doctor })
  } catch (error) {
    return json({ error: error.message || 'Unable to update doctor.' }, 400)
  }
})

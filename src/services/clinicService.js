import { supabase } from '../lib/supabase'

function throwIfError(error) {
  if (error) throw error
}

export async function listClinics() {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('is_active', true)
    .order('name')

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

// Best-effort normalization of an Indian mobile number to E.164 (+91...).
// Mirrors public.normalize_phone() in the database so the client can
// validate before submitting instead of round-tripping to find out it's bad.
export function normalizeIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')

  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`
  if (/^\+[1-9]\d{9,14}$/.test(String(value || '').trim())) return String(value).trim()

  return ''
}

export function isValidIndianMobile(value) {
  return Boolean(normalizeIndianPhone(value))
}

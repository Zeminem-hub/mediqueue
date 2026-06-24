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

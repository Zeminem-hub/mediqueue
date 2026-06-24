export function queueToken(entry, fallback = 0) {
  return entry?.token_number ?? fallback
}

export function queuePatientName(entry) {
  return entry?.patient_name || entry?.patients?.name || 'Patient'
}

export function normalizeQueue(rows = []) {
  return [...rows]
    .filter((entry) => !entry.removed_at)
    .sort((a, b) => queueToken(a) - queueToken(b))
    .map((entry, index) => ({ ...entry, displayToken: queueToken(entry, index + 1) }))
}

export function queueStats(rows = []) {
  const normalized = normalizeQueue(rows)
  return {
    rows: normalized,
    current: normalized.find((entry) => entry.status === 'current') || null,
    waiting: normalized.filter((entry) => entry.status === 'waiting'),
    completed: normalized.filter((entry) => entry.status === 'completed'),
  }
}

export function patientsAhead(rows, queueEntryId) {
  const mine = rows.find((entry) => entry.id === queueEntryId)
  if (!mine) return null

  return rows.filter((entry) => (
    entry.token_number < mine.token_number
    && ['waiting', 'current'].includes(entry.status)
  )).length
}

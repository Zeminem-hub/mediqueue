// Presentation helpers shared by every queue view (doctor/receptionist
// dashboards, patient queue board). The server already filters out removed
// entries in get_queue_for_doctor, but normalizeQueue re-filters defensively
// since Realtime payloads can include a just-removed row before a refetch.

export function queueToken(entry, fallback = 0) {
  return entry?.token_number ?? fallback
}

export function queuePatientName(entry) {
  return entry?.patient_name || entry?.patients?.name || 'Patient'
}

// Sorts by token order and assigns a 1-based displayToken, so the UI always
// shows "Token #1, #2, ..." even if real token_numbers have gaps (removed entries).
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

// How many people are still ahead of this patient (waiting or currently
// being seen), used for the "X patients ahead of you" message on QueueBoard.
export function patientsAhead(rows, queueEntryId) {
  const mine = rows.find((entry) => entry.id === queueEntryId)
  if (!mine) return null

  return rows.filter((entry) => (
    entry.token_number < mine.token_number
    && ['waiting', 'current'].includes(entry.status)
  )).length
}

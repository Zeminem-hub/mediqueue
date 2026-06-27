// Step 3: shows the token just assigned by join_queue() before the patient
// moves to the live QueueBoard. Read-only — no further queue actions here.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getClinic } from '../services/clinicService'
import { getDoctor } from '../services/doctorService'
import { getQueueForDoctor } from '../services/queueService'
import { normalizeQueue, patientsAhead, queuePatientName } from '../lib/queue'

export default function QueueConfirmation() {
  const navigate = useNavigate()
  const doctorId = sessionStorage.getItem('selectedDoctorId')
  const clinicId = sessionStorage.getItem('selectedClinicId')
  const queueEntryId = sessionStorage.getItem('queueEntryId')
  const [clinic, setClinic] = useState(null)
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!doctorId || !clinicId || !queueEntryId) {
      navigate('/clinic', { replace: true })
      return
    }

    try {
      const [clinicRow, doctorRow, queueRows] = await Promise.all([
        getClinic(clinicId),
        getDoctor(doctorId),
        getQueueForDoctor(doctorId),
      ])
      setClinic(clinicRow)
      setDoctor(doctorRow)
      setQueue(normalizeQueue(queueRows))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [clinicId, doctorId, navigate, queueEntryId])

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  const myEntry = useMemo(() => queue.find((entry) => entry.id === queueEntryId), [queue, queueEntryId])
  const ahead = patientsAhead(queue, queueEntryId)

  return (
    <AppShell eyebrow="Queue confirmation" title="You're in the queue." subtitle={`${doctor?.name || 'Doctor'} - ${clinic?.name || 'Clinic'}`} compact>
      {error && <div className="notice notice--error">{error}</div>}

      <section className="confirmation-card" aria-busy={loading}>
        <span className="confirmation-icon"><CheckCircle2 size={42} /></span>

        <div>
          <p className="eyebrow">Your Token</p>
          <strong className="confirmation-token">{myEntry ? String(myEntry.token_number).padStart(2, '0') : '--'}</strong>
        </div>

        <div className="confirmation-details">
          <div>
            <span>Patient</span>
            <strong>{myEntry ? queuePatientName(myEntry) : 'Loading...'}</strong>
          </div>
          <div>
            <span>Patients ahead</span>
            <strong>{ahead ?? '--'}</strong>
          </div>
        </div>

        <div className="position-badge confirmation-badge">
          <Clock3 size={17} />
          Queue updates automatically
        </div>

        <button className="button button--primary button--wide" onClick={() => navigate('/queue')} disabled={!myEntry}>
          View Queue Status <ArrowRight size={18} />
        </button>
      </section>
    </AppShell>
  )
}

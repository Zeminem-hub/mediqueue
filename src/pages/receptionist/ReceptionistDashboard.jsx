import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, RefreshCw, Stethoscope, UserRound, Users } from 'lucide-react'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../context/AuthContext'
import {
  getDoctors,
  getQueueForDoctor,
  queuePatientName,
  queueToken,
  subscribeToDoctorQueue,
  updateQueueEntry,
} from '../../services/mediqueueService'

export default function ReceptionistDashboard() {
  const { profile } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [queues, setQueues] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const doctorRows = await getDoctors(profile?.clinic_id)
      const queuePairs = await Promise.all(doctorRows.map(async (doctor) => {
        try {
          return [doctor.id, await getQueueForDoctor(doctor.id)]
        } catch {
          return [doctor.id, []]
        }
      }))
      setDoctors(doctorRows)
      setQueues(Object.fromEntries(queuePairs))
      setSelectedDoctorId((current) => current || doctorRows[0]?.id || '')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  useEffect(() => {
    if (!selectedDoctorId) return undefined
    return subscribeToDoctorQueue(selectedDoctorId, load)
  }, [selectedDoctorId, load])

  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId)
  const selectedQueue = useMemo(() => (queues[selectedDoctorId] || []).map((entry, index) => ({
    ...entry,
    displayToken: queueToken(entry, index + 1),
  })), [queues, selectedDoctorId])
  const allEntries = Object.values(queues).flat()

  async function markAbsent(entry) {
    try {
      await updateQueueEntry(entry.id, { status: 'absent' })
      await load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <AppShell
      eyebrow="Front desk workspace"
      title="Clinic overview"
      subtitle="Monitor every doctor and help the waiting room stay on schedule."
      action={
        <button className="button button--secondary" onClick={load}>
          <RefreshCw size={17} /> Refresh
        </button>
      }
    >
      {error && <div className="notice notice--error">{error}</div>}

      <div className="metric-row metric-row--four">
        <div className="metric">
          <span className="metric-icon metric-icon--blue"><Stethoscope size={19} /></span>
          <div><span>Doctors</span><strong>{doctors.length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--amber"><Clock3 size={19} /></span>
          <div><span>Waiting</span><strong>{allEntries.filter((entry) => entry.status === 'waiting').length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--green"><Check size={19} /></span>
          <div><span>Completed</span><strong>{allEntries.filter((entry) => entry.status === 'completed').length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--purple"><Users size={19} /></span>
          <div><span>Total patients</span><strong>{allEntries.length}</strong></div>
        </div>
      </div>

      <div className="reception-grid">
        <aside className="panel doctor-sidebar">
          <div className="panel-heading">
            <div>
              <h2>Doctors</h2>
              <p>Select a queue to manage.</p>
            </div>
          </div>
          <div className="doctor-switcher">
            {doctors.map((doctor, index) => {
              const doctorQueue = queues[doctor.id] || []
              const waitingCount = doctorQueue.filter((entry) => entry.status === 'waiting').length
              const current = doctorQueue.find((entry) => ['called', 'current', 'in_progress'].includes(entry.status))
              return (
                <button
                  className={selectedDoctorId === doctor.id ? 'active' : ''}
                  key={doctor.id}
                  onClick={() => setSelectedDoctorId(doctor.id)}
                >
                  <span className={`mini-avatar mini-avatar--${index % 3}`}><Stethoscope size={18} /></span>
                  <span>
                    <strong>{doctor.name}</strong>
                    <small>{doctor.specialization}</small>
                    <em>{waitingCount} waiting {current ? `- Now #${queueToken(current)}` : ''}</em>
                  </span>
                </button>
              )
            })}
            {!loading && !doctors.length && <div className="empty-inline">No doctors found.</div>}
          </div>
        </aside>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{selectedDoctor?.name || 'Doctor queue'}</h2>
              <p>{selectedDoctor?.specialization || 'Select a doctor to continue.'}</p>
            </div>
            <span className="count-badge">{selectedQueue.length}</span>
          </div>

          <div className="queue-list">
            {selectedQueue.map((entry) => (
              <div className={`queue-row queue-row--${entry.status}`} key={entry.id}>
                <span className="queue-row-token">{String(entry.displayToken).padStart(2, '0')}</span>
                <span className="patient-avatar patient-avatar--small"><UserRound size={18} /></span>
                <div className="queue-row-person">
                  <strong>{queuePatientName(entry)}</strong>
                  <span>Token #{entry.displayToken}</span>
                </div>
                <span className={`status-pill status-pill--${entry.status}`}>{entry.status || 'waiting'}</span>
                {entry.status === 'waiting' && (
                  <button className="button button--small button--danger-quiet" onClick={() => markAbsent(entry)}>
                    Absent
                  </button>
                )}
              </div>
            ))}
            {!loading && !selectedQueue.length && <div className="empty-inline">This doctor&apos;s queue is empty.</div>}
            {loading && <div className="inline-loader">Loading clinic queues...</div>}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

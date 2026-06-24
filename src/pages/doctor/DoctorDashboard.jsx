import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clock3,
  LogOut,
  Megaphone,
  RefreshCw,
  SkipForward,
  UserRound,
  Users,
} from 'lucide-react'
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

const activeStatuses = ['called', 'current', 'in_progress']

export default function DoctorDashboard() {
  const { profile } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const doctors = await getDoctors(profile?.clinic_id)
      const matchedDoctor = doctors.find((item) => (
        item.id === profile?.doctor_id
        || item.user_id === profile?.id
        || item.profile_id === profile?.id
        || item.name?.toLowerCase() === profile?.full_name?.toLowerCase()
      )) || (doctors.length === 1 ? doctors[0] : null)

      setDoctor(matchedDoctor)
      if (matchedDoctor) {
        setQueue(await getQueueForDoctor(matchedDoctor.id))
      }
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
    if (!doctor?.id) return undefined
    return subscribeToDoctorQueue(doctor.id, load)
  }, [doctor?.id, load])

  const rows = useMemo(() => queue.map((entry, index) => ({
    ...entry,
    displayToken: queueToken(entry, index + 1),
  })), [queue])
  const current = rows.find((entry) => activeStatuses.includes(entry.status))
  const next = rows.find((entry) => entry.status === 'waiting')

  async function changeStatus(entry, status) {
    if (!entry) return
    setWorkingId(entry.id)
    setError('')
    try {
      await updateQueueEntry(entry.id, { status })
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWorkingId('')
    }
  }

  async function callNext() {
    if (current) {
      await changeStatus(current, 'completed')
    }
    const refreshed = current ? await getQueueForDoctor(doctor.id) : queue
    const nextEntry = refreshed.find((entry) => entry.status === 'waiting')
    if (nextEntry) await changeStatus(nextEntry, 'called')
  }

  return (
    <AppShell
      eyebrow={doctor?.specialization || 'Doctor workspace'}
      title={`Good day, ${doctor?.name || profile?.full_name || 'Doctor'}`}
      subtitle="Manage the active consultation and keep the waiting room moving."
      action={
        <button className="button button--secondary" onClick={load}>
          <RefreshCw size={17} /> Refresh
        </button>
      }
    >
      {error && <div className="notice notice--error">{error}</div>}
      {!loading && !doctor && (
        <div className="notice notice--warning">
          Your account is signed in, but it is not linked to a doctor record yet. Ask reception to connect your profile.
        </div>
      )}

      <div className="metric-row metric-row--four">
        <div className="metric">
          <span className="metric-icon metric-icon--blue"><Users size={19} /></span>
          <div><span>Total today</span><strong>{rows.length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--amber"><Clock3 size={19} /></span>
          <div><span>Waiting</span><strong>{rows.filter((entry) => entry.status === 'waiting').length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--green"><Check size={19} /></span>
          <div><span>Completed</span><strong>{rows.filter((entry) => entry.status === 'completed').length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--red"><LogOut size={19} /></span>
          <div><span>Absent</span><strong>{rows.filter((entry) => entry.status === 'absent').length}</strong></div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="current-card">
          <div className="panel-heading panel-heading--dark">
            <div>
              <p className="eyebrow eyebrow--mint">Current consultation</p>
              <h2>{current ? 'Patient in room' : 'Ready for next patient'}</h2>
            </div>
            <span className="live-dot"><span /> Live</span>
          </div>

          <div className="current-token">
            <span>Token</span>
            <strong>{current ? String(current.displayToken).padStart(2, '0') : '--'}</strong>
          </div>
          <div className="current-patient">
            <span className="patient-avatar"><UserRound size={22} /></span>
            <div>
              <strong>{current ? queuePatientName(current) : 'No patient called'}</strong>
              <span>{current ? 'Consultation in progress' : `${rows.filter((entry) => entry.status === 'waiting').length} patients waiting`}</span>
            </div>
          </div>

          <div className="action-stack">
            {current && (
              <>
                <button className="button button--success button--wide" onClick={() => changeStatus(current, 'completed')} disabled={workingId === current.id}>
                  <Check size={18} /> Complete consultation
                </button>
                <button className="button button--secondary-dark button--wide" onClick={() => changeStatus(current, 'absent')} disabled={workingId === current.id}>
                  <SkipForward size={18} /> Mark absent
                </button>
              </>
            )}
            <button className="button button--accent button--wide" onClick={callNext} disabled={!next || Boolean(workingId)}>
              <Megaphone size={18} /> {current ? 'Complete & call next' : 'Call next patient'}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Today&apos;s queue</h2>
              <p>Patients appear in arrival order.</p>
            </div>
            <span className="count-badge">{rows.length}</span>
          </div>

          <div className="queue-list">
            {rows.map((entry) => (
              <div className={`queue-row queue-row--${entry.status}`} key={entry.id}>
                <span className="queue-row-token">{String(entry.displayToken).padStart(2, '0')}</span>
                <div className="queue-row-person">
                  <strong>{queuePatientName(entry)}</strong>
                  <span>Token #{entry.displayToken}</span>
                </div>
                <span className={`status-pill status-pill--${entry.status}`}>{entry.status || 'waiting'}</span>
                {entry.status === 'waiting' && (
                  <button className="button button--small button--secondary" onClick={() => changeStatus(entry, 'called')} disabled={Boolean(current) || Boolean(workingId)}>
                    Call
                  </button>
                )}
              </div>
            ))}
            {!loading && !rows.length && <div className="empty-inline">No patients are in today&apos;s queue.</div>}
            {loading && <div className="inline-loader">Loading queue...</div>}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

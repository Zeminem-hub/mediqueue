// A doctor only ever sees and acts on their own queue — getOwnDoctor() looks
// up the doctors row matching the signed-in user, and every action below is
// scoped to that doctor.id. The RPCs double-check this server-side too.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Megaphone, RefreshCw, UserRound, Users } from 'lucide-react'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../context/AuthContext'
import { getOwnDoctor } from '../../services/doctorService'
import {
  callNextPatient,
  completeCurrentPatient,
  getQueueForDoctor,
  subscribeToDoctorQueue,
} from '../../services/queueService'
import { normalizeQueue, queuePatientName } from '../../lib/queue'

export default function DoctorDashboard() {
  const { profile } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [liveState, setLiveState] = useState('Reconnecting')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const matchedDoctor = doctor || await getOwnDoctor()
      setDoctor(matchedDoctor)
      if (matchedDoctor) setQueue(normalizeQueue(await getQueueForDoctor(matchedDoctor.id)))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [doctor])

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  useEffect(() => {
    if (!doctor?.id) return undefined
    return subscribeToDoctorQueue(doctor.id, load, setLiveState)
  }, [doctor?.id, load])

  const current = useMemo(() => queue.find((entry) => entry.status === 'current'), [queue])
  const next = useMemo(() => queue.find((entry) => entry.status === 'waiting'), [queue])
  const waiting = queue.filter((entry) => entry.status === 'waiting')
  const completed = queue.filter((entry) => entry.status === 'completed')

  async function runAction(actionName, action) {
    setWorking(actionName)
    setError('')
    try {
      await action()
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWorking('')
    }
  }

  return (
    <AppShell
      eyebrow={doctor?.specialization || 'Doctor workspace'}
      title={`Good day, ${doctor?.name || profile?.email || 'Doctor'}`}
      subtitle="Manage the active consultation and keep the waiting room moving."
      action={<button className="button button--secondary" onClick={load}><RefreshCw size={17} /> Refresh</button>}
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
          <div><span>Total today</span><strong>{queue.length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--amber"><Clock3 size={19} /></span>
          <div><span>Waiting</span><strong>{waiting.length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--green"><Check size={19} /></span>
          <div><span>Completed</span><strong>{completed.length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--purple"><Clock3 size={19} /></span>
          <div><span>Current</span><strong>{current?.token_number ?? '--'}</strong></div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="current-card">
          <div className="panel-heading panel-heading--dark">
            <div>
              <p className="eyebrow eyebrow--mint">{liveState}</p>
              <h2>{current ? 'Patient in room' : 'Ready for next patient'}</h2>
            </div>
            <span className="live-dot"><span /> Live</span>
          </div>

          <div className="current-token">
            <span>Token</span>
            <strong>{current ? String(current.token_number).padStart(2, '0') : '--'}</strong>
          </div>
          <div className="current-patient">
            <span className="patient-avatar"><UserRound size={22} /></span>
            <div>
              <strong>{current ? queuePatientName(current) : 'No patient called'}</strong>
              <span>{current ? 'Consultation in progress' : `${waiting.length} patients waiting`}</span>
            </div>
          </div>

          <div className="action-stack">
            <button
              className="button button--success button--wide"
              onClick={() => runAction('complete', () => completeCurrentPatient(doctor.id))}
              disabled={!current || working === 'complete'}
            >
              <Check size={18} /> Mark Patient Completed
            </button>
            <button
              className="button button--accent button--wide"
              onClick={() => runAction('call', () => callNextPatient(doctor.id))}
              disabled={!doctor || (!next && !current) || working === 'call'}
            >
              <Megaphone size={18} /> Call Next Patient
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Today&apos;s queue</h2>
              <p>Patients appear in arrival order.</p>
            </div>
            <span className="count-badge">{queue.length}</span>
          </div>

          <div className="queue-list">
            {queue.map((entry) => (
              <div className={`queue-row queue-row--${entry.status}`} key={entry.id}>
                <span className="queue-row-token">{String(entry.token_number).padStart(2, '0')}</span>
                <div className="queue-row-person">
                  <strong>{queuePatientName(entry)}</strong>
                  <span>Token #{entry.token_number}</span>
                </div>
                <span className={`status-pill status-pill--${entry.status}`}>{entry.status}</span>
              </div>
            ))}
            {!loading && !queue.length && <div className="empty-inline">No patients are in today&apos;s queue.</div>}
            {loading && <div className="inline-loader">Loading queue...</div>}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

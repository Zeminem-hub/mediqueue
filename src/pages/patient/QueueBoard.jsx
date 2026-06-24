import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BellRing, CheckCircle2, Clock3, RefreshCw, UserRound } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../context/AuthContext'
import {
  getDoctor,
  getQueueForDoctor,
  joinQueue,
  queuePatientName,
  queueToken,
  subscribeToDoctorQueue,
} from '../../services/mediqueueService'

const activeStatuses = ['waiting', 'called', 'current', 'in_progress']

export default function QueueBoard() {
  const { doctorId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const loadQueue = useCallback(async () => {
    try {
      const [doctorRow, queueRows] = await Promise.all([getDoctor(doctorId), getQueueForDoctor(doctorId)])
      setDoctor(doctorRow)
      setQueue(queueRows)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadQueue, 0)
    const unsubscribe = subscribeToDoctorQueue(doctorId, loadQueue)

    return () => {
      window.clearTimeout(initialLoad)
      unsubscribe()
    }
  }, [doctorId, loadQueue])

  const orderedQueue = useMemo(() => queue.map((entry, index) => ({
    ...entry,
    displayToken: queueToken(entry, index + 1),
  })), [queue])

  const myEntry = orderedQueue.find((entry) => (
    entry.patient_id === user.id || entry.user_id === user.id
  ))
  const current = orderedQueue.find((entry) => ['called', 'current', 'in_progress'].includes(entry.status))
  const waiting = orderedQueue.filter((entry) => activeStatuses.includes(entry.status))
  const myPosition = myEntry ? waiting.findIndex((entry) => entry.id === myEntry.id) + 1 : null

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      await joinQueue(doctorId, user.id)
      await loadQueue()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <AppShell
      eyebrow="Live patient queue"
      title={doctor?.name || 'Doctor queue'}
      subtitle={doctor?.specialization || 'Queue status updates automatically.'}
      action={
        <button className="button button--secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} /> Back
        </button>
      }
    >
      {error && (
        <div className="notice notice--error">
          <span>{error}</span>
          <button onClick={loadQueue}><RefreshCw size={16} /> Retry</button>
        </div>
      )}

      <section className="queue-hero">
        <div className="queue-hero-main">
          <span className="live-label"><span /> Live queue</span>
          <p>Now serving</p>
          <strong>{current ? String(current.displayToken).padStart(2, '0') : '--'}</strong>
          <span>{current ? queuePatientName(current) : 'Waiting for the doctor to begin'}</span>
        </div>

        <div className="queue-hero-side">
          {myEntry ? (
            <>
              <p>Your token</p>
              <strong>#{String(myEntry.displayToken).padStart(2, '0')}</strong>
              <div className="position-badge">
                <Clock3 size={17} />
                {myPosition > 1 ? `${myPosition - 1} ahead of you` : myPosition === 1 ? 'You are next' : 'Called now'}
              </div>
            </>
          ) : (
            <>
              <BellRing size={27} />
              <h2>Join this queue</h2>
              <p>Receive a token and follow your place live.</p>
              <button className="button button--accent button--wide" onClick={handleJoin} disabled={joining || loading}>
                {joining ? 'Joining...' : 'Get my token'}
              </button>
            </>
          )}
        </div>
      </section>

      <div className="metric-row">
        <div className="metric">
          <span className="metric-icon metric-icon--blue"><UserRound size={19} /></span>
          <div><span>Waiting</span><strong>{waiting.filter((entry) => entry.status === 'waiting').length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--green"><CheckCircle2 size={19} /></span>
          <div><span>Completed</span><strong>{queue.filter((entry) => entry.status === 'completed').length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--amber"><Clock3 size={19} /></span>
          <div><span>Estimated wait</span><strong>{myPosition ? `${Math.max((myPosition - 1) * 8, 0)} min` : '--'}</strong></div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Queue roster</h2>
            <p>Updates appear here as the doctor moves through the queue.</p>
          </div>
          <button className="icon-button" onClick={loadQueue} title="Refresh queue" aria-label="Refresh queue">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="token-grid" aria-busy={loading}>
          {loading && <div className="inline-loader">Loading queue...</div>}
          {!loading && orderedQueue.map((entry) => {
            const isMine = entry.id === myEntry?.id
            const isCurrent = entry.id === current?.id
            return (
              <div
                className={`token ${isMine ? 'token--mine' : ''} ${isCurrent ? 'token--current' : ''} token--${entry.status}`}
                key={entry.id}
              >
                <strong>{String(entry.displayToken).padStart(2, '0')}</strong>
                <span>{isMine ? 'You' : isCurrent ? 'Now' : entry.status || 'Waiting'}</span>
              </div>
            )
          })}
          {!loading && !orderedQueue.length && <div className="empty-inline">The queue is empty. You can be first.</div>}
        </div>
      </section>
    </AppShell>
  )
}

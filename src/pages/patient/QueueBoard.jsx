// Step 4: live queue position for the patient's own token, updated via
// Supabase Realtime (subscribeToDoctorQueue) instead of polling.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, RefreshCw, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { getDoctor } from '../../services/doctorService'
import { getQueueForDoctor, subscribeToDoctorQueue } from '../../services/queueService'
import { normalizeQueue, patientsAhead, queuePatientName } from '../../lib/queue'

export default function QueueBoard() {
  const navigate = useNavigate()
  const doctorId = sessionStorage.getItem('selectedDoctorId')
  const queueEntryId = sessionStorage.getItem('queueEntryId')
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [liveState, setLiveState] = useState('Reconnecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadQueue = useCallback(async () => {
    if (!doctorId || !queueEntryId) {
      navigate('/clinic', { replace: true })
      return
    }

    try {
      const [doctorRow, queueRows] = await Promise.all([getDoctor(doctorId), getQueueForDoctor(doctorId)])
      setDoctor(doctorRow)
      setQueue(normalizeQueue(queueRows))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [doctorId, navigate, queueEntryId])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadQueue, 0)
    const unsubscribe = subscribeToDoctorQueue(doctorId, loadQueue, setLiveState)
    return () => {
      window.clearTimeout(initialLoad)
      unsubscribe()
    }
  }, [doctorId, loadQueue])

  const myEntry = useMemo(() => queue.find((entry) => entry.id === queueEntryId), [queue, queueEntryId])
  const current = queue.find((entry) => entry.status === 'current')
  const waiting = queue.filter((entry) => entry.status === 'waiting')
  const completed = queue.filter((entry) => entry.status === 'completed')
  const ahead = patientsAhead(queue, queueEntryId)

  return (
    <AppShell
      eyebrow="Live patient queue"
      title={doctor?.name || 'Doctor queue'}
      subtitle={doctor?.specialization || 'Queue status updates automatically.'}
      action={<button className="button button--secondary" onClick={() => navigate('/confirmation')}><ArrowLeft size={17} /> Token</button>}
    >
      {error && (
        <div className="notice notice--error">
          <span>{error}</span>
          <button onClick={loadQueue}><RefreshCw size={16} /> Retry</button>
        </div>
      )}

      <section className="queue-hero">
        <div className="queue-hero-main">
          <span className="live-label"><span /> {liveState}</span>
          <p>Now serving</p>
          <strong>{current ? String(current.token_number).padStart(2, '0') : '--'}</strong>
          <span>{current ? queuePatientName(current) : 'Waiting for the doctor to begin'}</span>
        </div>

        <div className="queue-hero-side">
          <p>Your token</p>
          <strong>#{myEntry ? String(myEntry.token_number).padStart(2, '0') : '--'}</strong>
          <div className="position-badge">
            <Clock3 size={17} />
            {ahead == null ? 'Loading position' : ahead > 0 ? `${ahead} ahead of you` : myEntry?.status === 'current' ? 'Now' : 'You are next'}
          </div>
        </div>
      </section>

      <div className="metric-row">
        <div className="metric">
          <span className="metric-icon metric-icon--blue"><UserRound size={19} /></span>
          <div><span>Waiting</span><strong>{waiting.length}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--amber"><Clock3 size={19} /></span>
          <div><span>Current</span><strong>{current?.token_number ?? '--'}</strong></div>
        </div>
        <div className="metric">
          <span className="metric-icon metric-icon--green"><CheckCircle2 size={19} /></span>
          <div><span>Completed</span><strong>{completed.length}</strong></div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Queue roster</h2>
            <p>Tokens update here when the doctor calls the next patient.</p>
          </div>
          <button className="icon-button" onClick={loadQueue} title="Refresh queue" aria-label="Refresh queue">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="token-grid" aria-busy={loading}>
          {loading && <div className="inline-loader">Loading queue...</div>}
          {!loading && queue.map((entry) => {
            const isMine = entry.id === myEntry?.id
            const isCurrent = entry.id === current?.id
            return (
              <div
                className={`token ${isMine ? 'token--mine' : ''} ${isCurrent ? 'token--current' : ''} token--${entry.status}`}
                key={entry.id}
              >
                <strong>{String(entry.token_number).padStart(2, '0')}</strong>
                <span>{isMine && isCurrent ? 'You - Now' : isMine ? 'You' : isCurrent ? 'Now' : entry.status}</span>
              </div>
            )
          })}
          {!loading && !queue.length && <div className="empty-inline">No queue entries yet.</div>}
        </div>
      </section>
    </AppShell>
  )
}

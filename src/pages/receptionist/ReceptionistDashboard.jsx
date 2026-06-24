import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Megaphone, Plus, RefreshCw, Stethoscope, Trash2, UserRound, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../context/AuthContext'
import { disableDoctor, editDoctorAccount, enableDoctor, resetDoctorPassword } from '../../services/adminService'
import { listDoctors } from '../../services/doctorService'
import {
  addWalkInPatient,
  callNextPatient,
  getQueueForDoctor,
  removeQueueEntry,
  subscribeToDoctorQueue,
} from '../../services/queueService'
import { normalizeQueue, queuePatientName } from '../../lib/queue'

export default function ReceptionistDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const clinicId = profile?.clinic_id
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [queues, setQueues] = useState({})
  const [walkIn, setWalkIn] = useState({ name: '', age: '', phone: '' })
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [liveState, setLiveState] = useState('Reconnecting')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const doctorRows = await listDoctors(clinicId)
      const queuePairs = await Promise.all(doctorRows.map(async (doctor) => [
        doctor.id,
        normalizeQueue(await getQueueForDoctor(doctor.id)),
      ]))
      setDoctors(doctorRows)
      setQueues(Object.fromEntries(queuePairs))
      setSelectedDoctorId((current) => current || doctorRows[0]?.id || '')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  useEffect(() => {
    if (!selectedDoctorId) return undefined
    return subscribeToDoctorQueue(selectedDoctorId, load, setLiveState)
  }, [selectedDoctorId, load])

  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId)
  const selectedQueue = useMemo(() => queues[selectedDoctorId] || [], [queues, selectedDoctorId])
  const allEntries = Object.values(queues).flat()
  const selectedCurrent = selectedQueue.find((entry) => entry.status === 'current')
  const selectedWaiting = selectedQueue.filter((entry) => entry.status === 'waiting')

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

  async function handleWalkIn(event) {
    event.preventDefault()
    await runAction('walk-in', async () => {
      await addWalkInPatient({ doctorId: selectedDoctorId, ...walkIn })
      setWalkIn({ name: '', age: '', phone: '' })
      setShowWalkIn(false)
    })
  }

  async function handleEditDoctor(doctor) {
    const name = window.prompt('Doctor name', doctor.name)
    if (!name) return
    const specialization = window.prompt('Specialization', doctor.specialization)
    if (!specialization) return
    await runAction(`edit-${doctor.id}`, () => editDoctorAccount({ doctorId: doctor.id, name, specialization }))
  }

  async function handleResetPassword(doctor) {
    const temporaryPassword = window.prompt(`Temporary password for ${doctor.name}`)
    if (!temporaryPassword) return
    await runAction(`reset-${doctor.id}`, () => resetDoctorPassword({ doctorId: doctor.id, temporaryPassword }))
  }

  async function handleToggleDoctor(doctor) {
    const action = doctor.is_active ? disableDoctor : enableDoctor
    await runAction(`toggle-${doctor.id}`, () => action(doctor.id))
  }

  return (
    <AppShell
      eyebrow="Front desk workspace"
      title="Clinic overview"
      subtitle="Monitor every doctor and help the waiting room stay on schedule."
      action={
        <div className="toolbar-actions">
          <button className="button button--secondary" onClick={load}><RefreshCw size={17} /> Refresh</button>
          <button className="button button--primary" onClick={() => navigate('/create-doctor')}><Plus size={17} /> Create Doctor</button>
        </div>
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
              const current = doctorQueue.find((entry) => entry.status === 'current')
              return (
                <button className={selectedDoctorId === doctor.id ? 'active' : ''} key={doctor.id} onClick={() => setSelectedDoctorId(doctor.id)}>
                  <span className={`mini-avatar mini-avatar--${index % 3}`}><Stethoscope size={18} /></span>
                  <span>
                    <strong>{doctor.name}</strong>
                    <small>{doctor.specialization}</small>
                    <em>{doctor.is_active ? `${waitingCount} waiting ${current ? `- Now #${current.token_number}` : ''}` : 'Disabled'}</em>
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
              <p>{selectedDoctor ? `${selectedDoctor.specialization} - ${liveState}` : 'Select a doctor to continue.'}</p>
            </div>
            <div className="toolbar-actions">
              <button className="button button--secondary" onClick={() => setShowWalkIn((current) => !current)} disabled={!selectedDoctorId}>
                <Plus size={17} /> Walk-in
              </button>
              <button
                className="button button--accent"
                onClick={() => runAction('call-next', () => callNextPatient(selectedDoctorId))}
                disabled={!selectedDoctorId || (!selectedCurrent && !selectedWaiting.length) || working === 'call-next'}
              >
                <Megaphone size={17} /> Call Next
              </button>
            </div>
          </div>

          {showWalkIn && (
            <form className="walkin-form" onSubmit={handleWalkIn}>
              <label className="field">
                <span>Name</span>
                <input value={walkIn.name} onChange={(event) => setWalkIn((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label className="field">
                <span>Age</span>
                <input type="number" min="1" max="120" value={walkIn.age} onChange={(event) => setWalkIn((current) => ({ ...current, age: event.target.value }))} required />
              </label>
              <label className="field">
                <span>Mobile, optional</span>
                <input value={walkIn.phone} onChange={(event) => setWalkIn((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <button className="button button--primary" disabled={working === 'walk-in'}>Add Walk-in</button>
            </form>
          )}

          {selectedDoctor && (
            <div className="doctor-admin-bar">
              <button className="button button--small button--secondary" onClick={() => handleEditDoctor(selectedDoctor)}>
                Edit Doctor
              </button>
              <button className="button button--small button--secondary" onClick={() => handleResetPassword(selectedDoctor)}>
                Reset Password
              </button>
              <button className="button button--small button--danger-quiet" onClick={() => handleToggleDoctor(selectedDoctor)}>
                {selectedDoctor.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          )}

          <div className="queue-list">
            {selectedQueue.map((entry) => (
              <div className={`queue-row queue-row--${entry.status}`} key={entry.id}>
                <span className="queue-row-token">{String(entry.token_number).padStart(2, '0')}</span>
                <span className="patient-avatar patient-avatar--small"><UserRound size={18} /></span>
                <div className="queue-row-person">
                  <strong>{queuePatientName(entry)}</strong>
                  <span>Age {entry.patient_age ?? '--'} - Token #{entry.token_number}</span>
                </div>
                <span className={`status-pill status-pill--${entry.status}`}>{entry.status}</span>
                <button
                  className="button button--small button--danger-quiet"
                  onClick={() => runAction(`remove-${entry.id}`, () => removeQueueEntry(entry.id))}
                  disabled={working === `remove-${entry.id}`}
                >
                  <Trash2 size={15} /> Remove
                </button>
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

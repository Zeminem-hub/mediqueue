// Step 2: pick a doctor within the chosen clinic. Clicking a doctor calls
// join_queue() immediately (via queueService.joinQueue) — there's no
// separate "confirm" step, the token is assigned right here.
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock3, Stethoscope, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { getClinic } from '../../services/clinicService'
import { listDoctorsWithQueueSummary } from '../../services/doctorService'
import { joinQueue } from '../../services/queueService'

export default function DoctorSelect() {
  const navigate = useNavigate()
  const clinicId = sessionStorage.getItem('selectedClinicId')
  const [clinic, setClinic] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningDoctorId, setJoiningDoctorId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clinicId) {
      navigate('/clinic', { replace: true })
      return
    }

    async function load() {
      try {
        const [clinicRow, doctorRows] = await Promise.all([
          getClinic(clinicId),
          listDoctorsWithQueueSummary(clinicId),
        ])
        setClinic(clinicRow)
        setDoctors(doctorRows)
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clinicId, navigate])

  async function handleJoin(doctorId) {
    setJoiningDoctorId(doctorId)
    setError('')
    try {
      const entry = await joinQueue(doctorId)
      sessionStorage.setItem('selectedDoctorId', doctorId)
      sessionStorage.setItem('queueEntryId', entry.id)
      navigate('/confirmation')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setJoiningDoctorId('')
    }
  }

  return (
    <AppShell
      eyebrow={clinic?.name || 'Clinic'}
      title="Select a doctor"
      subtitle="Choose a care team to join their live queue."
      action={<button className="button button--secondary" onClick={() => navigate('/clinic')}><ArrowLeft size={17} /> Clinics</button>}
      compact
    >
      {error && <div className="notice notice--error">{error}</div>}

      <div className="doctor-grid" aria-busy={loading}>
        {loading && [1, 2].map((item) => <div className="doctor-card skeleton" key={item} />)}
        {!loading && doctors.map((doctor, index) => (
          <article className="doctor-card" key={doctor.id}>
            <div className={`doctor-avatar doctor-avatar--${index % 3}`}><Stethoscope size={26} /></div>
            <div className="doctor-card-heading">
              <div>
                <h2>{doctor.name}</h2>
                <p>{doctor.specialization}</p>
              </div>
              <span className="status-pill status-pill--open"><span /> Available</span>
            </div>

            <div className="doctor-stats">
              <div><Users size={18} /><span><strong>{doctor.waiting_patient_count ?? 0}</strong> waiting</span></div>
              <div><Clock3 size={18} /><span><strong>{doctor.current_token_number ?? '--'}</strong> current</span></div>
            </div>

            <button className="button button--primary button--wide" onClick={() => handleJoin(doctor.id)} disabled={joiningDoctorId === doctor.id}>
              {joiningDoctorId === doctor.id ? 'Joining...' : 'Join Queue'} <ArrowRight size={18} />
            </button>
          </article>
        ))}
      </div>

      {!loading && !doctors.length && (
        <div className="empty-state">
          <Stethoscope size={28} />
          <h2>No doctors listed yet</h2>
          <p>This clinic has not added any doctors.</p>
        </div>
      )}
    </AppShell>
  )
}

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock3, Stethoscope, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { getClinic, getDoctors, getQueueForDoctor } from '../../services/mediqueueService'

export default function DoctorSelect() {
  const { clinicId } = useParams()
  const navigate = useNavigate()
  const [clinic, setClinic] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [queueCounts, setQueueCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [clinicRow, doctorRows] = await Promise.all([getClinic(clinicId), getDoctors(clinicId)])
        setClinic(clinicRow)
        setDoctors(doctorRows)

        const counts = await Promise.all(doctorRows.map(async (doctor) => {
          try {
            const queue = await getQueueForDoctor(doctor.id)
            return [doctor.id, queue.filter((entry) => ['waiting', 'called', 'current'].includes(entry.status)).length]
          } catch {
            return [doctor.id, null]
          }
        }))
        setQueueCounts(Object.fromEntries(counts))
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clinicId])

  return (
    <AppShell
      eyebrow={clinic?.name || 'Clinic'}
      title="Select a doctor"
      subtitle="Choose a care team to join their live queue."
      action={
        <button className="button button--secondary" onClick={() => navigate('/clinics')}>
          <ArrowLeft size={17} /> Clinics
        </button>
      }
      compact
    >
      {error && <div className="notice notice--error">{error}</div>}

      <div className="doctor-grid" aria-busy={loading}>
        {loading && [1, 2].map((item) => <div className="doctor-card skeleton" key={item} />)}
        {!loading && doctors.map((doctor, index) => {
          const waitCount = queueCounts[doctor.id]
          return (
            <article className="doctor-card" key={doctor.id}>
              <div className={`doctor-avatar doctor-avatar--${index % 3}`}>
                <Stethoscope size={26} />
              </div>
              <div className="doctor-card-heading">
                <div>
                  <h2>{doctor.name}</h2>
                  <p>{doctor.specialization}</p>
                </div>
                <span className="status-pill status-pill--open"><span /> Available</span>
              </div>

              <div className="doctor-stats">
                <div>
                  <Users size={18} />
                  <span><strong>{waitCount ?? '--'}</strong> waiting</span>
                </div>
                <div>
                  <Clock3 size={18} />
                  <span><strong>{waitCount == null ? '--' : Math.max(waitCount * 8, 5)}</strong> min est.</span>
                </div>
              </div>

              <button className="button button--primary button--wide" onClick={() => navigate(`/queue/${doctor.id}`)}>
                View live queue <ArrowRight size={18} />
              </button>
            </article>
          )
        })}
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

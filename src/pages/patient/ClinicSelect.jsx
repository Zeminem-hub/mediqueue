// Step 1 of the patient flow: pick a clinic. Stores the choice in
// sessionStorage for DoctorSelect/QueueConfirmation/QueueBoard to read —
// there's no global "current booking" state, just this handoff.
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Building2, MapPin, Search, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { listClinics } from '../../services/clinicService'
import { listDoctors } from '../../services/doctorService'

export default function ClinicSelect() {
  const navigate = useNavigate()
  const [clinics, setClinics] = useState([])
  const [doctorCounts, setDoctorCounts] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [clinicRows, doctorRows] = await Promise.all([listClinics(), listDoctors()])
        setClinics(clinicRows)
        setDoctorCounts(doctorRows.reduce((counts, doctor) => ({
          ...counts,
          [doctor.clinic_id]: (counts[doctor.clinic_id] || 0) + 1,
        }), {}))
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const visibleClinics = useMemo(() => clinics.filter((clinic) => (
    clinic.name.toLowerCase().includes(search.toLowerCase())
  )), [clinics, search])

  function selectClinic(clinicId) {
    sessionStorage.setItem('selectedClinicId', clinicId)
    navigate('/doctors')
  }

  return (
    <AppShell
      eyebrow="Patient check-in"
      title="Choose your clinic"
      subtitle="Select a location to see available doctors and live queues."
      compact
    >
      <div className="search-box">
        <Search size={19} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clinics" aria-label="Search clinics" />
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      <div className="selection-list" aria-busy={loading}>
        {loading && [1, 2].map((item) => <div className="selection-card skeleton" key={item} />)}

        {!loading && visibleClinics.map((clinic) => (
          <button className="selection-card" key={clinic.id} onClick={() => selectClinic(clinic.id)}>
            <span className="selection-icon"><Building2 size={24} /></span>
            <span className="selection-content">
              <strong>{clinic.name}</strong>
              <span><MapPin size={15} /> Clinic location</span>
              <span className="availability"><Stethoscope size={15} />{doctorCounts[clinic.id] || 0} doctors available</span>
            </span>
            <span className="selection-arrow"><ArrowRight size={20} /></span>
          </button>
        ))}

        {!loading && !visibleClinics.length && (
          <div className="empty-state">
            <Building2 size={28} />
            <h2>No clinics found</h2>
            <p>Try a different search term.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

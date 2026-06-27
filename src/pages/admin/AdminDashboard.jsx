// The only page that can see/manage every clinic, receptionist, and doctor
// at once. listDoctors() and listReceptionists() are called with no clinic
// filter here (unlike the receptionist dashboard) — that's deliberate and
// only safe because the caller is confirmed to be admin server-side.
import { useCallback, useEffect, useState } from 'react'
import { Building2, Plus, ShieldCheck, Stethoscope, Trash2, UserCog } from 'lucide-react'
import AppShell from '../../components/AppShell'
import InviteStaffForm from '../../components/InviteStaffForm'
import {
  createClinic,
  deleteStaff,
  disableStaff,
  enableStaff,
  listAllClinics,
  listReceptionists,
  setClinicActive,
} from '../../services/staffService'
import { listDoctors } from '../../services/doctorService'

export default function AdminDashboard() {
  const [clinics, setClinics] = useState([])
  const [receptionists, setReceptionists] = useState([])
  const [doctors, setDoctors] = useState([])
  const [newClinicName, setNewClinicName] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [clinicRows, receptionistRows, doctorRows] = await Promise.all([
        listAllClinics(),
        listReceptionists(),
        listDoctors(),
      ])
      setClinics(clinicRows)
      setReceptionists(receptionistRows)
      setDoctors(doctorRows)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

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

  async function handleCreateClinic(event) {
    event.preventDefault()
    if (!newClinicName.trim()) return
    await runAction('create-clinic', async () => {
      await createClinic(newClinicName.trim())
      setNewClinicName('')
    })
  }

  function clinicName(clinicId) {
    return clinics.find((clinic) => clinic.id === clinicId)?.name || 'Unknown clinic'
  }

  return (
    <AppShell
      eyebrow="Admin workspace"
      title="Manage your clinics"
      subtitle="Add clinics, invite receptionists and doctors, and control who has access."
    >
      {error && <div className="notice notice--error">{error}</div>}

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Clinics</h2>
              <p>Every clinic location MediQueue serves.</p>
            </div>
            <span className="auth-icon"><Building2 size={20} /></span>
          </div>

          <form className="walkin-form" onSubmit={handleCreateClinic}>
            <label className="field">
              <span>New clinic name</span>
              <input value={newClinicName} onChange={(event) => setNewClinicName(event.target.value)} placeholder="Downtown Clinic" required />
            </label>
            <button className="button button--primary" disabled={working === 'create-clinic'}>
              <Plus size={16} /> Add Clinic
            </button>
          </form>

          <div className="admin-list">
            {clinics.map((clinic) => (
              <div className="admin-row" key={clinic.id}>
                <div className="admin-row-info">
                  <strong>{clinic.name}</strong>
                  <span className={`status-pill status-pill--${clinic.is_active ? 'open' : 'absent'}`}>
                    {clinic.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  className="button button--small button--secondary"
                  onClick={() => runAction(`clinic-${clinic.id}`, () => setClinicActive({ clinicId: clinic.id, isActive: !clinic.is_active }))}
                  disabled={working === `clinic-${clinic.id}`}
                >
                  {clinic.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
            {!loading && !clinics.length && <div className="empty-inline">No clinics yet. Add the first one above.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Invite Receptionist</h2>
              <p>Admin-only: receptionists cannot invite other receptionists.</p>
            </div>
            <span className="auth-icon"><UserCog size={20} /></span>
          </div>
          <InviteStaffForm role="receptionist" clinics={clinics} onInvited={load} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Invite Doctor</h2>
              <p>Admin can invite a doctor to any clinic.</p>
            </div>
            <span className="auth-icon"><Stethoscope size={20} /></span>
          </div>
          <InviteStaffForm role="doctor" clinics={clinics} onInvited={load} />
        </section>

        <section className="panel admin-panel-wide">
          <div className="panel-heading">
            <div>
              <h2>Receptionists</h2>
              <p>Every receptionist account across all clinics.</p>
            </div>
          </div>
          <div className="admin-list">
            {receptionists.map((receptionist) => (
              <div className="admin-row" key={receptionist.id}>
                <div className="admin-row-info">
                  <strong>{receptionist.email}</strong>
                  <span>{clinicName(receptionist.clinic_id)}</span>
                  <span className={`status-pill status-pill--${receptionist.is_active ? 'open' : 'absent'}`}>
                    {receptionist.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="toolbar-actions">
                  <button
                    className="button button--small button--secondary"
                    onClick={() => runAction(`recep-toggle-${receptionist.id}`, () => (receptionist.is_active
                      ? disableStaff({ targetRole: 'receptionist', targetId: receptionist.id })
                      : enableStaff({ targetRole: 'receptionist', targetId: receptionist.id })))}
                    disabled={working === `recep-toggle-${receptionist.id}`}
                  >
                    {receptionist.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="button button--small button--danger-quiet"
                    onClick={() => {
                      if (!window.confirm(`Permanently delete ${receptionist.email}?`)) return
                      runAction(`recep-delete-${receptionist.id}`, () => deleteStaff({ targetRole: 'receptionist', targetId: receptionist.id }))
                    }}
                    disabled={working === `recep-delete-${receptionist.id}`}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
            {!loading && !receptionists.length && <div className="empty-inline">No receptionists yet.</div>}
          </div>
        </section>

        <section className="panel admin-panel-wide">
          <div className="panel-heading">
            <div>
              <h2>Doctors</h2>
              <p>Every doctor account across all clinics.</p>
            </div>
            <span className="auth-icon"><ShieldCheck size={20} /></span>
          </div>
          <div className="admin-list">
            {doctors.map((doctor) => (
              <div className="admin-row" key={doctor.id}>
                <div className="admin-row-info">
                  <strong>{doctor.name}</strong>
                  <span>{doctor.specialization} - {clinicName(doctor.clinic_id)}</span>
                  <span className={`status-pill status-pill--${doctor.is_active ? 'open' : 'absent'}`}>
                    {doctor.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="toolbar-actions">
                  <button
                    className="button button--small button--secondary"
                    onClick={() => runAction(`doctor-toggle-${doctor.id}`, () => (doctor.is_active
                      ? disableStaff({ targetRole: 'doctor', targetId: doctor.id })
                      : enableStaff({ targetRole: 'doctor', targetId: doctor.id })))}
                    disabled={working === `doctor-toggle-${doctor.id}`}
                  >
                    {doctor.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="button button--small button--danger-quiet"
                    onClick={() => {
                      if (!window.confirm(`Permanently delete Dr. ${doctor.name}?`)) return
                      runAction(`doctor-delete-${doctor.id}`, () => deleteStaff({ targetRole: 'doctor', targetId: doctor.id }))
                    }}
                    disabled={working === `doctor-delete-${doctor.id}`}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
            {!loading && !doctors.length && <div className="empty-inline">No doctors yet.</div>}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

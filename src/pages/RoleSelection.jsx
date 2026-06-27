// Staff entry point reached from PatientLogin's "Login as Doctor or
// Receptionist" link. Just routes to the right login page per role.
import { Activity, ArrowLeft, BriefcaseMedical, ClipboardList, ShieldCheck, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function RoleSelection() {
  const navigate = useNavigate()

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <div className="auth-mobile-brand staff-brand">
          <span className="brand-mark"><Activity size={20} /></span>
          MediQueue
        </div>

        <button className="button button--secondary" type="button" onClick={() => navigate('/')}>
          <ArrowLeft size={17} /> Patient access
        </button>

        <div className="auth-heading staff-heading">
          <span className="auth-icon"><BriefcaseMedical size={22} /></span>
          <div>
            <h2>Staff access</h2>
            <p>Select your clinic role to continue with email and password.</p>
          </div>
        </div>

        <div className="role-choice-grid">
          <button className="selection-card" onClick={() => navigate('/doctor-login')} type="button">
            <span className="selection-icon"><Stethoscope size={24} /></span>
            <span className="selection-content">
              <strong>Doctor</strong>
              <span>Manage your own queue only</span>
            </span>
          </button>

          <button className="selection-card" onClick={() => navigate('/receptionist-login')} type="button">
            <span className="selection-icon"><ClipboardList size={24} /></span>
            <span className="selection-content">
              <strong>Receptionist</strong>
              <span>Administer doctors and queues</span>
            </span>
          </button>

          <button className="selection-card" onClick={() => navigate('/admin-login')} type="button">
            <span className="selection-icon"><ShieldCheck size={24} /></span>
            <span className="selection-content">
              <strong>Admin</strong>
              <span>Manage clinics, receptionists, and doctors</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

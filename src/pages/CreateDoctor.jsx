// Receptionist-facing "invite a doctor" screen. fixedClinicId locks the
// invite to the receptionist's own clinic — InviteStaffForm hides the
// clinic picker entirely when this prop is set.
import { ArrowLeft, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import InviteStaffForm from '../components/InviteStaffForm'
import { useAuth } from '../context/AuthContext'

export default function CreateDoctor() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  return (
    <AppShell
      eyebrow="Doctor administration"
      title="Invite a doctor"
      subtitle="They'll receive an email to set their own password and confirm their account."
      action={<button className="button button--secondary" onClick={() => navigate('/receptionist-dashboard')}><ArrowLeft size={17} /> Dashboard</button>}
      compact
    >
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>Doctor Details</h2>
            <p>Sends an email invite for this clinic.</p>
          </div>
          <span className="auth-icon"><Send size={20} /></span>
        </div>

        <InviteStaffForm
          role="doctor"
          clinics={[]}
          fixedClinicId={profile?.clinic_id}
          onInvited={() => navigate('/receptionist-dashboard')}
        />
      </section>
    </AppShell>
  )
}

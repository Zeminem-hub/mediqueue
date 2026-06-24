import { useState } from 'react'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { createDoctorAccount } from '../services/adminService'

export default function CreateDoctor() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    email: '',
    temporaryPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await createDoctorAccount(formData)
      navigate('/receptionist-dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell
      eyebrow="Doctor administration"
      title="Create doctor account"
      subtitle="Create the Auth user through the receptionist-only Edge Function."
      action={<button className="button button--secondary" onClick={() => navigate('/receptionist-dashboard')}><ArrowLeft size={17} /> Dashboard</button>}
      compact
    >
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>Doctor Details</h2>
            <p>Add a doctor profile and temporary sign-in password.</p>
          </div>
          <span className="auth-icon"><UserPlus size={21} /></span>
        </div>

        <form className="form-stack padded-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Doctor Name</span>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Dr Ahmad Mir" required />
          </label>

          <label className="field">
            <span>Specialization</span>
            <input name="specialization" value={formData.specialization} onChange={handleChange} placeholder="General Medicine" required />
          </label>

          <label className="field">
            <span>Email</span>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="doctor@clinic.com" required />
          </label>

          <label className="field">
            <span>Temporary Password</span>
            <input type="password" name="temporaryPassword" value={formData.temporaryPassword} onChange={handleChange} placeholder="Set a temporary password" minLength="6" required />
          </label>

          {error && <div className="form-message form-message--error">{error}</div>}

          <div className="toolbar-actions">
            <button type="submit" disabled={isSubmitting} className="button button--primary">
              {isSubmitting ? 'Creating...' : 'Create Doctor'}
            </button>
            <button type="button" onClick={() => navigate('/receptionist-dashboard')} className="button button--secondary">
              Cancel
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}

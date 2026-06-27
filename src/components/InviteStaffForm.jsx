import { useState } from 'react'
import { Send } from 'lucide-react'
import { inviteStaff } from '../services/staffService'

// Shared invite form used by both the Admin dashboard (doctors +
// receptionists) and the Receptionist dashboard (doctors only, clinic fixed
// to their own). The actual permission check happens server-side in the
// invite-staff Edge Function — this form just collects the fields it needs.
export default function InviteStaffForm({ role, clinics, fixedClinicId, onInvited }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    clinicId: fixedClinicId || '',
    specialization: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      await inviteStaff({ role, ...formData })
      setSuccess(`Invite sent to ${formData.email}.`)
      setFormData({ name: '', email: '', clinicId: fixedClinicId || '', specialization: '' })
      onInvited?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="form-stack padded-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Full name</span>
        <input name="name" value={formData.name} onChange={handleChange} placeholder={role === 'doctor' ? 'Dr Ahmad Mir' : 'Reception staff name'} required />
      </label>

      <label className="field">
        <span>Email</span>
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={`${role}@clinic.com`} required />
      </label>

      {!fixedClinicId && (
        <label className="field">
          <span>Clinic</span>
          <select name="clinicId" value={formData.clinicId} onChange={handleChange} required>
            <option value="" disabled>Select a clinic</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
            ))}
          </select>
        </label>
      )}

      {role === 'doctor' && (
        <label className="field">
          <span>Specialization</span>
          <input name="specialization" value={formData.specialization} onChange={handleChange} placeholder="General Medicine" required />
        </label>
      )}

      {error && <div className="form-message form-message--error">{error}</div>}
      {success && <div className="form-message form-message--success">{success}</div>}

      <button type="submit" disabled={isSubmitting} className="button button--primary">
        <Send size={16} /> {isSubmitting ? 'Sending invite...' : `Invite ${role}`}
      </button>
    </form>
  )
}

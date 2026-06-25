import { useState } from 'react'
import { Activity, ArrowRight, BriefcaseMedical, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { upsertPatientProfileEmail } from '../services/patientService'

export default function PatientLogin() {
  const navigate = useNavigate()
  const { sendOtp } = useAuth()
  const [formData, setFormData] = useState({ name: '', age: '', phone: '' })
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
      const pending = savePendingPatientRegistration(formData)
      await sendOtp(pending.phone)
      navigate('/otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a className="brand brand--dark" href="/">
          <span className="brand-mark"><Activity size={20} strokeWidth={2.5} /></span>
          <span>MediQueue</span>
        </a>

        <div className="auth-story-copy">
          <p className="eyebrow eyebrow--mint">iQuasar Health queue access</p>
          <h1>Join the clinic queue from your phone.</h1>
          <p>Patients verify by mobile OTP. Doctors and receptionists sign in separately with clinic staff accounts.</p>
        </div>

        <div className="auth-proof">
          <div><Smartphone size={17} /><span>OTP-only patient access</span></div>
          <div><BriefcaseMedical size={17} /><span>Separate staff login</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark"><Activity size={20} /></span>
            MediQueue
          </div>

          <div className="segmented-control" aria-label="Entry flow">
            <button className="active" type="button">Continue as Patient</button>
            <button type="button" onClick={() => navigate('/roles')}>Staff Login</button>
          </div>

          <div className="auth-heading">
            <span className="auth-icon"><Smartphone size={22} /></span>
            <div>
              <h2>Patient registration</h2>
              <p>Enter your details and verify your mobile number before joining a queue.</p>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter patient name"
                autoComplete="name"
                required
              />
            </label>

            <label className="field">
              <span>Age</span>
              <input
                name="age"
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter age"
                required
              />
            </label>

            <label className="field">
              <span>Mobile number</span>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                autoComplete="tel"
                required
              />
            </label>

            {error && <div className="form-message form-message--error">{error}</div>}

            <button className="button button--primary button--wide" disabled={isSubmitting}>
              {isSubmitting ? 'Sending OTP...' : 'Continue as Patient'}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-footnote">
            <button className="link-button" type="button" onClick={() => navigate('/roles')}>
              Login as Doctor or Receptionist
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}

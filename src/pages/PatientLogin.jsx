// The only self-signup form in the app — patients are the one role allowed
// to create their own account (enforced by the "patient self-registers" RLS
// policy, see supabase/SCHEMA.md). Doctors/receptionists/admin never see a
// signup form; they're invited.
import { useState } from 'react'
import { Activity, ArrowRight, BriefcaseMedical, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { upsertPatientProfileEmail } from '../services/patientService'

export default function PatientLogin() {
  const navigate = useNavigate()
  const { registerPatient, loginPatient } = useAuth()
  const [mode, setMode] = useState('signin')
  const [formData, setFormData] = useState({ name: '', age: '', email: '', password: '' })
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
      if (mode === 'signup') {
        await registerPatient(formData)
        await loginPatient({ email: formData.email, password: formData.password })
        await upsertPatientProfileEmail({ name: formData.name, age: formData.age })
      } else {
        await loginPatient({ email: formData.email, password: formData.password })
      }
      navigate('/clinic', { replace: true })
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
          <p className="eyebrow eyebrow--mint">MediQueue patient access</p>
          <h1>Join the clinic queue from your phone.</h1>
          <p>Patients sign in with email. Doctors and receptionists use separate staff login.</p>
        </div>
        <div className="auth-proof">
          <div><Mail size={17} /><span>Email-based patient access</span></div>
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
            <button
              className={mode === 'signin' ? 'active' : ''}
              type="button"
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              className={mode === 'signup' ? 'active' : ''}
              type="button"
              onClick={() => setMode('signup')}
            >
              Register
            </button>
          </div>

          <div className="auth-heading">
            <span className="auth-icon"><Mail size={22} /></span>
            <div>
              <h2>{mode === 'signup' ? 'Create patient account' : 'Welcome back'}</h2>
              <p>
                {mode === 'signup'
                  ? 'Register to join clinic queues.'
                  : 'Sign in to your patient account.'}
              </p>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <label className="field">
                  <span>Full name</span>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
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
                    placeholder="Enter your age"
                    required
                  />
                </label>
              </>
            )}

            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter password'}
                minLength="6"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            </label>

            {error && <div className="form-message form-message--error">{error}</div>}

            <button
              className="button button--primary button--wide"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'signup' ? 'Create Account' : 'Sign In'}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-footnote">
            <button
              className="link-button"
              type="button"
              onClick={() => navigate('/roles')}
            >
              Login as Doctor or Receptionist
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
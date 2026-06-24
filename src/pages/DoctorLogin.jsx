import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DoctorLogin() {
  const navigate = useNavigate()
  const { loginStaff } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
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
      await loginStaff({ ...formData, expectedRole: 'doctor' })
      navigate('/doctor-dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <button className="button button--secondary" onClick={() => navigate('/roles')} type="button">
          <ArrowLeft size={17} /> Role selection
        </button>

        <div className="auth-heading staff-heading">
          <span className="auth-icon"><Stethoscope size={22} /></span>
          <div>
            <h2>Doctor Login</h2>
            <p>Sign in to view and manage only your patient queue.</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="doctor@clinic.com" autoComplete="email" required />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-with-action">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <div className="form-message form-message--error">{error}</div>}

          <button className="button button--primary button--wide" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}

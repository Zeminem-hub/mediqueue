// Admin sign-in only. The very first admin is created by hand directly in
// Supabase (see docs/ADMIN_SETUP.md) — every admin after that could in
// principle be invited the same way doctors/receptionists are, but today
// this app only ever has the one hand-created admin account.
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FORM_KEY = 'mediqueue_admin_login_form'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { loginStaff } = useAuth()
  const [formData, setFormData] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(FORM_KEY) || 'null') || { email: '', password: '' }
    } catch {
      return { email: '', password: '' }
    }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => {
      const next = { ...current, [name]: value }
      sessionStorage.setItem(FORM_KEY, JSON.stringify(next))
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await loginStaff({ ...formData, expectedRole: 'admin' })
      sessionStorage.removeItem(FORM_KEY)
      navigate('/admin-dashboard', { replace: true })
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
          <span className="auth-icon"><ShieldCheck size={22} /></span>
          <div>
            <h2>Admin Login</h2>
            <p>Sign in to manage clinics, receptionists, and doctors.</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="admin@mediqueue.com" autoComplete="email" required />
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

          <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}

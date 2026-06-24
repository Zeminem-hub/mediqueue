import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function destinationFor(role) {
  if (role === 'doctor') return '/doctor/dashboard'
  if (role === 'receptionist') return '/receptionist/dashboard'
  return '/clinics'
}

export default function Login() {
  const { user, profile, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!loading && user && profile?.role) {
      navigate(location.state?.from || destinationFor(profile.role), { replace: true })
    }
  }, [loading, user, profile, navigate, location.state])

  if (!loading && user && profile?.role) {
    return <Navigate to={destinationFor(profile.role)} replace />
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signup') {
        const { session } = await signUp(form)
        if (!session) {
          setNotice('Check your email to confirm your account, then sign in.')
          setMode('signin')
        }
      } else {
        await signIn(form.email, form.password)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
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
          <p className="eyebrow eyebrow--mint">A calmer clinic starts here</p>
          <h1>Less waiting.<br />More caring.</h1>
          <p>
            One live queue for patients, doctors, and the front desk.
            Everyone knows what is happening next.
          </p>
        </div>

        <div className="auth-proof">
          <div>
            <Check size={17} />
            <span>Live queue positions</span>
          </div>
          <div>
            <Check size={17} />
            <span>Secure staff access</span>
          </div>
          <div>
            <Check size={17} />
            <span>No app download</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark"><Activity size={20} /></span>
            MediQueue
          </div>

          <div className="segmented-control" aria-label="Authentication mode">
            <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')} type="button">
              Sign in
            </button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">
              Patient sign up
            </button>
          </div>

          <div className="auth-heading">
            <span className="auth-icon"><ShieldCheck size={22} /></span>
            <div>
              <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
              <p>{mode === 'signin' ? 'Use your MediQueue account to continue.' : 'Join a clinic queue from any browser.'}</p>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="field">
                <span>Full name</span>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={updateField}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input-with-action">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={updateField}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  minLength="6"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && <div className="form-message form-message--error">{error}</div>}
            {notice && <div className="form-message form-message--success">{notice}</div>}

            <button className="button button--primary button--wide" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create patient account'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-footnote">
            Staff roles are assigned by your clinic administrator.
          </p>
        </div>
      </section>
    </div>
  )
}

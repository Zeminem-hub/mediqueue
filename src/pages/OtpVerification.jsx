import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  clearPendingPatientRegistration,
  getPendingPatientRegistration,
  upsertPatientProfile,
} from '../services/patientService'

export default function OtpVerification() {
  const navigate = useNavigate()
  const { sendOtp, verifyOtp, refreshProfile } = useAuth()
  const inputsRef = useRef([])
  const pending = useMemo(() => getPendingPatientRegistration(), [])
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(30)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  function updateDigit(index, value) {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((digit, digitIndex) => (
      digitIndex === index ? nextValue : digit
    )))
    if (nextValue && index < 5) inputsRef.current[index + 1]?.focus()
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length !== 6) return
    event.preventDefault()
    setDigits(pasted.split(''))
    inputsRef.current[5]?.focus()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await verifyOtp({ phone: pending.phone, token: digits.join('') })
      await upsertPatientProfile(pending)
      clearPendingPatientRegistration()
      await refreshProfile()
      navigate('/clinic', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    try {
      await sendOtp(pending.phone)
      setCountdown(30)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <button className="button button--secondary" onClick={() => navigate('/')} type="button">
          <ArrowLeft size={17} /> Back
        </button>

        <div className="auth-heading otp-heading">
          <span className="auth-icon"><ShieldCheck size={22} /></span>
          <div>
            <h2>Enter the 6-digit code</h2>
            <p>Sent to <strong>{pending?.phone}</strong></p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="otp-grid" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={`otp-${index}`}
                ref={(element) => { inputsRef.current[index] = element }}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength="1"
                aria-label={`OTP digit ${index + 1}`}
                required
              />
            ))}
          </div>

          {error && <div className="form-message form-message--error">{error}</div>}

          <button className="button button--primary button--wide" disabled={isSubmitting || digits.join('').length !== 6}>
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>

          <button
            className="button button--secondary button--wide"
            type="button"
            onClick={handleResend}
            disabled={countdown > 0}
          >
            <RotateCw size={17} />
            {countdown > 0 ? `Resend in 00:${String(countdown).padStart(2, '0')}` : 'Resend code'}
          </button>
        </form>
      </div>
    </div>
  )
}

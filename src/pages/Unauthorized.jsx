// Shown by RoleRoute when a signed-in user's role doesn't match the route
// they tried to open (e.g. a doctor hitting /receptionist-dashboard).
import { ArrowLeft, ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  async function useAnotherAccount() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="centered-state">
      <span className="state-icon state-icon--error"><ShieldX size={30} /></span>
      <p className="eyebrow">Access restricted</p>
      <h1>This workspace is not assigned to your account.</h1>
      <p>Your MediQueue role controls which clinic tools you can open.</p>
      <div className="centered-actions">
        <button className="button button--secondary" onClick={() => navigate('/')}>
          <ArrowLeft size={17} /> Go back
        </button>
        <button className="button button--primary" onClick={useAnotherAccount}>Use another account</button>
      </div>
    </div>
  )
}

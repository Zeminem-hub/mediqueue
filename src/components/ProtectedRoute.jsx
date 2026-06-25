import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from './LoadingScreen'

function loginPathFor(allowedRoles = []) {
  if (allowedRoles.includes('doctor')) return '/doctor-login'
  if (allowedRoles.includes('receptionist')) return '/receptionist-login'
  return '/'
}

export function PublicOnly({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user || !profile?.role) return children
  if (profile.role === 'doctor') return <Navigate to="/doctor-dashboard" replace />
  if (profile.role === 'receptionist') return <Navigate to="/receptionist-dashboard" replace />
  return <Navigate to="/clinic" replace />
}

export function RoleRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen label="Opening your workspace" />

  if (!user) {
    return <Navigate to={loginPathFor(allowedRoles)} replace state={{ from: location.pathname }} />
  }

  if (!profile?.is_active || !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen label="Opening your workspace" />
  if (!user) return <Navigate to={loginPathFor(allowedRoles)} replace state={{ from: location.pathname }} />
  if (allowedRoles?.length && !allowedRoles.includes(profile?.role)) return <Navigate to="/unauthorized" replace />

  return children
}
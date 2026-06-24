import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'

import Login from './pages/auth/Login'
import ClinicSelect from './pages/patient/ClinicSelect'
import DoctorSelect from './pages/patient/DoctorSelect'
import QueueBoard from './pages/patient/QueueBoard'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard'
import Unauthorized from './pages/Unauthorized'

function HomeRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />
  if (profile?.role === 'receptionist') return <Navigate to="/receptionist/dashboard" replace />
  return <Navigate to="/clinics" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/clinics" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <ClinicSelect />
        </ProtectedRoute>
      } />
      <Route path="/clinics/:clinicId/doctors" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <DoctorSelect />
        </ProtectedRoute>
      } />
      <Route path="/queue/:doctorId" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <QueueBoard />
        </ProtectedRoute>
      } />
      <Route path="/doctor/dashboard" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/dashboard" element={
        <ProtectedRoute allowedRoles={['receptionist']}>
          <ReceptionistDashboard />
        </ProtectedRoute>
      } />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/auth/Login'
import ClinicSelect from './pages/patient/ClinicSelect'
import DoctorSelect from './pages/patient/DoctorSelect'
import QueueBoard from './pages/patient/QueueBoard'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard'
import Unauthorized from './pages/Unauthorized'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Patient routes */}
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

          {/* Doctor routes */}
          <Route path="/doctor/dashboard" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />

          {/* Receptionist routes */}
          <Route path="/receptionist/dashboard" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
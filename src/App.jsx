import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PublicOnly, RoleRoute } from './components/ProtectedRoute'

import PatientLogin from './pages/PatientLogin'
import RoleSelection from './pages/RoleSelection'
import DoctorLogin from './pages/DoctorLogin'
import ReceptionistLogin from './pages/ReceptionistLogin'
import ClinicSelect from './pages/patient/ClinicSelect'
import DoctorSelect from './pages/patient/DoctorSelect'
import QueueBoard from './pages/patient/QueueBoard'
import QueueConfirmation from './pages/QueueConfirmation'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard'
import CreateDoctor from './pages/CreateDoctor'
import Unauthorized from './pages/Unauthorized'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><PatientLogin /></PublicOnly>} />
      <Route path="/roles" element={<PublicOnly><RoleSelection /></PublicOnly>} />
      <Route path="/doctor-login" element={<PublicOnly><DoctorLogin /></PublicOnly>} />
      <Route path="/receptionist-login" element={<PublicOnly><ReceptionistLogin /></PublicOnly>} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<RoleRoute allowedRoles={['patient']} />}>
        <Route path="/clinic" element={<ClinicSelect />} />
        <Route path="/doctors" element={<DoctorSelect />} />
        <Route path="/confirmation" element={<QueueConfirmation />} />
        <Route path="/queue" element={<QueueBoard />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={['doctor']} />}>
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={['receptionist']} />}>
        <Route path="/receptionist-dashboard" element={<ReceptionistDashboard />} />
        <Route path="/create-doctor" element={<CreateDoctor />} />
      </Route>

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
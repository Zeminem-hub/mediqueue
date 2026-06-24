import { BrowserRouter, Routes, Route } from "react-router-dom";

import PatientLogin from "./pages/PatientLogin";
import OtpVerification from "./pages/OtpVerification";
import PatientDetails from "./pages/PatientDetails";
import ClinicSelection from "./pages/ClinicSelection";
import DoctorSelection from "./pages/DoctorSelection";
import QueueConfirmation from "./pages/QueueConfirmation";
import LiveQueueBoard from "./pages/LiveQueueBoard";
import DoctorDashboard from "./pages/DoctorDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import RoleSelection from "./pages/RoleSelection";
import DoctorLogin from "./pages/DoctorLogin";
import ReceptionistLogin from "./pages/ReceptionistLogin";
import CreateDoctor from "./pages/CreateDoctor";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PatientLogin />} />
        <Route path="/otp" element={<OtpVerification />} />
        <Route path="/patient-details" element={<PatientDetails />} />
        <Route path="/clinic" element={<ClinicSelection />} />
        <Route path="/doctors" element={<DoctorSelection />} />
        <Route path="/confirmation" element={<QueueConfirmation />} />
        <Route path="/queue" element={<LiveQueueBoard />} />
        <Route path="/roles" element={<RoleSelection />} />
        <Route path="/doctor-login" element={<DoctorLogin />} />
        <Route path="/receptionist-login" element={<ReceptionistLogin />} />
        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute allowedRole="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receptionist-dashboard"
          element={
            <ProtectedRoute allowedRole="receptionist">
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-doctor"
          element={
            <ProtectedRoute allowedRole="receptionist">
              <CreateDoctor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

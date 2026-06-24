import { BrowserRouter, Routes, Route } from "react-router-dom";

import PatientLogin from "./pages/PatientLogin";
import OtpVerification from "./pages/OtpVerification";
import ClinicSelection from "./pages/ClinicSelection";
import DoctorSelection from "./pages/DoctorSelection";
import QueueConfirmation from "./pages/QueueConfirmation";
import LiveQueueBoard from "./pages/LiveQueueBoard";
import DoctorDashboard from "./pages/DoctorDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import RoleSelection from "./pages/RoleSelection";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PatientLogin />} />
        <Route path="/otp" element={<OtpVerification />} />
        <Route path="/clinic" element={<ClinicSelection />} />
      <Route path="/doctors" element={<DoctorSelection />} />
      <Route
  path="/confirmation"
  element={<QueueConfirmation />} />
    <Route path="/queue" element={<LiveQueueBoard />} />     
      <Route
  path="/doctor-dashboard"
  element={<DoctorDashboard />}
/>
<Route
  path="/receptionist-dashboard"
  element={<ReceptionistDashboard />}
/>
<Route path="/roles" element={<RoleSelection />} />
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;
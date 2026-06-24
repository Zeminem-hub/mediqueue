import { Navigate } from "react-router-dom";
import { getStaffSession } from "../services/authService";

export default function ProtectedRoute({ allowedRole, children }) {
  const session = getStaffSession();

  if (!session) {
    return <Navigate to="/roles" replace />;
  }

  if (allowedRole && session.role !== allowedRole) {
    return <Navigate to="/roles" replace />;
  }

  return children;
}

import { useNavigate } from "react-router-dom";

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-6">
          Select Role
        </h1>

        <button
          onClick={() => navigate("/doctor-dashboard")}
          className="w-full bg-blue-600 text-white py-3 rounded-lg mb-4"
        >
          Doctor
        </button>

        <button
          onClick={() => navigate("/receptionist-dashboard")}
          className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg"
        >
          Receptionist
        </button>

      </div>
    </div>
  );
}
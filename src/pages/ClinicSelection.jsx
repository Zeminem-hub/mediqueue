import { useNavigate } from "react-router-dom";

export default function ClinicSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-[#1B3A5C] p-4">
        <h1 className="text-[18px] font-bold text-white">
          MediQueue
        </h1>
      </div>

      <div className="max-w-3xl mx-auto p-6">

        <h2 className="text-3xl font-bold mb-6">
          Select a Clinic
        </h2>

        <input
          type="text"
          placeholder="Search clinics..."
          className="w-full border rounded-lg p-3 mb-6"
        />

        {/* iQuasar Health Card */}

        <div
          onClick={() => navigate("/doctors")}
          className="bg-white border rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold">
            iQuasar Health
          </h3>

          <p className="text-gray-500 mt-2">
            TOP Healthcare Center
          </p>

          <p className="text-green-600 mt-3 font-medium">
            3 Doctors Available
          </p>
        </div>

      </div>
    </div>
  );
}

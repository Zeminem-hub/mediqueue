import { useNavigate } from "react-router-dom";

export default function DoctorSelection() {
  const navigate = useNavigate();

  const doctors = [
    {
      id: 1,
      name: "Dr Ahmad Mir",
      specialization: "General Medicine",
      activeToken: 8,
      waiting: 12,
    },
    {
      id: 2,
      name: "Dr Bashir Khan",
      specialization: "Orthopedics",
      activeToken: 3,
      waiting: 5,
    },
    {
      id: 3,
      name: "Dr Tariq Lone",
      specialization: "Dermatology",
      activeToken: 11,
      waiting: 18,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="bg-[#1B3A5C] p-4">
        <h1 className="text-[18px] font-bold text-white">
          iQuasar Health
        </h1>

        <p className="text-white/60">
          Choose your doctor
        </p>
      </div>

      <div className="max-w-4xl mx-auto p-6">

        <div className="grid gap-5">

          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-xl shadow-sm border p-5"
            >
              <h2 className="text-xl font-semibold">
                {doctor.name}
              </h2>

              <p className="text-gray-500 mt-1">
                {doctor.specialization}
              </p>

              <div className="mt-4">
                <p>
                  Token {doctor.activeToken} active
                </p>

                <p className="text-gray-600">
                  {doctor.waiting} waiting
                </p>
              </div>

              <button
                onClick={() => navigate("/confirmation")}
                className="mt-5 bg-blue-600 text-white px-5 py-2 rounded-lg"
              >
                Join Queue
              </button>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
}

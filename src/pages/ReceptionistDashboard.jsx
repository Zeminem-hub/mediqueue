import { useState } from "react";

export default function ReceptionistDashboard() {
  const [selectedDoctor, setSelectedDoctor] = useState(1);

  const doctors = [
    {
      id: 1,
      name: "Dr Ahmad Mir",
      department: "General Medicine",
      completed: 12,
      waiting: 8,
      current: 42,
    },
    {
      id: 2,
      name: "Dr Bashir Khan",
      department: "Orthopedics",
      completed: 24,
      waiting: 15,
      current: 108,
    },
    {
      id: 3,
      name: "Dr Tariq Lone",
      department: "Dermatology",
      completed: 5,
      waiting: 2,
      current: 12,
    },
  ];

  const [queue, setQueue] = useState([
    {
      token: 42,
      patient: "Zeeshan",
      status: "Current",
    },
    {
      token: 43,
      patient: "Afsana",
      status: "Next",
    },
    {
      token: 44,
      patient: "Adnan",
      status: "Waiting",
    },
    {
      token: 45,
      patient: "Danish",
      status: "Waiting",
    },
  ]);

  const addPatient = () => {
    const newToken = queue[queue.length - 1].token + 1;

    setQueue([
      ...queue,
      {
        token: newToken,
        patient: "New Patient",
        status: "Waiting",
      },
    ]);
  };

  const removePatient = (token) => {
    setQueue(queue.filter((p) => p.token !== token));
  };

  const doctor = doctors.find(
    (d) => d.id === selectedDoctor
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}

      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <div>
            <h1 className="text-2xl font-bold text-blue-900">
              MediQueue
            </h1>

            <p className="text-sm text-gray-500">
              Reception • iQuasar Health
            </p>
          </div>

          <button
            onClick={addPatient}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            + Add Walk-in Patient
          </button>

        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">

        <div className="grid lg:grid-cols-12 gap-6">

          {/* Doctor List */}

          <div className="lg:col-span-4">

            <h2 className="text-xl font-bold mb-4">
              Active Doctors
            </h2>

            <div className="space-y-4">

              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  onClick={() =>
                    setSelectedDoctor(doctor.id)
                  }
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition ${
                    selectedDoctor === doctor.id
                      ? "border-blue-500"
                      : ""
                  }`}
                >
                  <h3 className="font-semibold text-lg">
                    {doctor.name}
                  </h3>

                  <p className="text-gray-500 text-sm">
                    {doctor.department}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">

                    <div>
                      <p className="text-xs text-gray-500">
                        Completed
                      </p>

                      <p className="font-bold">
                        {doctor.completed}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Waiting
                      </p>

                      <p className="font-bold text-blue-600">
                        {doctor.waiting}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Current
                      </p>

                      <p className="font-bold">
                        #{doctor.current}
                      </p>
                    </div>

                  </div>

                </div>
              ))}

            </div>

          </div>

          {/* Queue Panel */}

          <div className="lg:col-span-8">

            <div className="bg-white border rounded-xl shadow-sm">

              <div className="p-4 border-b">

                <h2 className="text-xl font-bold">
                  {doctor.name}'s Queue
                </h2>

                <p className="text-gray-500 text-sm">
                  {doctor.department}
                </p>

              </div>

              <div className="divide-y">

                {queue.map((patient) => (
                  <div
                    key={patient.token}
                    className="p-4 flex justify-between items-center"
                  >

                    <div className="flex items-center gap-4">

                      <div className="w-12 h-12 rounded-lg border flex items-center justify-center font-bold">
                        #{patient.token}
                      </div>

                      <div>
                        <p className="font-medium">
                          {patient.patient}
                        </p>

                        <p className="text-sm text-gray-500">
                          {patient.status}
                        </p>
                      </div>

                    </div>

                    <button
                      onClick={() =>
                        removePatient(patient.token)
                      }
                      className="text-red-500"
                    >
                      Remove
                    </button>

                  </div>
                ))}

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatientDisplayProfile } from "../services/patientService";
import { getAbsentTokens, markTokenAbsent } from "../services/queueService";

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const patientProfile = getPatientDisplayProfile();
  const [absentTokens, setAbsentTokens] = useState(getAbsentTokens);
  const [selectedDoctor, setSelectedDoctor] = useState(1);

  const doctors = [
    {
      id: 1,
      name: "Dr Ahmad Mir",
      department: "General Medicine",
      email: "ahmad.mir@iquasarhealth.com",
      completed: 12,
      waiting: 8,
      current: 11,
    },
    {
      id: 2,
      name: "Dr Bashir Khan",
      department: "Orthopedics",
      email: "bashir.khan@iquasarhealth.com",
      completed: 24,
      waiting: 15,
      current: 108,
    },
    {
      id: 3,
      name: "Dr Tariq Lone",
      department: "Dermatology",
      email: "tariq.lone@iquasarhealth.com",
      completed: 5,
      waiting: 2,
      current: 12,
    },
  ];

  const [queue, setQueue] = useState(() => [
    {
      token: 11,
      patient: "Patient Queue Entry",
      age: "Not provided",
      status: "Current",
    },
    {
      token: 12,
      patient: "Patient Queue Entry",
      age: "Not provided",
      status: "Next",
    },
    {
      token: patientProfile.token,
      patient: patientProfile.name,
      age: patientProfile.age,
      status: "Waiting",
    },
    {
      token: 14,
      patient: "Patient Queue Entry",
      age: "Not provided",
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
        age: "Not provided",
        status: "Waiting",
      },
    ]);
  };

  const removePatient = (token) => {
    setQueue(queue.filter((p) => p.token !== token));
  };

  const markAbsent = (token) => {
    setAbsentTokens(markTokenAbsent(token));
    setQueue((currentQueue) =>
      currentQueue.map((patient) =>
        patient.token === token
          ? { ...patient, status: "Absent" }
          : patient
      )
    );
  };

  const doctor = doctors.find(
    (d) => d.id === selectedDoctor
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}

      <header className="bg-[#1B3A5C]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <div>
            <h1 className="text-[18px] font-bold text-white">
              MediQueue
            </h1>

            <p className="text-sm text-white/60">
              Reception • iQuasar Health
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/create-doctor")}
              className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg"
            >
              + Create Doctor
            </button>

            <button
              onClick={addPatient}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              + Add Walk-in Patient
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white border rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold">
                Doctors Management
              </h2>

              <p className="text-gray-500 text-sm">
                View doctors, edit accounts, and reset temporary passwords.
              </p>
            </div>

            <button
              onClick={() => navigate("/create-doctor")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Create Doctor
            </button>
          </div>

          <div className="divide-y">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">
                    {doctor.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {doctor.department} - {doctor.email}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg">
                    Edit
                  </button>

                  <button className="border border-red-500 text-red-500 px-4 py-2 rounded-lg">
                    Reset Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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

                {queue.map((patient) => {
                  const isAbsent =
                    absentTokens.includes(patient.token) ||
                    patient.status === "Absent";

                  return (
                  <div
                    key={patient.token}
                    className={`p-4 flex justify-between items-center ${
                      isAbsent ? "bg-[#F1F5F9] text-[#64748B]" : ""
                    }`}
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
                          Age: {patient.age} -{" "}
                          {isAbsent ? "Absent" : patient.status}
                        </p>
                      </div>

                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => markAbsent(patient.token)}
                        disabled={isAbsent}
                        className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg"
                      >
                        Mark Absent
                      </button>

                      <button
                        onClick={() =>
                          removePatient(patient.token)
                        }
                        className="text-red-500"
                      >
                        Remove
                      </button>
                    </div>

                  </div>
                  );
                })}

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

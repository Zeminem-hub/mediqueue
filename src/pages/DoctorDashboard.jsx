import { useState } from "react";
import { getPatientDisplayProfile } from "../services/patientService";
import { getAbsentTokens, markTokenAbsent } from "../services/queueService";

export default function DoctorDashboard() {
  const [currentToken, setCurrentToken] = useState(11);
  const [absentTokens, setAbsentTokens] = useState(getAbsentTokens);
  const patient = getPatientDisplayProfile();

  const queue = [9, 10, 11, 12, 13, 14, 15].map((token) => ({
    token,
    patient:
      token === patient.token
        ? patient.name
        : "Patient Queue Entry",
    age: token === patient.token ? patient.age : "Not provided",
  }));

  const callNext = () => {
    setCurrentToken(currentToken + 1);
  };

  const markComplete = () => {
    setCurrentToken(currentToken + 1);
  };

  const markAbsent = (token) => {
    setAbsentTokens(markTokenAbsent(token));

    if (token === currentToken) {
      setCurrentToken(currentToken + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}

      <header className="bg-[#1B3A5C]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <div>
            <h1 className="text-[18px] font-bold text-white">
              MediQueue
            </h1>
          </div>

          <div className="flex items-center gap-4">

            <div className="text-right">
              <p className="font-semibold text-white">
                Dr Ahmad Mir
              </p>

              <p className="text-sm text-white/60">
                General Medicine
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-gray-300"></div>

          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">

        {/* Title */}

        <div className="mb-6">
          <h2 className="text-3xl font-bold">
            Dashboard
          </h2>

          <p className="text-gray-500">
            Manage your queue
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* Left Panel */}

          <div className="lg:col-span-4 space-y-6">

            {/* Stats */}

            <div className="bg-white rounded-xl border shadow-sm p-4">

              <div className="grid grid-cols-3 gap-3">

                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">
                    Completed
                  </p>

                  <p className="text-2xl font-bold">
                    {currentToken - 1}
                  </p>
                </div>

                <div className="text-center bg-blue-100 rounded-lg p-2">
                  <p className="text-xs uppercase">
                    Current
                  </p>

                  <p className="text-2xl font-bold text-blue-800">
                    {currentToken}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">
                    Waiting
                  </p>

                  <p className="text-2xl font-bold">
                    {queue.filter(
                      (entry) =>
                        entry.token > currentToken &&
                        !absentTokens.includes(entry.token)
                    ).length}
                  </p>
                </div>

              </div>

            </div>

            {/* Current Patient Card */}

            <div className="bg-white rounded-xl border shadow-sm p-6">

              <h3 className="text-xl font-semibold mb-4">
                Current Patient
              </h3>

              <div className="flex justify-center mb-5">

                <div className="h-24 w-24 bg-blue-100 rounded-xl flex items-center justify-center">

                  <span className="text-4xl font-bold text-blue-900">
                    {currentToken}
                  </span>

                </div>

              </div>

              <p className="text-center text-gray-500 mb-6">
                In Consultation
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => markAbsent(currentToken)}
                  className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg"
                >
                  Mark Absent
                </button>

                <button
                  onClick={markComplete}
                  className="w-full border border-red-500 text-red-500 py-3 rounded-lg"
                >
                  Mark Complete
                </button>

                <button
                  onClick={callNext}
                  className="w-full bg-blue-900 text-white py-3 rounded-lg"
                >
                  Call Next
                </button>

              </div>

            </div>

          </div>

          {/* Right Panel */}

          <div className="lg:col-span-8">

            <div className="bg-white rounded-xl border shadow-sm">

              <div className="border-b p-4">
                <h3 className="text-xl font-semibold">
                  Queue Roster
                </h3>
              </div>

              <div className="p-4 space-y-3">

                {queue.map((entry) => {

                  let status = "Waiting";
                  let style =
                    "bg-white border";

                  if (entry.token < currentToken) {
                    status = "Completed";
                    style =
                      "bg-green-50 border-green-300";
                  }

                  if (
                    entry.token === currentToken &&
                    !absentTokens.includes(entry.token)
                  ) {
                    status = "Current";
                    style =
                      "bg-blue-100 border-blue-400";
                  }

                  if (absentTokens.includes(entry.token)) {
                    status = "Absent";
                    style =
                      "bg-[#F1F5F9] text-[#64748B] border-transparent";
                  }

                  return (
                    <div
                      key={entry.token}
                      className={`flex justify-between items-center p-4 rounded-lg border ${style}`}
                    >
                      <div className="flex items-center gap-4">

                        <div className="h-12 w-12 rounded-lg border flex items-center justify-center font-bold">
                          {entry.token}
                        </div>

                        <div>

                          <p className="font-medium">
                            {entry.patient}
                          </p>

                          <p className="text-sm text-gray-500">
                            Age: {entry.age} - Token #{entry.token}
                          </p>

                        </div>

                      </div>

                      <span className="text-sm font-semibold">
                        {status}
                      </span>

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

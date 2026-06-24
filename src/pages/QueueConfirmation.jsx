import { useNavigate } from "react-router-dom";
import { getPatientDisplayProfile } from "../services/patientService";

export default function QueueConfirmation() {
  const navigate = useNavigate();
  const patient = getPatientDisplayProfile();

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 text-blue-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          You're in the queue!
        </h1>

        <p className="text-gray-500 mb-6">
          Dr Ahmad Mir - iQuasar Health
        </p>

        <div className="w-full bg-gray-100 rounded-lg p-4 mb-6 border text-left">
          <p className="text-xs uppercase text-gray-500 mb-1">
            Patient
          </p>

          <p className="font-semibold text-gray-800">
            {patient.name}
          </p>

          <p className="text-sm text-gray-500">
            DOB: {patient.dob}
          </p>
        </div>

        <div className="w-full mb-8">
          <p className="text-sm uppercase tracking-widest text-purple-700 mb-3">
            Your Token
          </p>

          <div className="bg-purple-700 text-white rounded-xl p-6 border-2 border-purple-700 shadow-md">
            <span className="text-7xl font-bold">
              {patient.token}
            </span>
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4 w-full flex items-center justify-center gap-2 mb-8 border">
          <span className="text-blue-600 text-xl">
            Queue
          </span>

          <p className="font-medium text-gray-700">
            13 patients ahead of you
          </p>
        </div>

        <button
          onClick={() => navigate("/queue")}
          className="w-full bg-blue-900 text-white rounded-lg py-4 font-semibold hover:bg-blue-800 transition"
        >
          View Queue Status
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { savePatientProfile } from "../services/patientService";

export default function PatientDetails() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    try {
      savePatientProfile(formData);
      navigate("/clinic");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="w-full max-w-md">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-4xl font-bold text-blue-900">
            MediQueue
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-md border p-8">
          <h2 className="text-xl font-semibold mb-2">
            Patient Details
          </h2>

          <p className="text-gray-500 mb-6">
            Add your name and date of birth before joining a queue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter patient name"
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>

              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

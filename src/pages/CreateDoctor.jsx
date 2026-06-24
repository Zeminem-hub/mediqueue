import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDoctor } from "../services/authService";

export default function CreateDoctor() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    email: "",
    temporaryPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await createDoctor(formData);
      navigate("/receptionist-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-[18px] font-bold text-white">
              MediQueue
            </h1>

            <p className="text-sm text-white/60">
              Create doctor account
            </p>
          </div>

          <button
            onClick={() => navigate("/receptionist-dashboard")}
            className="border border-white/60 text-white px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-md border p-8">
          <h2 className="text-xl font-semibold mb-2">
            Doctor Details
          </h2>

          <p className="text-gray-500 mb-6">
            Add a doctor profile and temporary sign-in password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doctor Name
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Dr Ahmad Mir"
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>

              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="General Medicine"
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="doctor@clinic.com"
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temporary Password
              </label>

              <input
                type="password"
                name="temporaryPassword"
                value={formData.temporaryPassword}
                onChange={handleChange}
                placeholder="Set a temporary password"
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
              >
                {isSubmitting ? "Creating..." : "Create Doctor"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/receptionist-dashboard")}
                className="flex-1 border border-blue-600 text-blue-600 py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

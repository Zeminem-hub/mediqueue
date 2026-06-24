import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginReceptionist } from "../services/authService";

export default function ReceptionistLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
      await loginReceptionist(formData);
      navigate("/receptionist-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
            Receptionist Login
          </h2>

          <p className="text-gray-500 mb-6">
            Sign in to manage doctors, queues, and walk-in patients.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="reception@clinic.com"
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
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
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => navigate("/roles")}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to role selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

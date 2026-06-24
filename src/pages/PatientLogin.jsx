import { useNavigate } from "react-router-dom";
export default function PatientLogin() {
    const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="w-full max-w-md">
        
        {/* Logo */}
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-4xl font-bold text-blue-900">
            MediQueue
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-md border p-8">
          
          <h2 className="text-xl font-semibold mb-2">
            Enter your phone number to continue
          </h2>

          <p className="text-gray-500 mb-6">
            You'll receive a one-time code to verify your number.
          </p>

          {/* Phone Input */}
          <div className="flex border rounded-lg overflow-hidden mb-6">
            
            <div className="px-4 flex items-center bg-gray-100 border-r">
              +91
            </div>

            <input
              type="tel"
              placeholder="10-digit mobile number"
              className="flex-1 p-3 outline-none"
            />
          </div>

          {/* Button */}
          <button
  onClick={() => navigate("/otp")}
  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
>
  Send OTP
</button>

          {/* Staff Login */}
          <div className="mt-5 text-center">
            <button
  onClick={() => navigate("/roles")}
  className="text-blue-600 hover:text-blue-800"
>
  Login as Doctor or Receptionist →
</button>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-5">
          No app download needed. Works in your browser.
        </p>

      </div>
    </div>
  );
}
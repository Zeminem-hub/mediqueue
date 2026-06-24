import { useNavigate } from "react-router-dom";
export default function OtpVerification() {
    const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="bg-white rounded-xl shadow-md border w-full max-w-md p-8">

        <button className="mb-6 text-gray-500 hover:text-blue-600">
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-center mb-2">
          Enter the 6-digit code
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Sent to <strong>+91 98765 43210</strong>
        </p>

        <div className="flex justify-between gap-2 mb-8">
          <input className="w-12 h-14 border rounded text-center text-xl" maxLength="1" />
          <input className="w-12 h-14 border rounded text-center text-xl" maxLength="1" />
          <input className="w-12 h-14 border rounded text-center text-xl" maxLength="1" />
          <input className="w-12 h-14 border rounded text-center text-xl" maxLength="1" />
          <input className="w-12 h-14 border rounded text-center text-xl" maxLength="1" />
          <input className="w-12 h-14 border rounded text-center text-xl" maxLength="1" />
        </div>

        <button
  onClick={() => navigate("/clinic")}
  className="w-full bg-blue-600 text-white py-3 rounded-lg"
>
  Verify Code
</button>

        <div className="text-center mt-6 text-gray-500">
          Didn't receive it?
          <button className="text-blue-600 ml-2">
            Resend in 00:30
          </button>
        </div>

      </div>
    </div>
  );
}
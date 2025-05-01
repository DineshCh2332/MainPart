import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from '../src/context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const usersRef = collection(db, "users_01");
      const q = query(usersRef, where("phone", "==", phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Phone number not registered");
      }

      const userDoc = querySnapshot.docs[0];
      setUserData(userDoc.data());
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (otp === userData.otp) {
      login(userData); // Store user in context and localStorage
      switch (userData.role.toLowerCase()) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "manager":
          navigate("/manager/dashboard");
          break;
        case "teamleader":
          navigate("/teamleader/dashboard");
          break;
        case "teammember":
        case "employee":
          navigate("/teammember/viewdetails");
          break;
        default:
          setError("Invalid user role");
      }
    } else {
      setError("Invalid OTP");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
        
        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "Checking..." : "Send OTP"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">OTP</label>
                <input
                  type="number"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
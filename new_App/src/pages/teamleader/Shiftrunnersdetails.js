// Shiftrunnersdetails.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

const Shiftrunnersdetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const q = query(collection(db, "users_01"), where("userId", "==", id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.error("User not found");
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
   // Directly use the string value and split at 'T'
   const formattedMemberSince = userData.member_since 
   ? userData.member_since.split('T')[0]
   : "N/A";

        setUser({
          ...userData,
          createdAt: formattedMemberSince,
        });
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };

    loadUser();
  }, [id]);

  const calculateTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const then = new Date(dateStr);

    let years = now.getFullYear() - then.getFullYear();
    let months = now.getMonth() - then.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    const yearText = years > 0 ? `${years} year${years > 1 ? "s" : ""}` : "";
    const monthText = months > 0 ? `${months} month${months > 1 ? "s" : ""}` : "";

    if (yearText && monthText) return `(${yearText}, ${monthText} ago)`;
    if (yearText) return `(${yearText} ago)`;
    if (monthText) return `(${monthText} ago)`;
    return "(Less than a month ago)";
  };

  if (!user) return <p style={{ padding: "20px" }}>Loading user data...</p>;

  const renderFieldRow = (fieldName, label) => (
    <tr>
      <td><strong>{label}</strong></td>
      <td>{user[fieldName] || "N/A"}</td>
    </tr>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Employee Details</h2>
        <button
          onClick={() => navigate("/teamleader/shiftrunners")}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Back to Employees
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="p-2 font-semibold">Name</td>
              <td className="p-2">{user.name || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">Phone Number</td>
              <td className="p-2">{user.phone || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">Email</td>
              <td className="p-2">{user.email || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">Date of Birth</td>
              <td className="p-2">{user.dob || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">User ID</td>
              <td className="p-2">{user.userId || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">Address</td>
              <td className="p-2">{user.address || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">Member Since</td>
              <td className="p-2">
                {user.createdAt}
                <span className="text-gray-500 ml-2">
                  {calculateTimeAgo(user.createdAt)}
                </span>
              </td>
            </tr>
            <tr>
              <td className="p-2 font-semibold">Role</td>
              <td className="p-2">{user.role || "N/A"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Shiftrunnersdetails;
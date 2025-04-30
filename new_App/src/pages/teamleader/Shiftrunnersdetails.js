import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import "../../css/UserDetails.css";

const Shiftrunnersdetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userRef = doc(db, "users_01", id);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.error("User not found");
          return;
        }

        const userData = userSnap.data();
        const memberSinceDate = userData.member_since?.toDate
          ? userData.member_since.toDate()
          : userData.member_since instanceof Date
            ? userData.member_since
            : null;

        const formattedMemberSince = memberSinceDate
          ? memberSinceDate.toISOString().split("T")[0]
          : "N/A";

        setUser({
          id: userData.customer_id,
          name: userData.name,
          phone: userData.phone,
          email: userData.email,
          dob: userData.dob,
          address: userData.address,
          employeeID: userData.employeeID,
          role: userData.role,
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
    <div className="employee-details-container">
      <h2>Employee Details</h2>

      <button
        style={{ width: "150px" }}
        className="back-button"
        onClick={() => navigate("/teamleader/shiftrunners")}
      >
        Back to Employees
      </button>

      <table className="employee-details-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {renderFieldRow("name", "Name")}
          {renderFieldRow("phone", "Phone Number")}
          {renderFieldRow("email", "Email")}
          {renderFieldRow("dob", "Date of Birth")}
          {renderFieldRow("id", "Customer ID")}
          {renderFieldRow("employeeID", "Employee ID")}
          {renderFieldRow("address", "Address")}
          <tr>
            <td><strong>Member Since</strong></td>
            <td>
              {user.createdAt}{" "}
              <span style={{ color: "gray", fontSize: "0.9em" }}>
                {calculateTimeAgo(user.createdAt)}
              </span>
            </td>
          </tr>
          {renderFieldRow("role", "Role")}
        </tbody>
      </table>
    </div>
  );
};

export default Shiftrunnersdetails;

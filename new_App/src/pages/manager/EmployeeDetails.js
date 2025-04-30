import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../src/firebase/config";
import { doc, getDoc, updateDoc, query, where, getDocs, collection } from "firebase/firestore";
import "../../css/UserDetails.css";

const Employees = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editableField, setEditableField] = useState(null);
  const [updatedValue, setUpdatedValue] = useState("");
  const [error, setError] = useState("");
  const editRef = useRef(null);

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
          email: userData.email, // Keep email for editing
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

  const validateField = (field, value) => {
    if (field === "dob" && !value) return "Date of Birth cannot be empty";
    if (value.trim() === "") return "Field cannot be empty";
    return null;
  };

  const handleEditClick = (field, value) => {
    setEditableField(field);
    setUpdatedValue(value || "");
    setError("");
  };

  const handleSaveClick = async () => {
    const validationError = validateField(editableField, updatedValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (editableField === "email") {
      // Check for duplicate email
      const emailQuery = query(
        collection(db, "users_01"),
        where("email", "==", updatedValue)
      );

      const querySnapshot = await getDocs(emailQuery);

      if (!querySnapshot.empty) {
        // Email is already in use by another user
        setError("Email is already taken. Please choose a different email.");
        return;
      }
    }

    try {
      const ref = doc(db, "users_01", id);
      const updatedData = {};
      updatedData[editableField] = updatedValue;
      await updateDoc(ref, updatedData);

      setUser((prevUser) => ({
        ...prevUser,
        [editableField]: updatedValue,
      }));

      setEditableField(null);
      setUpdatedValue("");
      setError("");
      alert("User details updated successfully!");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user details. Please try again.");
    }
  };

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

  const renderFieldRow = (fieldName, label, editable = false, type = "text") => (
    <tr ref={editableField === fieldName ? editRef : null}>
      <td><strong>{label}</strong></td>
      <td>
        {editable && editableField === fieldName ? (
          <>
            <input
              type={type}
              className="input-field"
              value={updatedValue}
              onChange={(e) => setUpdatedValue(e.target.value)}
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
          </>
        ) : (
          user[fieldName] || "N/A"
        )}
      </td>
      <td>
        {editable ? (
          editableField === fieldName ? (
            <button className="save-button" onClick={handleSaveClick}>
              Save
            </button>
          ) : (
            <button
              className="edit-button"
              onClick={() => handleEditClick(fieldName, user[fieldName])}
            >
              Edit
            </button>
          )
        ) : (
          "-"
        )}
      </td>
    </tr>
  );

  return (
    <div className="employee-details-container">
      <h2>Employee Details</h2>

      <button
        style={{ width: "150px" }}
        className="back-button"
        onClick={() => navigate("/manager/employees")}
      >
        Back to Users
      </button>

      <table className="employee-details-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {renderFieldRow("name", "Name", true)}
          {renderFieldRow("phone", "Phone Number", false)}
          {renderFieldRow("email", "Email", true, "email")}
          {renderFieldRow("dob", "Date of Birth", true, "date")}
          {renderFieldRow("id", "Customer ID", false)}
          {renderFieldRow("employeeID", "Employee ID", false)}
          {renderFieldRow("address", "Address", true)}
          <tr>
            <td><strong>Member Since</strong></td>
            <td>
              {user.createdAt}{" "}
              <span style={{ color: "gray", fontSize: "0.9em" }}>
                {calculateTimeAgo(user.createdAt)}
              </span>
            </td>
            <td>-</td>
          </tr>
          {renderFieldRow("role", "Role", false)}
        </tbody>
      </table>
    </div>
  );
};

export default Employees;

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../src/firebase/config";
import { doc, getDoc, updateDoc, query, where, getDocs, collection } from "firebase/firestore";

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
        
        // Directly use the string value and split at 'T'
        const formattedMemberSince = userData.member_since 
          ? userData.member_since.split('T')[0]
          : "N/A";
  
        setUser({
          id: userSnap.id,
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

    try {
      // Update users_01 collection
      const userRef = doc(db, "users_01", id);
      const updatedData = { [editableField]: updatedValue };
      
      // Check if user exists in customers collection
      const customerRef = doc(db, "customers", id);
      const customerSnap = await getDoc(customerRef);

      const updates = [updateDoc(userRef, updatedData)];
      
      if (customerSnap.exists()) {
        updates.push(updateDoc(customerRef, updatedData));
      }

      await Promise.all(updates);

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

  if (!user) return <p className="p-5">Loading user data...</p>;

  const renderFieldRow = (fieldName, label, editable = false, type = "text") => (
    <tr ref={editableField === fieldName ? editRef : null} className="border-b">
      <td className="p-3 font-medium">{label}</td>
      <td className="p-3">
        {editable && editableField === fieldName ? (
          <div className="flex flex-col">
            <input
              type={type}
              className="border rounded p-2 mb-1"
              value={updatedValue}
              onChange={(e) => setUpdatedValue(e.target.value)}
              autoFocus
            />
            {error && <span className="text-red-500 text-sm">{error}</span>}
          </div>
        ) : (
          <span>{user[fieldName] || "N/A"}</span>
        )}
      </td>
      <td className="p-3">
        {editable ? (
          editableField === fieldName ? (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
              onClick={handleSaveClick}
            >
              Save
            </button>
          ) : (
            <button
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Employee Details</h2>
        <button
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => navigate("/manager/employees")}
        >
          Back to Employees
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Field</th>
              <th className="p-3 text-left">Value</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {renderFieldRow("name", "Name", true)}
            {renderFieldRow("phone", "Phone Number", false)}
            {renderFieldRow("email", "Email", true, "email")}
            {renderFieldRow("dob", "Date of Birth", true, "date")}
            <tr className="border-b">
              <td className="p-3 font-medium">User ID</td>
              <td className="p-3">{user.id}</td>
              <td className="p-3">-</td>
            </tr>
            {renderFieldRow("employeeID", "Employee ID", false)}
            {renderFieldRow("address", "Address", true)}
            <tr className="border-b">
              <td className="p-3 font-medium">Member Since</td>
              <td className="p-3">
                {user.createdAt}{" "}
                <span className="text-gray-500 text-sm">
                  {calculateTimeAgo(user.createdAt)}
                </span>
              </td>
              <td className="p-3">-</td>
            </tr>
            {renderFieldRow("role", "Role", false)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Employees;
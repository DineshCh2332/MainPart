// import React, { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { db } from "../../firebase";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { collection, getDocs } from "firebase/firestore"; // Add this import
// import "../css/UserDetails.css"; // Import your CSS file


// const UserDetails = () => {
//   const { id } = useParams();
//   const navigate = useNavigate(); // Initialize useNavigate
//   const [user, setUser] = useState(null);
//   const [editableField, setEditableField] = useState(null);
//   const [updatedValue, setUpdatedValue] = useState("");
//   const [error, setError] = useState("");
//   const editRef = useRef(null);

//   useEffect(() => {
//     const loadUser = async () => {
//       try {
//         const userRef = doc(db, "users", id);
//         const userSnap = await getDoc(userRef);

//         if (!userSnap.exists()) {
//           console.error("User not found");
//           return;
//         }

//         const userData = userSnap.data();
//         const memberSinceDate = userData.member_since?.toDate
//           ? userData.member_since.toDate()
//           : userData.member_since instanceof Date
//             ? userData.member_since
//             : null;

//         const formattedMemberSince = memberSinceDate
//           ? memberSinceDate.toISOString().split("T")[0]
//           : "N/A";

//         setUser({
//           id: userData.customer_id,
//           name: userData.name,
//           phone: userData.phone,
//           email: userData.email,
//           dob: userData.dob,
//           address: userData.address,
//           employeeID: userData.employeeID,
//           role: userData.role,
//           createdAt: formattedMemberSince,
//           bankDetails: userData.bank_details || {},
//           documentNumber: userData.document_number,
//           shareCode: userData.shareCode,
//         });
//       } catch (error) {
//         console.error("Error loading user:", error);
//       }
//     };

//     loadUser();
//   }, [id]);

//   const validateField = (field, value) => {
//     if (field === "id") {
//       if (!/^\d+$/.test(value)) {
//         return "Customer ID must be a valid number";
//       }
//     }
  
//     if (field === "employeeID") {
//       if (value.trim() !== "" && !/^\d{5}$/.test(value)) {
//         return "Employee ID must be exactly 5 digits (if provided)";
//       }
//     }
  
//     if (field === "email") {
//       if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
//         return "Invalid email address";
//       }
//     }
  
//     if (field === "phone") {
//       if (!/^\d{10}$/.test(value)) {
//         return "Phone number must be 10 digits";
//       }
//     }
  
//     if (field === "dob" || field === "createdAt") {
//       if (!value) return "Date cannot be empty";
//     }
  
//     if (value.trim() === "" && field !== "employeeID") {
//       return "Field cannot be empty";
//     }
  
//     return null;
//   };
  

//   const handleEditClick = (field, value) => {
//     setEditableField(field);
//     setUpdatedValue(value || "");
//     setError("");
//   };
//   const handleSaveClick = async () => {
//     const validationError = validateField(editableField, updatedValue);
//     if (validationError) {
//       setError(validationError);
//       return;
//     }


//   if (editableField === "email" || editableField === "phone") {
//     const fieldToCheck = editableField === "email" ? "email" : "phone";
//     try {
//       const usersRef = collection(db, "users");
//       const querySnapshot = await getDocs(usersRef);
//       let isFieldTaken = false;

//       querySnapshot.forEach((doc) => {
//         const userData = doc.data();
//         if (userData[fieldToCheck] === updatedValue && userData.customer_id !== user.id) {
//           isFieldTaken = true;
//         }
//       });

//       if (isFieldTaken) {
//         setError(`${editableField.charAt(0).toUpperCase() + editableField.slice(1)} is already in use.`);
//         return;
//       }
//     } catch (error) {
//       console.error("Error checking for duplicate email/phone:", error);
//       setError("Error checking for duplicate email/phone.");
//       return;
//     }
//   }
  
//     try {
//       // Check if the new customer ID or employee ID already exists in Firestore
//       if (editableField === "id" || editableField === "employeeID") {
//         const querySnapshot = await getDocs(collection(db, "users"));
//         const existingId = querySnapshot.docs.some(doc => {
//           const data = doc.data();
//           if (editableField === "id" && data.customer_id === updatedValue) {
//             return true; // Customer ID already exists
//           }
//           if (editableField === "employeeID" && data.employeeID === updatedValue) {
//             return true; // Employee ID already exists
//           }
//           return false;
//         });
  
//         if (existingId) {
//           setError(`${editableField === "id" ? "Customer ID" : "Employee ID"} already exists.`);
//           return;
//         }
//       }
  
//       const ref = doc(db, "users", id);
//       const updatedData = {};
  
//       if (editableField === "id") {
//         updatedData["customer_id"] = updatedValue;
//       } else if (editableField === "createdAt") {
//         updatedData["member_since"] = new Date(updatedValue);
//       } else if (Object.keys(user.bankDetails || {}).includes(editableField)) {
//         updatedData[`bank_details.${editableField}`] = updatedValue;
//       } else {
//         updatedData[editableField] = updatedValue;
//       }
  
//       await updateDoc(ref, updatedData);
  
//       setUser((prevUser) => {
//         if (editableField === "id") {
//           return { ...prevUser, id: updatedValue };
//         } else if (editableField === "createdAt") {
//           return { ...prevUser, createdAt: updatedValue };
//         } else if (Object.keys(prevUser.bankDetails || {}).includes(editableField)) {
//           return {
//             ...prevUser,
//             bankDetails: {
//               ...prevUser.bankDetails,
//               [editableField]: updatedValue,
//             },
//           };
//         } else {
//           return {
//             ...prevUser,
//             [editableField]: updatedValue,
//           };
//         }
//       });
  
//       setEditableField(null);
//       setUpdatedValue("");
//       setError("");
//       alert("User details updated successfully!");
//     } catch (error) {
//       console.error("Error updating user:", error);
//       alert("Error updating user details. Please try again.");
//     }
//   };
  
//   const calculateTimeAgo = (dateStr) => {
//     if (!dateStr) return "";
//     const now = new Date();
//     const then = new Date(dateStr);

//     let years = now.getFullYear() - then.getFullYear();
//     let months = now.getMonth() - then.getMonth();

//     if (months < 0) {
//       years--;
//       months += 12;
//     }

//     const yearText = years > 0 ? `${years} year${years > 1 ? "s" : ""}` : "";
//     const monthText = months > 0 ? `${months} month${months > 1 ? "s" : ""}` : "";

//     if (yearText && monthText) return `(${yearText}, ${monthText} ago)`;
//     if (yearText) return `(${yearText} ago)`;
//     if (monthText) return `(${monthText} ago)`;
//     return "(Less than a month ago)";
//   };

//   if (!user) return <p style={{ padding: "20px" }}>Loading user data...</p>;

//   const renderEditableRow = (fieldName, label, type = "text") => (
//     <tr ref={editableField === fieldName ? editRef : null}>
//       <td><strong>{label}</strong></td>
//       <td>
//         {editableField === fieldName ? (
//           <input
//             type={type}
//             className="input-field"
//             value={updatedValue}
//             onChange={(e) => setUpdatedValue(e.target.value)}
//             autoFocus
//           />
//         ) : (
//           user[fieldName] || "N/A"
//         )}
//         {editableField === fieldName && error && (
//           <div className="error-message">{error}</div>
//         )}
//       </td>
//       <td>
//         {editableField === fieldName ? (
//           <button className="save-button" onClick={handleSaveClick}>
//             Save
//           </button>
//         ) : (
//           <button
//             className="edit-button"
//             onClick={() => handleEditClick(fieldName, user[fieldName])}
//           >
//             Edit
//           </button>
//         )}
//       </td>
//     </tr>
//   );

//   const renderBankDetailRow = (fieldName, label) => (
//     <tr ref={editableField === fieldName ? editRef : null}>
//       <td><strong>{label}</strong></td>
//       <td>
//         {editableField === fieldName ? (
//           <>
//             <input
//               type="text"
//               className="input-field"
//               value={updatedValue}
//               onChange={(e) => setUpdatedValue(e.target.value)}
//               autoFocus
//             />
//             {error && <div className="error-message">{error}</div>}
//           </>
//         ) : (
//           user.bankDetails?.[fieldName] || "N/A"
//         )}
//       </td>
//       <td>
//         {editableField === fieldName ? (
//           <button className="save-button" onClick={handleSaveClick}>
//             Save
//           </button>
//         ) : (
//           <button
//             className="edit-button"
//             onClick={() => handleEditClick(fieldName, user.bankDetails?.[fieldName])}
//           >
//             Edit
//           </button>
//         )}
//       </td>
//     </tr>
//   );

//   return (
//     <div className="employee-details-container">
//       <h2>User Details</h2>
      
//       {/* Back Button */}
//       <button style={{width:"150px"}} className="back-button" onClick={() => navigate("/admin/users")}>
//         Back to Users
//       </button>

//       <table className="employee-details-table">
//         <thead>
//           <tr>
//             <th>Field</th>
//             <th>Value</th>
//             <th>Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {renderEditableRow("id", "User ID (Customer ID)", "text")}
//           {renderEditableRow("name", "Name")}
//           {renderEditableRow("phone", "Phone", "tel")}
//           {renderEditableRow("email", "Email", "email")}
//           {renderEditableRow("dob", "Date of Birth", "date")}
//           {renderEditableRow("address", "Address")}
//           {renderEditableRow("employeeID", "Employee ID")}
//           {renderEditableRow("role", "Role")}
//           {renderEditableRow("documentNumber", "Document Number")}
//           {renderEditableRow("shareCode", "Share Code")}
//           <tr>
//             <td><strong>Member Since</strong></td>
//             <td>
//               {editableField === "createdAt" ? (
//                 <>
//                   <input
//                     type="date"
//                     className="input-field"
//                     value={updatedValue}
//                     onChange={(e) => setUpdatedValue(e.target.value)}
//                     autoFocus
//                   />
//                   {error && <div className="error-message">{error}</div>}
//                 </>
//               ) : (
//                 <>
//                   {user.createdAt}{" "}
//                   <span style={{ color: "gray", fontSize: "0.9em" }}>
//                     {calculateTimeAgo(user.createdAt)}
//                   </span>
//                 </>
//               )}
//             </td>
//             <td>
//               {editableField === "createdAt" ? (
//                 <button className="save-button" onClick={handleSaveClick}>
//                   Save
//                 </button>
//               ) : (
//                 <button
//                   className="edit-button"
//                   onClick={() => handleEditClick("createdAt", user.createdAt)}
//                 >
//                   Edit
//                 </button>
//               )}
//             </td>
//           </tr>
//           {renderBankDetailRow("accountNumber", "Account Number")}
//           {renderBankDetailRow("ifsc", "IFSC Code")}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default UserDetails;

// src/pages/admin/UserDetails.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import "../../css/UserDetails.css";

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editableField, setEditableField] = useState(null);
  const [updatedValue, setUpdatedValue] = useState("");
  const [error, setError] = useState("");
  const [changedFields, setChangedFields] = useState({});
const [successMessage, setSuccessMessage] = useState("");

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
          ? memberSinceDate.toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
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
          bankDetails: userData.bank_details || {},
          documentNumber: userData.document_number,
          shareCode: userData.shareCode,
          changedFields: userData.changedFields || {},
        });
        setChangedFields(userData.changedFields || {});
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };

    loadUser();
  }, [id]);

  const validateField = (field, value) => {
    if (field === "id") {
      if (!/^\d+$/.test(value)) return "Customer ID must be a valid number";
    }
    if (field === "employeeID") {
      if (value.trim() !== "" && !/^\d{5}$/.test(value)) return "Employee ID must be exactly 5 digits";
    }
    if (field === "email") {
      if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) return "Invalid email address";
    }
    if (field === "phone") {
      if (!/^\d{10}$/.test(value)) return "Phone number must be 10 digits";
    }
    if ((field === "dob" || field === "createdAt") && !value) {
      return "Date cannot be empty";
    }
    if (value.trim() === "" && field !== "employeeID") {
      return "Field cannot be empty";
    }
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
      const querySnapshot = await getDocs(collection(db, "users_01"));
      if (editableField === "id" || editableField === "employeeID") {
        const existingId = querySnapshot.docs.some(doc => {
          const data = doc.data();
          if (editableField === "id" && data.customer_id === updatedValue) return true;
          if (editableField === "employeeID" && data.employeeID === updatedValue) return true;
          return false;
        });
        if (existingId) {
          setError(`${editableField === "id" ? "Customer ID" : "Employee ID"} already exists.`);
          return;
        }
      }

      if (editableField === "email") {
        const existingEmail = querySnapshot.docs.some(doc => {
          const data = doc.data();
          return data.email === updatedValue && data.customer_id !== user.id;
        });
        if (existingEmail) {
          setError("Email already exists.");
          return;
        }
      }

      const ref = doc(db, "users_01", id);
const snap = await getDoc(ref);
const existingData = snap.exists() ? snap.data() : {};
const previousChangedFields = existingData.changedFields || {};
const newChangedFields = { ...previousChangedFields };

let oldValue;
let updateKey;

if (editableField === "id") {
  oldValue = existingData.customer_id;
  updateKey = "customer_id";
} else if (editableField === "createdAt") {
  oldValue = existingData.member_since;
  updateKey = "member_since";
} else if (Object.keys(existingData.bank_details || {}).includes(editableField)) {
  oldValue = existingData.bank_details[editableField];
  updateKey = `bank_details.${editableField}`;
} else {
  oldValue = existingData[editableField];
  updateKey = editableField;
}

if (oldValue !== updatedValue) {
  newChangedFields[editableField] = {
    old: oldValue,
    new: updatedValue,
  };
}

const updatedData = {
  [updateKey]: editableField === "createdAt" ? new Date(updatedValue) : updatedValue,
  changedFields: newChangedFields,
};

await updateDoc(ref, updatedData);

setChangedFields(newChangedFields);
setEditableField(null);
setUpdatedValue("");
setError("");
setSuccessMessage("Changes saved successfully!");


      navigate("/admin/users", {
        state: {
          reload: true,
          message: "Changes saved successfully!",
        },
      });
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user details. Please try again.");
    }
  };

  if (!user) return <p style={{ padding: "20px" }}>Loading user data...</p>;

  const renderEditableRow = (fieldName, label, type = "text") => (
    <tr ref={editableField === fieldName ? editRef : null}>
      <td><strong>{label}</strong></td>
      <td>
        {editableField === fieldName ? (
          <input
            type={type}
            className="input-field"
            value={updatedValue}
            onChange={(e) => setUpdatedValue(e.target.value)}
            autoFocus
          />
        ) : (
          <>
            {user[fieldName] || "N/A"}
            {changedFields[fieldName] && (
              <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
                (New)
              </span>
            )}
          </>
        )}
        {editableField === fieldName && error && (
          <div className="error-message">{error}</div>
        )}
      </td>
      <td>
        {editableField === fieldName ? (
          <button className="save-button" onClick={handleSaveClick}>Save</button>
        ) : (
          <button className="edit-button" onClick={() => handleEditClick(fieldName, user[fieldName])}>
            Edit
          </button>
        )}
      </td>
    </tr>
  );

  const renderBankDetailRows = () => {
    if (!user.bankDetails) return null;
    return Object.keys(user.bankDetails).map((field) => (
      <tr key={field} ref={editableField === field ? editRef : null}>
        <td><strong>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</strong></td>
        <td>
          {editableField === field ? (
            <>
              <input
                type="text"
                className="input-field"
                value={updatedValue}
                onChange={(e) => setUpdatedValue(e.target.value)}
                autoFocus
              />
              {error && <div className="error-message">{error}</div>}
            </>
          ) : (
            <>
              {user.bankDetails[field] || "N/A"}
              {changedFields[field] && (
                <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
                  (New)
                </span>
              )}
            </>
          )}
        </td>
        <td>
          {editableField === field ? (
            <button className="save-button" onClick={handleSaveClick}>Save</button>
          ) : (
            <button className="edit-button" onClick={() => handleEditClick(field, user.bankDetails[field])}>
              Edit
            </button>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className="employee-details-container">
      <h2>User Details</h2>
      <button style={{ width: "150px" }} className="back-button" onClick={() => navigate("/admin/users")}>
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
          {renderEditableRow("id", "User ID (Customer ID)", "text")}
          {renderEditableRow("name", "Name")}
          {renderEditableRow("phone", "Phone", "tel")}
          {renderEditableRow("email", "Email", "email")}
          {renderEditableRow("dob", "Date of Birth", "date")}
          {renderEditableRow("address", "Address")}
          {renderEditableRow("employeeID", "Employee ID")}
          {renderEditableRow("role", "Role")}
          {renderEditableRow("documentNumber", "Document Number")}
          {renderEditableRow("shareCode", "Share Code")}
          <tr>
            <td><strong>Member Since</strong></td>
            <td>
              {user.createdAt}
              {changedFields.createdAt && (
                <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
                  (New)
                </span>
              )}
            </td>
            <td></td>
          </tr>
          {renderBankDetailRows()}
        </tbody>
      </table>
    </div>
  );
};

export default UserDetails;

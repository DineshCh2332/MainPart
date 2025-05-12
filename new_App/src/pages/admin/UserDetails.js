// // src/pages/admin/UserDetails.js
// import React, { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { db } from "../../firebase/config";
// import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
// import "../../css/UserDetails.css";

// const UserDetails = () => {
//   const { userId } = useParams();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [editableField, setEditableField] = useState(null);
//   const [updatedValue, setUpdatedValue] = useState("");
//   const [error, setError] = useState("");
//   const [changedFields, setChangedFields] = useState({});
//   const [successMessage, setSuccessMessage] = useState("");

//   const editRef = useRef(null);



//   useEffect(() => {
//     const loadUser = async () => {
//       try {
//         const userRef = doc(db, "users_01", userId);
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
//           ? memberSinceDate.toLocaleString('en-US', {
//             weekday: 'long',
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit',
//             second: '2-digit',
//             hour12: true,
//           })
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
//           changedFields: userData.changedFields || {},
//         });
//         setChangedFields(userData.changedFields || {});
//       } catch (error) {
//         console.error("Error loading user:", error);
//       }
//     };

//     loadUser();
//   }, [id]);

//   const validateField = (field, value) => {
//     if (field === "id") {
//       if (!/^\d+$/.test(value)) return "Customer ID must be a valid number";
//     }
//     if (field === "employeeID") {
//       if (value.trim() !== "" && !/^\d{5}$/.test(value)) return "Employee ID must be exactly 5 digits";
//     }
//     if (field === "email") {
//       if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) return "Invalid email address";
//     }
//     if (field === "phone") {
//       if (!/^\d{10}$/.test(value)) return "Phone number must be 10 digits";
//     }
//     if ((field === "dob" || field === "createdAt") && !value) {
//       return "Date cannot be empty";
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

//     try {
//       const querySnapshot = await getDocs(collection(db, "users_01"));
//       if (editableField === "id" || editableField === "employeeID") {
//         const existingId = querySnapshot.docs.some(doc => {
//           const data = doc.data();
//           if (editableField === "id" && data.customer_id === updatedValue) return true;
//           if (editableField === "employeeID" && data.employeeID === updatedValue) return true;
//           return false;
//         });
//         if (existingId) {
//           setError(`${editableField === "id" ? "Customer ID" : "Employee ID"} already exists.`);
//           return;
//         }
//       }

//       if (editableField === "email") {
//         const existingEmail = querySnapshot.docs.some(doc => {
//           const data = doc.data();
//           return data.email === updatedValue && data.customer_id !== user.id;
//         });
//         if (existingEmail) {
//           setError("Email already exists.");
//           return;
//         }
//       }

//       if (editableField === "phone") {
//         const existingPhone = querySnapshot.docs.some(doc => {
//           const data = doc.data();
//           return data.phone === updatedValue && data.customer_id !== user.id;
//         });
//         if (existingPhone) {
//           setError("Phone number already exists.");
//           return;
//         }
//       }


//       const ref = doc(db, "users_01", id);
//       const snap = await getDoc(ref);
//       const existingData = snap.exists() ? snap.data() : {};
//       const previousChangedFields = existingData.changedFields || {};
//       const newChangedFields = { ...previousChangedFields };

//       let oldValue;
//       let updateKey;

//       if (editableField === "id") {
//         oldValue = existingData.customer_id;
//         updateKey = "customer_id";
//       } else if (editableField === "createdAt") {
//         oldValue = existingData.member_since;
//         updateKey = "member_since";
//       } else if (Object.keys(existingData.bank_details || {}).includes(editableField)) {
//         oldValue = existingData.bank_details[editableField];
//         updateKey = `bank_details.${editableField}`;
//       } else {
//         oldValue = existingData[editableField];
//         updateKey = editableField;
//       }

//       if (oldValue !== updatedValue) {
//         newChangedFields[editableField] = {
//           old: oldValue,
//           new: updatedValue,
//         };
//       }

//       const updatedData = {
//         [updateKey]: editableField === "createdAt" ? new Date(updatedValue) : updatedValue,
//         changedFields: newChangedFields,
//       };

//       await updateDoc(ref, updatedData);

//       setChangedFields(newChangedFields);
//       setEditableField(null);
//       setUpdatedValue("");
//       setError("");


//       navigate("/admin/users", {
//         state: {
//           reload: true,   
//         },
//       });
//     } catch (error) {
//       console.error("Error updating user:", error);
//       alert("Error updating user details. Please try again.");
//     }
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
//           <>
//             {user[fieldName] || "N/A"}
//             {changedFields[fieldName] && (
//               <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
//                 (New)
//               </span>
//             )}
//           </>
//         )}
//         {editableField === fieldName && error && (
//           <div className="error-message">{error}</div>
//         )}
//       </td>
//       <td>
//         {editableField === fieldName ? (
//           <button className="save-button" onClick={handleSaveClick}>Save</button>
//         ) : (
//           <button className="edit-button" onClick={() => handleEditClick(fieldName, user[fieldName])}>
//             Edit
//           </button>
//         )}
//       </td>
//     </tr>
//   );

//   const renderBankDetailRows = () => {
//     if (!user.bankDetails) return null;
//     return Object.keys(user.bankDetails).map((field) => (
//       <tr key={field} ref={editableField === field ? editRef : null}>
//         <td><strong>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</strong></td>
//         <td>
//           {editableField === field ? (
//             <>
//               <input
//                 type="text"
//                 className="input-field"
//                 value={updatedValue}
//                 onChange={(e) => setUpdatedValue(e.target.value)}
//                 autoFocus
//               />
//               {error && <div className="error-message">{error}</div>}
//             </>
//           ) : (
//             <>
//               {user.bankDetails[field] || "N/A"}
//               {changedFields[field] && (
//                 <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
//                   (New)
//                 </span>
//               )}
//             </>
//           )}
//         </td>
//         <td>
//           {editableField === field ? (
//             <button className="save-button" onClick={handleSaveClick}>Save</button>
//           ) : (
//             <button className="edit-button" onClick={() => handleEditClick(field, user.bankDetails[field])}>
//               Edit
//             </button>
//           )}
//         </td>
//       </tr>
//     ));
//   };

//   return (
//     <div className="employee-details-container">
//       <h2>User Details</h2>
//       <button style={{ width: "150px" }} className="back-button" onClick={() => navigate("/admin/users")}>
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
//      {/*change*/}
//      <tr>
//             <td><strong>Role</strong></td>
//             <td>
//               {editableField === "role" ? (
//                 <select 
//                   value={updatedValue} 
//                   onChange={(e) => setUpdatedValue(e.target.value)} 
//                   autoFocus
//                 >
//                   <option value="admin">admin</option>
//                   <option value="manager">manager</option>
//                   <option value="teamleader">teamleader</option>
//                   <option value="employee">employee</option>
//                   <option value="customer">customer</option>
//                 </select>
//               ) : (
//                 <>
//                   {user.role || "N/A"}
//                   {changedFields.role && (
//                     <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
//                       (New)
//                     </span>
//                   )}
//                 </>
//               )}
//             </td>
//             <td>
//               {editableField === "role" ? (
//                 <button className="save-button" onClick={handleSaveClick}>Save</button>
//               ) : (
//                 <button className="edit-button" onClick={() => handleEditClick("role", user.role)}>
//                   Edit
//                 </button>
//               )}
//             </td>
//           </tr>
//           {/*change*/}
//           {renderEditableRow("documentNumber", "Document Number")}
//           {renderEditableRow("shareCode", "Share Code")}
//           <tr>
//             <td><strong>Member Since</strong></td>
//             <td>
//               {user.createdAt}
//               {changedFields.createdAt && (
//                 <span style={{ color: "green", marginLeft: "10px", fontSize: "0.9em" }}>
//                   (New)
//                 </span>
//               )}
//             </td>
//             <td></td>
//           </tr>
//           {renderBankDetailRows()}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default UserDetails;


import React, { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from "firebase/firestore";
import { Dialog, Transition } from "@headlessui/react";

const displayValue = (value) => value || "N/A";

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [duplicateProfiles, setDuplicateProfiles] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    document_number: '',
    role: 'customer',
    member_since: '',
    shareCode: '',
    bank_details: {
      account_number: '',
      bank_name: '',
      branch_name: '',
      ifsc_code: ''
    },
    customerID: '',
    employeeID: ''
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const [usersSnapshot, customersSnapshot] = await Promise.all([
          getDocs(query(collection(db, "users_01"), where("userId", "==", userId))),
          getDocs(query(collection(db, "customers"), where("userId", "==", userId)))
        ]);

        const employees = usersSnapshot.docs.map(doc => ({
          ...doc.data(),
          idType: 'employee',
          originalRole: doc.data().role,
          phone: doc.id,
          originalCollection: 'users_01'
        }));

        const customers = customersSnapshot.docs.map(doc => ({
          ...doc.data(),
          idType: 'customer',
          role: 'customer',
          phone: doc.id,
          originalCollection: 'customers'
        }));

        const allProfiles = [...employees, ...customers];

        if (allProfiles.length > 1) {
          setDuplicateProfiles(allProfiles);
          return;
        }

        if (allProfiles.length === 0) {
          setError("User not found");
          return;
        }

        const profile = allProfiles[0];
        setUser(profile);
        setFormData(prev => ({
          ...prev,
          ...profile,
          bank_details: profile.bank_details || {},
          customerID: profile.customerID || '',
          employeeID: profile.employeeID || '',
          role: profile.originalCollection === 'customers' ? 'customer' : profile.role
        }));
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to load user data");
      }
    };

    fetchUser();
  }, [userId]);

  const trackEmployeeChanges = (originalData, newData) => {
    const changes = [];
    const fieldsToTrack = [
      'name', 'email', 'phone', 'address', 'dob', 'document_number',
      'member_since', 'shareCode', 'employeeID', 'role'
    ];

    fieldsToTrack.forEach(field => {
      const oldValue = originalData[field] ?? null;
      const newValue = newData[field] ?? null;
  
      if (oldValue !== newValue) {
        changes.push({
          field,
          oldValue,
          newValue,
          changedAt: new Date().toISOString(),
          changedBy: 'admin'
        });
      }
    });

    const bankFields = ['account_number', 'bank_name', 'branch_name', 'ifsc_code'];
    bankFields.forEach(field => {
      const originalValue = originalData.bank_details?.[field] || '';
      const newValue = newData.bank_details?.[field] || '';

      if (originalValue !== newValue) {
        changes.push({
          field: `bank_details.${field}`,
          oldValue: originalValue,
          newValue: newValue,
          changedAt: new Date().toISOString(),
          changedBy: 'admin'
        });
      }
    });

    return changes;
  };

  const handleProfileSelection = (selectedProfile) => {
    setUser(selectedProfile);
    setDuplicateProfiles([]);
    setFormData(prev => ({
      ...prev,
      ...selectedProfile,
      bank_details: selectedProfile.bank_details || {},
      customerID: selectedProfile.customerID || '',
      employeeID: selectedProfile.employeeID || '',
      role: selectedProfile.originalCollection === 'customers' ? 'customer' : selectedProfile.role
    }));
  };

  const handleEdit = () => setIsEditOpen(true);

  const handleSave = async () => {
    try {
      const requiredFields = {
        name: 'Name is required',
        email: 'Email is required',
        phone: 'Phone number is required',
        role: 'Role is required'
      };

      for (const [field, message] of Object.entries(requiredFields)) {
        if (!formData[field]) {
          setError(message);
          return;
        }
      }

      if (formData.role === 'customer' && !formData.customerID) {
        setError("Customer ID is required");
        return;
      }

      if (formData.role !== 'customer' && !formData.employeeID) {
        setError("Employee ID is required");
        return;
      }

      const [customerDoc, employeeDoc] = await Promise.all([
        getDoc(doc(db, "customers", formData.phone)),
        getDoc(doc(db, "users_01", formData.phone))
      ]);

      const updates = [];
      let employeeChanges = [];
      let isConvertingToCustomer = false;

      const commonData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        dob: formData.dob,
        document_number: formData.document_number,
        bank_details: formData.bank_details,
        member_since: formData.member_since || new Date().toISOString(),
        shareCode: formData.shareCode,
        updatedAt: new Date(),
        userId: formData.userId
      };

     // Handle Customer Updates/Creation
     if (customerDoc.exists()) {
      const existingCustomerData = customerDoc.data();
      const customerUpdate = {
        ...commonData,
        role: 'customer',
        // Preserve customerID unless we're actively updating customer role
        customerID: formData.role === 'customer' 
          ? formData.customerID 
          : existingCustomerData.customerID
      };
      delete customerUpdate.employeeID;
      delete customerUpdate.changeField;

      updates.push(
        updateDoc(doc(db, "customers", formData.phone), customerUpdate)
      );
    }

    // Handle Employee Updates/Creation
    if (employeeDoc.exists()) {
      const existingEmployeeData = employeeDoc.data();
      const employeeUpdate = {
        ...commonData,
        role: formData.role !== 'customer' ? formData.role : existingEmployeeData.role,
        // Preserve employeeID unless we're actively updating employee role
        employeeID: formData.role !== 'customer' 
          ? formData.employeeID 
          : existingEmployeeData.employeeID
      };

      if (formData.role !== 'customer') {
        employeeChanges = trackEmployeeChanges(existingEmployeeData, employeeUpdate);
        employeeUpdate.changeField = arrayUnion(...employeeChanges);
      }

      updates.push(
        updateDoc(doc(db, "users_01", formData.phone), employeeUpdate)
      );
    }
       // Handle new document creation
    if (!customerDoc.exists() && formData.role === 'customer') {
      const customerData = {
        ...commonData,
        role: 'customer',
        customerID: formData.customerID
      };
      delete customerData.employeeID;
      delete customerData.changeField;

      updates.push(
        setDoc(doc(db, "customers", formData.phone), customerData)
      );
    }

    if (!employeeDoc.exists() && formData.role !== 'customer') {
      const empQuery = query(collection(db, "users_01"),
        where("employeeID", "==", formData.employeeID));
      const empSnapshot = await getDocs(empQuery);

      if (!empSnapshot.empty) {
        setError("Employee ID already exists");
        return;
      }

      const employeeData = {
        ...commonData,
        role: formData.role,
        employeeID: formData.employeeID,
        changeField: arrayUnion(...trackEmployeeChanges({}, formData))
      };

      updates.push(
        setDoc(doc(db, "users_01", formData.phone), employeeData)
      );
    }
      // Handle role conversions
      if (formData.role === 'customer' && employeeDoc?.exists()) {
        updates.push(
          updateDoc(doc(db, "users_01", formData.phone), {
            status: "archived",
            archivedAt: new Date(),
            originalRole: employeeDoc.data().role
          })
        );
        isConvertingToCustomer = true;
      }

      if (formData.role !== 'customer' && customerDoc?.exists()) {
        updates.push(
          updateDoc(doc(db, "customers", formData.phone), {
            status: "converted-to-employee",
            convertedAt: new Date()
          })
        );
      }

      await Promise.all(updates);

      // Update local state
      setUser(prev => ({
        ...prev,
        ...formData,
        changeField: formData.role !== 'customer' ? [...(prev.changeField || []), ...employeeChanges] : [],
        originalRole: isConvertingToCustomer ? employeeDoc.data().role : prev.originalRole
      }));

      setSuccessMessage("User updated successfully!");
      setTimeout(() => navigate("/admin/users"), 1000);
    } catch (err) {
      console.error("Update error:", err);
      setError(`Failed to update user: ${err.message}`);
    }
  };

  const ChangeAwareDisplay = ({ field, value, changes }) => {
    if (!changes || changes.length === 0) return <span>{displayValue(value)}</span>;
    
    const latestChange = changes
      .filter(c => c.field === field || c.field.startsWith(`${field}.`))
      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))[0];

    if (!latestChange) return <span>{displayValue(value)}</span>;

    return (
      <div className="flex items-center gap-2">
        <span>{displayValue(latestChange.newValue)}</span>
        <span className="text-green-600 text-sm font-medium">(new)</span>
      </div>
    );
  };

  if (duplicateProfiles.length > 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-red-600">Duplicate Profiles Found</h2>
          <p className="text-gray-600">Select which profile to view:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duplicateProfiles.map((profile, index) => (
              <button
                key={index}
                onClick={() => handleProfileSelection(profile)}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {profile.idType === 'customer' ? '👤 Customer' : '👨💼 Employee'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(profile.member_since).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Phone: {profile.phone}</p>
                  <p className="text-sm">
                    ID: {profile.idType === 'customer' ? profile.customerID : profile.employeeID}
                  </p>
                  <p className="text-sm">Role: <span className="capitalize">{profile.role}</span></p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Details</h1>
        <button
          onClick={handleEdit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Edit User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <p className="mt-1 font-mono">{displayValue(user.userId)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {user.idType === 'customer' ? 'Customer ID' : 'Employee ID'}
            </label>
            <p className="mt-1 font-mono">
              {displayValue(user.idType === 'customer' ? user.customerID : user.employeeID)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="name"
                value={user.name}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="email"
                value={user.email}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <p className="mt-1">{displayValue(user.phone)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 capitalize">{displayValue(user.role)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="address"
                value={user.address}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="dob"
                value={user.dob}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Document Number</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="document_number"
                value={user.document_number}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Since</label>
            <p className="mt-1">{displayValue(new Date(user.member_since).toLocaleDateString())}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Share Code</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="shareCode"
                value={user.shareCode}
                changes={user?.changeField || []}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.bank_name"
                value={user.bank_details?.bank_name}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.account_number"
                value={user.bank_details?.account_number}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Branch Name</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.branch_name"
                value={user.bank_details?.branch_name}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.ifsc_code"
                value={user.bank_details?.ifsc_code}
                changes={user?.changeField || []}
              />
            </div>
          </div>
        </div>
      </div>

      <Transition appear show={isEditOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsEditOpen(false)}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">Edit User</Dialog.Title>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Edit form fields */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Name*</label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email*</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone*</label>
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Role*</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full p-2 border rounded"
                      >
                        <option value="customer">Customer</option>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="teamleader">Team Leader</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {formData.role === 'customer' ? (
                      <div>
                        <label className="block text-sm font-medium mb-1">Customer ID*</label>
                        <input
                          value={formData.customerID}
                          onChange={(e) => setFormData({...formData, customerID: e.target.value})}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-1">Employee ID*</label>
                        <input
                          value={formData.employeeID}
                          onChange={(e) => setFormData({...formData, employeeID: e.target.value})}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <input
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({...formData, dob: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Document Number</label>
                      <input
                        value={formData.document_number}
                        onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Share Code</label>
                      <input
                        value={formData.shareCode}
                        onChange={(e) => setFormData({...formData, shareCode: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bank Name</label>
                      <input
                        value={formData.bank_details.bank_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: {...formData.bank_details, bank_name: e.target.value}
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Number</label>
                      <input
                        value={formData.bank_details.account_number}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: {...formData.bank_details, account_number: e.target.value}
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Branch Name</label>
                      <input
                        value={formData.bank_details.branch_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: {...formData.bank_details, branch_name: e.target.value}
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IFSC Code</label>
                      <input
                        value={formData.bank_details.ifsc_code}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: {...formData.bank_details, ifsc_code: e.target.value}
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setIsEditOpen(false)}
                      className="px-4 py-2 border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default UserDetails;


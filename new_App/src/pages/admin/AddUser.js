import React, { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import "../../css/Form.css";
import { Timestamp } from "firebase/firestore";

const initialState = {
  name: "",
  phone: "",
  email: "",
  dob: "",
  customer_id: "",
  employeeID: "",
  address: "",
  member_since: "",
  role: "customer",
  bank_details: {
    account_number: "",
    bank_name: "",
    branch_name: "",
    ifsc_code: "",
  },
  document_number: "",
  shareCode: "",
  countryCode: "+91",  // 
};

const AddUser = () => {
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const showError = (message) => {
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (formData.role === "customer") {
      setFormData((prev) => ({ ...prev, employeeID: "" }));
    }
  }, [formData.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("bank_")) {
      const field = name.replace("bank_", "");
      setFormData((prev) => ({
        ...prev,
        bank_details: {
          ...prev.bank_details,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.name) return showError("Full Name is required."), false;
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) return showError("Phone number must be exactly 10 digits."), false;
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return showError("Please enter a valid email."), false;
    if (!formData.dob) return showError("Date of Birth is required."), false;
    if (!formData.customer_id || !/^[0-9]{9}$/.test(formData.customer_id)) return showError("Customer ID must be 9 digits."), false;
    if (!formData.employeeID || formData.employeeID.length !== 5) return showError("Employee ID must be exactly 5 digits."), false;
    return true;
  };

  const generateCustomerID = () => Math.floor(100000000 + Math.random() * 900000000).toString();
  const generateEmployeeID = () => Math.floor(10000 + Math.random() * 90000).toString();

  const checkForDuplicates = async () => {
    const usersCollection = collection(db, "users_01");

    // Check for duplicate Customer ID
    const qCustomerID = query(usersCollection, where("customer_id", "==", formData.customer_id));
    if (!(await getDocs(qCustomerID)).empty) return showError("A user with this Customer ID already exists."), true;

    // Check for duplicate Phone (combination of countryCode + phone)
    const qPhone = query(
      usersCollection,
      where("countryCode", "==", formData.countryCode),
      where("phone", "==", formData.phone)
    );
    if (!(await getDocs(qPhone)).empty) return showError("A user with this phone number already exists."), true;

    // Check for duplicate Email
    const qEmail = query(usersCollection, where("email", "==", formData.email));
    if (formData.email && !(await getDocs(qEmail)).empty) return showError("A user with this email already exists."), true;

    // Check for duplicate Employee ID (if employee)
    if (formData.role === "employee") {
      const qEmployeeID = query(usersCollection, where("employeeID", "==", formData.employeeID));
      if (!(await getDocs(qEmployeeID)).empty) return showError("A user with this Employee ID already exists."), true;
    }

    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showError("");

    if (!validateForm()) return;
    const isDuplicate = await checkForDuplicates();
    if (isDuplicate) return;

    try {
      const userCollection = collection(db, "users_01");
      // Save countryCode and phone as separate fields
      await addDoc(userCollection, { 
        ...formData,
        member_since: Timestamp.now() 
      });
      alert("User added successfully!");
      setFormData(initialState);
      navigate("/admin/users");
    } catch (err) {
      console.error("Error adding user:", err);
      showError("Error adding user. Please try again.");
    }
  };

  return (
    <div className="form-container">
      <button style={{ width: "150px" }} className="BackVutton" onClick={() => navigate("/admin/users")}>
        Back to Users
      </button>
      <h2>Add User</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Full Name</label>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required />
        </div>

        <div className="input-group">
          <label>Phone</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <select
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              style={{ marginRight: "10px" }}
            >
              <option value="+44">+44 (UK)</option>
              <option value="+91">+91 (India)</option>
            </select>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Email</label>
          <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
        </div>

        <div className="input-group">
          <label>Date of Birth</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
        </div>

        <div className="input-group" style={{ marginBottom: "20px" }}>
          <label>Customer ID</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input name="customer_id" value={formData.customer_id} onChange={handleChange} placeholder="Customer ID" required />
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, customer_id: generateCustomerID() }))}>
              Auto-Generate ID
            </button>
          </div>
        </div>

        <div className="input-group" style={{ marginTop: "20px" }}>
          <label>Employee ID</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              name="employeeID"
              value={formData.employeeID}
              onChange={handleChange}
              placeholder="Employee ID"
              required={formData.role !== "customer"}
            />
            {formData.role !== "customer" && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, employeeID: generateEmployeeID() }))}
              >
                Auto-Generate Employee ID
              </button>
            )}
          </div>
        </div>

        <div className="input-group">
          <label>Address</label>
          <input name="address" value={formData.address} onChange={handleChange} placeholder="Address" />
        </div>



        <div className="input-group">
          <label>Role</label>
          <select name="role" value={formData.role} onChange={handleChange}>
          <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="teamleader">Teamleader</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        <div className="input-group">
          <label>Bank Account Number</label>
          <input name="bank_account_number" value={formData.bank_details.account_number} onChange={handleChange} placeholder="Account Number" required />
        </div>

        <div className="input-group">
          <label>Bank Name</label>
          <input name="bank_bank_name" value={formData.bank_details.bank_name} onChange={handleChange} placeholder="Bank Name" required />
        </div>
        <div className="input-group">
          <label>Branch Name</label>
          <input name="bank_branch_name" value={formData.bank_details.branch_name} onChange={handleChange} placeholder="Branch Name" required />
        </div>

        <div className="input-group">
          <label>IFSC Code</label>
          <input name="bank_ifsc_code" value={formData.bank_details.ifsc_code} onChange={handleChange} placeholder="IFSC Code" required />
        </div>

        <div className="input-group">
          <label>Document Number</label>
          <input name="document_number" value={formData.document_number} onChange={handleChange} placeholder="Document Number" required />
        </div>

        <div className="input-group">
          <label>Share Code</label>
          <input name="shareCode" value={formData.shareCode} onChange={handleChange} placeholder="Share Code" />
        </div>

        <div className="form-actions">
          <button type="submit">Add User</button>
        </div>
      </form>
    </div>
  );
};

export default AddUser;



// import React, { useState, useEffect } from "react";
// import { db } from "../../firebase/config";
// import { useNavigate } from "react-router-dom";
// import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
// import "../../css/Form.css";
// import { Timestamp } from "firebase/firestore";

// const initialState = {
//   name: "",
//   phone: "",
//   email: "",
//   dob: "",
//   user_id: "",
//   employeeID: "",
//   address: "",
//   member_since: "",
//   role: "customer",
//   bank_details: {
//     account_number: "",
//     bank_name: "",
//     branch_name: "",
//     ifsc_code: "",
//   },
//   document_number: "",
//   shareCode: "",
//   countryCode: "+91",  // 
// };

// const AddUser = () => {
//   const [formData, setFormData] = useState(initialState);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const showError = (message) => {
//     setError(message);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   useEffect(() => {
//     if (formData.role === "customer") {
//       setFormData((prev) => ({ ...prev, employeeID: "" }));
//     }
//   }, [formData.role]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name.startsWith("bank_")) {
//       const field = name.replace("bank_", "");
//       setFormData((prev) => ({
//         ...prev,
//         bank_details: {
//           ...prev.bank_details,
//           [field]: value,
//         },
//       }));
//     } else {
//       setFormData((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const validateForm = () => {
//     if (!formData.name) return showError("Full Name is required."), false;
//     if (!formData.phone || !/^\d{10}$/.test(formData.phone)) return showError("Phone number must be exactly 10 digits."), false;
//     if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return showError("Please enter a valid email."), false;
//     if (!formData.dob) return showError("Date of Birth is required."), false;
//     if (!formData.user_id || !/^[0-9]{9}$/.test(formData.user_id)) return showError("User ID must be 9 digits."), false;
//     if (!formData.employeeID || formData.employeeID.length !== 5) return showError("Employee ID must be exactly 5 digits."), false;
//     return true;
//   };

//   const generateUserID = () => Math.floor(100000000 + Math.random() * 900000000).toString();
//   const generateEmployeeID = () => Math.floor(10000 + Math.random() * 90000).toString();

//   const checkForDuplicates = async () => {
//     const usersCollection = collection(db, "users_01");

//        // Check for duplicate User ID
//        const qUserID = query(usersCollection, where("user_id", "==", formData.user_id));  // Changed to user_id
//        if (!(await getDocs(qUserID)).empty) return showError("A user with this User ID already exists."), true;
   
   
//     // Check for duplicate Phone (combination of countryCode + phone)
//     const qPhone = query(
//       usersCollection,
//       where("countryCode", "==", formData.countryCode),
//       where("phone", "==", formData.phone)
//     );
//     if (!(await getDocs(qPhone)).empty) return showError("A user with this phone number already exists."), true;

//     // Check for duplicate Email
//     const qEmail = query(usersCollection, where("email", "==", formData.email));
//     if (formData.email && !(await getDocs(qEmail)).empty) return showError("A user with this email already exists."), true;

//     // Check for duplicate Employee ID (if employee)
//     if (formData.role === "employee") {
//       const qEmployeeID = query(usersCollection, where("employeeID", "==", formData.employeeID));
//       if (!(await getDocs(qEmployeeID)).empty) return showError("A user with this Employee ID already exists."), true;
//     }

//     return false;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     showError("");

//     if (!validateForm()) return;
//     const isDuplicate = await checkForDuplicates();
//     if (isDuplicate) return;

//     try {
//       const userCollection = collection(db, "users_01");
//       // Save countryCode and phone as separate fields
//       await addDoc(userCollection, { 
//         ...formData,
//         member_since: Timestamp.now() 
//       });
//       alert("User added successfully!");
//       setFormData(initialState);
//       navigate("/admin/users");
//     } catch (err) {
//       console.error("Error adding user:", err);
//       showError("Error adding user. Please try again.");
//     }
//   };

//   return (
//     <div className="form-container">
//       <button style={{ width: "150px" }} className="BackVutton" onClick={() => navigate("/admin/users")}>
//         Back to Users
//       </button>
//       <h2>Add User</h2>
//       {error && <p className="error">{error}</p>}
//       <form onSubmit={handleSubmit}>
//         <div className="input-group">
//           <label>Full Name</label>
//           <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required />
//         </div>

//         <div className="input-group">
//           <label>Phone</label>
//           <div style={{ display: "flex", alignItems: "center" }}>
//             <select
//               name="countryCode"
//               value={formData.countryCode}
//               onChange={handleChange}
//               style={{ marginRight: "10px" }}
//             >
//               <option value="+44">+44 (UK)</option>
//               <option value="+91">+91 (India)</option>
//             </select>
//             <input
//               type="tel"
//               name="phone"
//               value={formData.phone}
//               onChange={handleChange}
//               placeholder="Phone Number"
//               required
//             />
//           </div>
//         </div>

//         <div className="input-group">
//           <label>Email</label>
//           <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
//         </div>

//         <div className="input-group">
//           <label>Date of Birth</label>
//           <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
//         </div>

//         <div className="input-group" style={{ marginBottom: "20px" }}>
//           <label>User ID</label>  {/* Changed from Customer ID */}
//           <div style={{ display: "flex", alignItems: "center" }}>
//             <input name="user_id" value={formData.user_id} onChange={handleChange} placeholder="User ID" required />
//             <button type="button" onClick={() => setFormData((prev) => ({ ...prev, user_id: generateUserID() }))}>
//               Auto-Generate ID
//             </button>
//           </div>
//         </div>
//         <div className="input-group" style={{ marginTop: "20px" }}>
//           <label>Employee ID</label>
//           <div style={{ display: "flex", alignItems: "center" }}>
//             <input
//               name="employeeID"
//               value={formData.employeeID}
//               onChange={handleChange}
//               placeholder="Employee ID"
//               required={formData.role !== "customer"}
//             />
//             {formData.role !== "customer" && (
//               <button
//                 type="button"
//                 onClick={() => setFormData((prev) => ({ ...prev, employeeID: generateEmployeeID() }))}
//               >
//                 Auto-Generate Employee ID
//               </button>
//             )}
//           </div>
//         </div>

//         <div className="input-group">
//           <label>Address</label>
//           <input name="address" value={formData.address} onChange={handleChange} placeholder="Address" />
//         </div>



//         <div className="input-group">
//           <label>Role</label>
//           <select name="role" value={formData.role} onChange={handleChange}>
//             <option value="customer">Customer</option>
//             <option value="employee">Employee</option>
//             <option value="admin">Admin</option>
//             <option value="teamleader">Teamleader</option>
//             <option value="manager">Manager</option>
//           </select>
//         </div>

//         <div className="input-group">
//           <label>Bank Account Number</label>
//           <input name="bank_account_number" value={formData.bank_details.account_number} onChange={handleChange} placeholder="Account Number" required />
//         </div>

//         <div className="input-group">
//           <label>Bank Name</label>
//           <input name="bank_bank_name" value={formData.bank_details.bank_name} onChange={handleChange} placeholder="Bank Name" required />
//         </div>
//         <div className="input-group">
//           <label>Branch Name</label>
//           <input name="bank_branch_name" value={formData.bank_details.branch_name} onChange={handleChange} placeholder="Branch Name" required />
//         </div>

//         <div className="input-group">
//           <label>IFSC Code</label>
//           <input name="bank_ifsc_code" value={formData.bank_details.ifsc_code} onChange={handleChange} placeholder="IFSC Code" required />
//         </div>

//         <div className="input-group">
//           <label>Document Number</label>
//           <input name="document_number" value={formData.document_number} onChange={handleChange} placeholder="Document Number" required />
//         </div>

//         <div className="input-group">
//           <label>Share Code</label>
//           <input name="shareCode" value={formData.shareCode} onChange={handleChange} placeholder="Share Code" />
//         </div>

//         <div className="form-actions">
//           <button type="submit">Add User</button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default AddUser;

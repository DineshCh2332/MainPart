// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { collection, query, where, getDocs } from "firebase/firestore";
// import { db } from "./firebase"; // Your Firestore database instance

// const Login = () => {
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setError(""); // Reset any previous errors

//     try {
//       // Query Firestore to find the user with the phone number and password
//       const usersRef = collection(db, "users_01");
//       const q = query(usersRef, where("phone", "==", phone), where("password", "==", password));
//       const querySnapshot = await getDocs(q);

//       // If no matching user is found, show an error
//       if (querySnapshot.empty) {
//         setError("Invalid phone number or password.");
//         return;
//       }

//       // Get the user data from the Firestore document
//       const userData = querySnapshot.docs[0].data();
//       const role = userData.role;

//       // Redirect based on user role
//       switch (role) {
//         case "admin":
//           navigate("/admin/dashboard");
//           break;
//         case "manager":
//           navigate("/manager/dashboard");
//           break;
//         case "employee":
//           navigate("/employee/dashboard");
//           break;
//         case "customer":
//           navigate("/customer/dashboard");
//           break;
//         default:
//           setError("Invalid role detected.");
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Login failed. Please try again.");
//     }
//   };

//   return (
//     <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc" }}>
//       <h2>Login</h2>
//       <form onSubmit={handleLogin}>
//         <div>
//           <label>Phone:</label>
//           <input
//             type="text"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//             required
//           />
//         </div>
//         <div style={{ marginTop: "10px" }}>
//           <label>Password:</label>
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//           />
//         </div>
//         <button type="submit" style={{ marginTop: "20px" }}>
//           Login
//         </button>
//         {error && <p style={{ color: "red" }}>{error}</p>}
//       </form>
//     </div>
//   );
// };

// export default Login;


import React from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = (selectedRole) => {
    if (selectedRole === "admin") {
      navigate("/admin/dashboard");
    } else if (selectedRole === "manager") {
      navigate("/manager/dashboard");
    } else if (selectedRole === "teammember") {
      navigate("/teammember/dashboard");
    } else if (selectedRole === "teamMember") {
      navigate("/teamMember/dashboard");
    }else if (selectedRole === "teamleader") {
      navigate("/teamleader/dashboard");
    }
     else {
      alert("Please select a valid role.");
    }
  };

  return (
    <div className="flex items-center justify-center m-20">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">Select Role</h2>
        <div className="space-y-4">
          <button
            onClick={() => handleLogin("admin")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Admin
          </button>
          <button
            onClick={() => handleLogin("manager")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-green-700 transition"
          >
            Manager
          </button>
          <button onClick={() => handleLogin("teamleader")} style={{ width: "100%", padding: "10px" }}>
          Team Leader
        </button>
          <button onClick={() => handleLogin("teammember")} style={{ width: "100%", padding: "10px" ,marginBottom: "10px"}}>
          Team Member
        </button>
        
        </div>
      </div>
    </div>
  );
};

export default Login;

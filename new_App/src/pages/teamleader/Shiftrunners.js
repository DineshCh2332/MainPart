//  import React, { useEffect, useState, useCallback } from "react";
// import { db } from "../../firebase/config";
// import { collection, getDocs } from "firebase/firestore";
// import { useNavigate } from "react-router-dom";

// const Shiftrunners = () => {
//   // ... (keep all existing state and logic) ...
//   const [users, setUsers] = useState([]);
//   const [filteredUsers, setFilteredUsers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

//   const navigate = useNavigate();

//   // Load all users from Firestore and filter by employee role
//   const loadUsers = useCallback(async () => {
//     const userCollection = collection(db, "users_01");
//     try {
//       const snapshot = await getDocs(userCollection);
//       const rawUsers = snapshot.docs.map((doc) => ({
//         docId: doc.id,
//         ...doc.data(),
//       }));

//       // Only include Employees (you can adjust this based on your user data schema)
//       const employees = rawUsers.filter(
//         (user) => user.role?.toLowerCase() === "employee"
//       );

//       setUsers(employees);
//       setFilteredUsers(employees);
//     } catch (error) {
//       console.error("Error loading users:", error);
//     }
//   }, []);

//   // Filter users based on the search term
//   const filterUsers = useCallback(() => {
//     const search = searchTerm.toLowerCase();

//     const results = users.filter((user) => {
//       const name = (user.name || "").toLowerCase();
//       const role = (user.role || "").toLowerCase();
//       const phone = (user.phone || "").toLowerCase();
//       const userId = (user.userId || "N/A").toLowerCase();
//       const email = (user.email || "").toLowerCase();
//       const address = (user.address || "").toLowerCase();

//       return (
//         name.includes(search) ||
//         role.includes(search) ||
//         phone.includes(search) ||
//         userId.includes(search) ||
//         email.includes(search) ||
//         address.includes(search)
//       );
//     });

//     setFilteredUsers(results);
//   }, [searchTerm, users]);

//   // Fetch users when the component mounts or when the list changes
//   useEffect(() => {
//     loadUsers();
//   }, [loadUsers]);

//   // Filter users whenever the search term changes
//   useEffect(() => {
//     filterUsers();
//   }, [searchTerm, filterUsers]);

//   // Sort users based on a specific column
//   const sortUsers = (key) => {
//     let direction = "asc";
//     if (sortConfig.key === key && sortConfig.direction === "asc") {
//       direction = "desc";
//     }

//     const sortedUsers = [...filteredUsers].sort((a, b) => {
//       if ((a[key] || "") < (b[key] || "")) return direction === "asc" ? -1 : 1;
//       if ((a[key] || "") > (b[key] || "")) return direction === "asc" ? 1 : -1;
//       return 0;
//     });

//     setSortConfig({ key, direction });
//     setFilteredUsers(sortedUsers);
//   };

//   // Display sort direction arrows
//   const renderSortArrow = (column) => {
//     if (sortConfig.key === column) {
//       return sortConfig.direction === "asc" ? "↑" : "↓";
//     }
//     return "";
//   };



//   return (
//     <div className="p-6 bg-white min-h-screen">
//       <div className="mx-auto">
//         {/* Header Section */}
//         <div className="flex justify-between items-center mb-6">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
//             <div className="flex gap-4 mt-2">
//               <span className="text-sm text-gray-600">Total Shiftrunners: {users.length}</span>
//             </div>
//           </div>
//           <div className="flex gap-4">
//             <input
//               type="text"
//               placeholder="Search across all users..."
//               className="px-4 py-2 border rounded w-64 text-sm"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//         </div>

//         {/* Shiftrunners Table */}
//         <div className="border rounded">
//           <div className="bg-gray-50 px-4 py-3 border-b">
//             <h2 className="font-semibold text-gray-700">Shiftrunners ({users.length})</h2>
//           </div>
          
//           <table className="w-full">
//             <thead className="bg-white border-b">
//               <tr>
//                 {["USER ID", "NAME", "PHONE", "ROLE"].map((header, index) => (
//                   <th
//                     key={index}
//                     className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer"
//                     onClick={() => sortUsers(header.toLowerCase().replace(' ', '_'))}
//                   >
//                     <div className="flex items-center">
//                       {header}
//                       <span className="ml-2 text-xs">
//                         {renderSortArrow(header.toLowerCase().replace(' ', '_'))}
//                       </span>
//                     </div>
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filteredUsers.length === 0 ? (
//                 <tr>
//                   <td colSpan="4" className="px-4 py-4 text-center text-gray-500 text-sm">
//                     No shiftrunners found
//                   </td>
//                 </tr>
//               ) : (
//                 filteredUsers.map((user) => (
//                   <tr
//                     key={user.userId}
//                     onClick={() => navigate(`/teamleader/shiftrunners/${user.userId}`)}
//                     className="hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
//                   >
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.userId || "N/A"}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.name || "N/A"}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.phone || "N/A"}</td>
//                     <td className="px-4 py-3">
//                       <span className={`px-2 py-1 text-xs rounded-full capitalize ${
//                         user.role === 'admin' ? 'bg-red-100 text-red-800' :
//                         user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
//                         user.role === 'teamleader' ? 'bg-green-100 text-green-800' :
//                         'bg-gray-100 text-gray-800'
//                       }`}>
//                         {user.role || "N/A"}
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Shiftrunners;


import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

const Shiftrunners = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [roleOptions, setRoleOptions] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const loadUsers = useCallback(async () => {
    const userCollection = collection(db, "users_01");
    try {
      const snapshot = await getDocs(userCollection);
      const rawUsers = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));

      const employeesAndTeamLeaders = rawUsers.filter(
        (user) =>
          user.role?.toLowerCase() === "teammember" ||
          user.role?.toLowerCase() === "teamleader"
      );

      const uniqueRoles = [
        ...new Set(
          employeesAndTeamLeaders
            .map((user) => {
              const role = user.role?.toLowerCase();
              if (role === "teammember") return "Team Member";
              if (role === "teamleader") return "Team Leader";
              return user.role;
            })
            .filter(Boolean)
        ),
      ].sort();

      setUsers(employeesAndTeamLeaders);
      setFilteredUsers(employeesAndTeamLeaders);
      setRoleOptions(uniqueRoles);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  const filterUsers = useCallback(() => {
    const search = searchTerm.toLowerCase();
    let role = roleFilter.toLowerCase();
    if (role === "team member") role = "teammember";
    if (role === "team leader") role = "teamleader";

    const results = users.filter((user) => {
      const userId = (user.userId || "N/A").toLowerCase();
      const name = (user.name || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();
      const userRole = (user.role || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const address = (user.address || "").toLowerCase();

      const matchesRole = !role || userRole === role;

      const matchesSearch =
        !search ||
        userId.includes(search) ||
        name.includes(search) ||
        phone.includes(search) ||
        userRole.includes(search) ||
        email.includes(search) ||
        address.includes(search);

      return matchesRole && matchesSearch;
    });

    setFilteredUsers(results);
  }, [roleFilter, searchTerm, users]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Apply role filter from navigation
  useEffect(() => {
    if (location.state?.filterRole) {
      setRoleFilter(location.state.filterRole);
    }
  }, [location.state]);

  useEffect(() => {
    filterUsers();
  }, [roleFilter, searchTerm, filterUsers]);

  const sortUsers = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      const aValue = (a[key] || "").toString().toLowerCase();
      const bValue = (b[key] || "").toString().toLowerCase();
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setSortConfig({ key, direction });
    setFilteredUsers(sortedUsers);
  };

  const renderSortArrow = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "";
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-gray-600">
                Total Employees: {filteredUsers.length}
              </span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search across all users..."
              className="px-4 py-2 border rounded w-64 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border rounded text-sm"
            >
              <option value="">All Roles</option>
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-white border-b">
              <tr>
                {["USER ID", "NAME", "PHONE", "ROLE"].map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                    onClick={() =>
                      sortUsers(header.toLowerCase().replace(" ", "_"))
                    }
                  >
                    <div className="flex items-center">
                      {header}
                      <span className="ml-2 text-xs">
                        {renderSortArrow(header.toLowerCase().replace(" ", "_"))}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-4 text-center text-gray-500 text-sm"
                  >
                    No team members or team leaders found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.docId}
                    onClick={() => navigate(`/teamleader/Shiftrunners/${user.userId}`)}
                    className="hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.userId || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.phone || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${
                          user.role?.toLowerCase() === "teamleader"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role?.toLowerCase() === "teammember"
                          ? "Team Member"
                          : user.role?.toLowerCase() === "teamleader"
                          ? "Team Leader"
                          : user.role || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Shiftrunners;

import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Shiftrunners= () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  const navigate = useNavigate();

  // Load all users from Firestore and filter by employee role
  const loadUsers = useCallback(async () => {
    const userCollection = collection(db, "users_01");
    try {
      const snapshot = await getDocs(userCollection);
      const rawUsers = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));

      // Only include Employees (you can adjust this based on your user data schema)
      const employees = rawUsers.filter(
        (user) => user.role?.toLowerCase() === "employee"
      );

      setUsers(employees);
      setFilteredUsers(employees);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  // Filter users based on the search term
  const filterUsers = useCallback(() => {
    const search = searchTerm.toLowerCase();

    const results = users.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();
      const userId = (user.userId || "N/A").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const address = (user.address || "").toLowerCase();

      return (
        name.includes(search) ||
        role.includes(search) ||
        phone.includes(search) ||
        userId.includes(search) ||
        email.includes(search) ||
        address.includes(search)
      );
    });

    setFilteredUsers(results);
  }, [searchTerm, users]);

  // Fetch users when the component mounts or when the list changes
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users whenever the search term changes
  useEffect(() => {
    filterUsers();
  }, [searchTerm, filterUsers]);

  // Sort users based on a specific column
  const sortUsers = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      if ((a[key] || "") < (b[key] || "")) return direction === "asc" ? -1 : 1;
      if ((a[key] || "") > (b[key] || "")) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setSortConfig({ key, direction });
    setFilteredUsers(sortedUsers);
  };

  // Display sort direction arrows
  const renderSortArrow = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "";
  };

  return (
    <div className="users-container">
      <h1 className="users-heading">Employees</h1>

      {/* Total Employee Count */}
      <h2 className="employee-count">Total Employees: {users.length}</h2>

      <div className="top-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name, phone, UserId..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th onClick={() => sortUsers("userId")}>
              User ID {renderSortArrow("userId")}
            </th>
            <th onClick={() => sortUsers("name")}>
              Name {renderSortArrow("name")}
            </th>
            <th onClick={() => sortUsers("phone")}>
              Phone {renderSortArrow("phone")}
            </th>
            <th onClick={() => sortUsers("role")}>
              Role {renderSortArrow("role")}
            </th>
           
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="6" className="no-users">No employees found</td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.userId} onClick={() => navigate(`/teamleader/shiftrunners/${user.userId}`)}>
                <td>{user.userId || "N/A"}</td>
                <td>{user.name || "N/A"}</td>
                <td>{user.phone || "N/A"}</td>
                <td>{user.role || "N/A"}</td>
        
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Shiftrunners;

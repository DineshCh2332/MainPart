// src/pages/admin/Users.js
import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import "../../css/Users.css";
import { useNavigate, useLocation } from "react-router-dom";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const [roleCounts, setRoleCounts] = useState({
    Employee: 0,
    Customer: 0,
    Admin: 0,
    TeamLeader: 0,
    Manager: 0,
  });
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const navigate = useNavigate();

  const calculateRoleCounts = (usersList) => {
    const counts = { Employee: 0, Customer: 0, Admin: 0, TeamLeader: 0, Manager: 0 };
    usersList.forEach((user) => {
      const role = user.role?.toLowerCase();
      if (role === "employee") counts.Employee++;
      if (role === "customer") counts.Customer++;
      if (role === "admin") counts.Admin++;
      if (role === "teamleader") counts.TeamLeader++;
      if (role === "manager") counts.Manager++;
    });
    setRoleCounts(counts);
  };

  const loadUsers = useCallback(async () => {
    const userCollection = collection(db, "users_01");
    try {
      const snapshot = await getDocs(userCollection);
      const rawUsers = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));
      setUsers(rawUsers);
      setFilteredUsers(rawUsers);
      calculateRoleCounts(rawUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  const filterUsers = useCallback(() => {
    const search = searchTerm.toLowerCase();
    const normalizedRoleFilter = roleFilter.toLowerCase();
    const results = users.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();
      const userId = (user.customer_id || "N/A").toLowerCase();
      const matchesSearch = name.includes(search) || role.includes(search) || phone.includes(search) || userId.includes(search);
      const matchesRole = normalizedRoleFilter === "all" || role === normalizedRoleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredUsers(results);
  }, [searchTerm, users, roleFilter]);

  const sortUsers = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
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

  // ✅ Trigger reload when redirected from UserDetails
  useEffect(() => {
    if (location.state?.reload) {
      loadUsers();
      if (location.state.message) {
        alert(location.state.message);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loadUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users, roleFilter, filterUsers]);

  return (
    <div className="users-container">
      <h1 className="users-heading">Users</h1>
      <div className="add-buttons">
        <button className="add-btn" onClick={() => navigate("/admin/users/add-employee")}>
          ➕ Add User
        </button>
      </div>

      <div className="user-summary">
        <p>Total Users: <strong>{roleCounts.Employee + roleCounts.Customer + roleCounts.TeamLeader + roleCounts.Admin + roleCounts.Manager}</strong></p>
        <p>Employees: <strong>{roleCounts.Employee}</strong></p>
        <p>Customers: <strong>{roleCounts.Customer}</strong></p>
        <p>Teamleaders: <strong>{roleCounts.TeamLeader}</strong></p>
        <p>Admins: <strong>{roleCounts.Admin}</strong></p>
        <p>Managers: <strong>{roleCounts.Manager}</strong></p>
      </div>

      <div className="top-controls">
        <div className="filter-container">
          <label htmlFor="roleFilter">Filter by Role:</label>
          <select
            className="role-filter"
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="teamleader">Team Leader</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name, phone, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th onClick={() => sortUsers("customer_id")}>User ID {renderSortArrow("customer_id")}</th>
            <th onClick={() => sortUsers("name")}>Name {renderSortArrow("name")}</th>
            <th onClick={() => sortUsers("phone")}>Phone {renderSortArrow("phone")}</th>
            <th onClick={() => sortUsers("role")}>Role {renderSortArrow("role")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="4" className="no-users">No users found</td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.docId} onClick={() => navigate(`/admin/user/${user.docId}`)}>
                <td>{user.customer_id || "N/A"}</td>
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

export default Users;

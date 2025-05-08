// src/pages/admin/Users.js
import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, query } from "firebase/firestore";
import "../../css/Users.css";
import { useNavigate, useLocation } from "react-router-dom";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const [roleCounts, setRoleCounts] = useState({
    Admin: 0,
    Manager: 0,
    TeamLeader: 0,
    Employee: 0,
    Customer: 0
  });

  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const calculateRoleCounts = (usersList) => {
    const counts = {Admin: 0, Manager: 0 ,TeamLeader: 0,  Employee: 0, Customer: 0 };
    usersList.forEach((user) => {
      const role = user.role?.toLowerCase();
      if (role === "admin") counts.Admin++;
      if (role === "manager") counts.Manager++;
      if (role === "teamleader") counts.TeamLeader++;
      if (role === "employee") counts.Employee++;
      if (role === "customer") counts.Customer++;
    });
    setRoleCounts(counts);
  };

  const loadUsers = useCallback(async () => {
    try {
      const userCollection = collection(db, "users_01");
      const userQuery = query(userCollection);
      const snapshot = await getDocs(userQuery);
      const rawUsers = snapshot.docs.map((doc) => ({
        docId: doc.id,
        name: doc.data().name || "N/A",
        phone: doc.data().phone || "N/A",
        countryCode: doc.data().countryCode || "+91", // Add countryCode
        role: doc.data().role || "N/A",
        customer_id: doc.data().customer_id || "N/A",
      }));
      setUsers(rawUsers);
      setFilteredUsers(rawUsers);
      calculateRoleCounts(rawUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  
  const filterUsers = useCallback(() => {
    const search = debouncedSearch.toLowerCase();
    const normalizedRoleFilter = roleFilter.toLowerCase();

    const results = users.filter((user) => {
      const name = user.name.toLowerCase();
      const role = user.role.toLowerCase();
      const phone = user.phone.toLowerCase();
      const userId = user.customer_id.toLowerCase();
      const matchesSearch =
        name.includes(search) || role.includes(search) || phone.includes(search) || userId.includes(search);
      const matchesRole = normalizedRoleFilter === "all" || role === normalizedRoleFilter;
      return matchesSearch && matchesRole;
    });

    const sortedUsers = results.sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      if (a[sortConfig.key] < b[sortConfig.key]) return -1 * direction;
      if (a[sortConfig.key] > b[sortConfig.key]) return 1 * direction;
      return 0;
    });

    setFilteredUsers(sortedUsers);
  }, [users, debouncedSearch, roleFilter, sortConfig]);

  const sortUsers = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "";
  };

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  useEffect(() => {
    filterUsers();
  }, [debouncedSearch, users, roleFilter, sortConfig, filterUsers]);

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

   /*change*/
   useEffect(() => {
    // Store and clear state only once on initial mount
    const reload = location.state?.reload;
    const message = location.state?.message;
  
    if (reload) {
      // Show the message once
      if (message) {
        alert(message);
      }
  
      // Clear the state using navigate replace
      navigate(location.pathname, { replace: true });
    }
  
    loadUsers(); // always load users on mount
  }, []); /*change*/
  

  return (
    <div className="users-container">
      <h1 className="users-heading">Users</h1>
      <div className="add-buttons">
        <button className="add-btn" onClick={() => navigate("/admin/users/add-employee")}>
          ➕ Add User
        </button>
      </div>

      <div className="user-summary">
        <p>Total Users: <strong>{Object.values(roleCounts).reduce((a, b) => a + b, 0)}</strong></p>
        <p>Admins: <strong>{roleCounts.Admin}</strong></p>
        <p>Managers: <strong>{roleCounts.Manager}</strong></p>
        <p>Teamleaders: <strong>{roleCounts.TeamLeader}</strong></p>
        <p>Employees: <strong>{roleCounts.Employee}</strong></p>
        <p>Customers: <strong>{roleCounts.Customer}</strong></p>
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
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="teamleader">Team Leader</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
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
                <td>{user.customer_id}</td>
                <td>{user.name}</td>
                <td>{user.countryCode} {user.phone}</td>
                <td>{user.role}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
export default Users;

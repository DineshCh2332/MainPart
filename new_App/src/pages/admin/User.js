

import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, query } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

const Users = () => {
  // State management
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all"); // New user type filter
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Set roleFilter from navigation state on mount
  React.useEffect(() => {
    if (location.state?.filterRole) {
      setRoleFilter(location.state.filterRole);
      // Clear the filterRole from state to avoid reapplying on re-renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Role counts state
  const [roleCounts, setRoleCounts] = useState({
    Admin: 0,
    Manager: 0,
    TeamLeader: 0,
    Teammember: 0, // Changed from Employee to Teammember
    Customer: 0
  });

  // Sorting configuration
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  // Calculate role counts
  const calculateRoleCounts = (employeesList, customersList) => {
    const counts = {
      Admin: 0,
      Manager: 0,
      TeamLeader: 0,
      Teammember: 0, // Changed from Employee to Teammember
      Customer: customersList.length
    };

    employeesList.forEach((user) => {
      const role = user.role?.toLowerCase();
      if (role === "admin") counts.Admin++;
      if (role === "manager") counts.Manager++;
      if (role === "teamleader") counts.TeamLeader++;
      if (role === "teammember") counts.Teammember++; // Changed from employee to teammember
    });

    setRoleCounts(counts);
  };

  // Load users data
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const userSnapshot = await getDocs(query(collection(db, "users_01")));
      const employeesData = userSnapshot.docs.map((doc) => ({
        docId: doc.id,
        userId: doc.data().userId || "N/A",
        name: doc.data().name || "N/A",
        phone: doc.data().phone || "N/A",
        countryCode: doc.data().countryCode || "+91",
        role: doc.data().role || "N/A",
        source: "employee"
      }));

      // Fetch customers
      const customerSnapshot = await getDocs(query(collection(db, "customers")));
      const customersData = customerSnapshot.docs.map((doc) => ({
        docId: doc.id,
        userId: doc.data().userId || "N/A",
        name: doc.data().name || "N/A",
        phone: doc.data().phone || "N/A",
        countryCode: doc.data().countryCode || "+91",
        role: "Customer",
        source: "customer"
      }));

      setEmployees(employeesData);
      setCustomers(customersData);
      calculateRoleCounts(employeesData, customersData);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter and sort data
  const filterData = useCallback(() => {
    const search = debouncedSearch.toLowerCase();
    const normalizedRoleFilter = roleFilter.toLowerCase();

    // Filter employees
    const filteredEmps = employees.filter((user) => {
      if (userTypeFilter === 'customers') return false;
      
      const matchesSearch = [
        user.name.toLowerCase(),
        user.phone.toLowerCase(),
        user.userId.toLowerCase(),
        user.role.toLowerCase()
      ].some(field => field.includes(search));

      const matchesRole = normalizedRoleFilter === "all" || 
        user.role.toLowerCase() === normalizedRoleFilter;

      return matchesSearch && matchesRole;
    });

    // Filter customers
    const filteredCusts = customers.filter((customer) => {
      if (userTypeFilter === 'employees') return false;
      
      return [
        customer.name.toLowerCase(),
        customer.phone.toLowerCase(),
        customer.userId.toLowerCase()
      ].some(field => field.includes(search));
    });

    // Sort employees
    const sortedEmps = [...filteredEmps].sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      const aValue = a[sortConfig.key]?.toLowerCase?.() || a[sortConfig.key];
      const bValue = b[sortConfig.key]?.toLowerCase?.() || b[sortConfig.key];
      return aValue.localeCompare(bValue) * direction;
    });

    // Sort customers
    const sortedCusts = [...filteredCusts].sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      const aValue = a[sortConfig.key]?.toLowerCase?.() || a[sortConfig.key];
      const bValue = b[sortConfig.key]?.toLowerCase?.() || b[sortConfig.key];
      return aValue.localeCompare(bValue) * direction;
    });

    setFilteredEmployees(sortedEmps);
    setFilteredCustomers(sortedCusts);
  }, [employees, customers, debouncedSearch, roleFilter, sortConfig, userTypeFilter]);

  // Sorting handlers
  const sortUsers = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const renderSortArrow = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return null;
  };

  // Search debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Filter when dependencies change
  useEffect(() => {
    filterData();
  }, [debouncedSearch, filterData]);

  // Initial load and reload handling
  useEffect(() => {
    const reload = location.state?.reload;
    const message = location.state?.message;

    if (reload) {
      if (message) {
        alert(message);
      }
      navigate(location.pathname, { replace: true });
    }

    loadUsers();
  }, [loadUsers, location, navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          onClick={() => navigate("/admin/users/add-employee")}
        >
          <span className="mr-2">+</span> Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Users</h3>
          <p className="text-2xl font-bold">
            {employees.length + customers.length}
          </p>
        </div>
        {Object.entries(roleCounts).map(([role, count]) => (
          <div key={role} className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">{role === "TeamLeader" ? "Team Leaders" : role === "Teammember" ? "Team Members" : role + "s"}</h3>
            <p className={`text-2xl font-bold ${
              role === "Admin" ? "text-purple-600" :
              role === "Manager" ? "text-blue-600" :
              role === "TeamLeader" ? "text-green-600" :
              role === "Teammember" ? "text-yellow-600" : "text-red-600"
            }`}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <label htmlFor="userTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Show
            </label>
            <select
              id="userTypeFilter"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="employees">Employees Only</option>
              <option value="customers">Customers Only</option>
            </select>
          </div>
          
          {userTypeFilter !== 'customers' && (
            <div className="w-full md:w-1/3">
              <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                id="roleFilter"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Employees</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="teamleader">Team Leader</option>
                <option value="teammember">Team Member</option> {/* Changed from employee to teammember */}
              </select>
            </div>
          )}
          
          <div className="w-full md:w-1/3">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search across all users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      {userTypeFilter !== 'customers' && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Employees ({filteredEmployees.length})
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['userId', 'name', 'phone', 'role'].map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortUsers(column)}
                    >
                      <div className="flex items-center">
                        {column === 'userId' ? 'User ID' : column.charAt(0).toUpperCase() + column.slice(1)}
                        {renderSortArrow(column)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((user) => (
                  <tr
                    key={user.userId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/user/${user.userId}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.countryCode} {user.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role.toLowerCase() === 'manager' ? 'bg-blue-100 text-blue-800' :
                        user.role.toLowerCase() === 'teamleader' ? 'bg-green-100 text-green-800' :
                        user.role.toLowerCase() === 'teammember' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {userTypeFilter !== 'employees' && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Customers ({filteredCustomers.length})
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['userId', 'name', 'phone'].map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortUsers(column)}
                    >
                      <div className="flex items-center">
                        {column === 'userId' ? 'User ID' : column.charAt(0).toUpperCase() + column.slice(1)}
                        {renderSortArrow(column)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.userId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/user/${customer.userId}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.countryCode} {customer.phone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
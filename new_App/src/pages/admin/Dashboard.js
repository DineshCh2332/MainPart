import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleCounts, setRoleCounts] = useState({
    Admin: 0,
    Manager: 0,
    Teamleader: 0,
    Employee: 0,
    Customer: 0,
  });
  const location = useLocation();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      // Fetch users from users_01 collection
      const usersSnapshot = await getDocs(collection(db, "users_01"));
      const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // Fetch customers from customers collection
      const customersSnapshot = await getDocs(collection(db, "customers"));
      const customersData = customersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        role: doc.data().role || "customer" // Assume customer role if not specified
      }));

      // Combine both datasets
      const combinedData = [...usersData, ...customersData];

      // Set total users
      setTotalUsers(combinedData.length);

      // Count roles
      const counts = { Admin: 0, Manager: 0, Teamleader: 0, Employee: 0, Customer: 0 };
      combinedData.forEach(user => {
        const role = user.role ? user.role.toLowerCase() : "";
        if (role === "admin") counts.Admin++;
        else if (role === "manager") counts.Manager++;
        else if (role === "teamleader") counts.Teamleader++;
        else if (role === "employee") counts.Employee++;
        else if (role === "customer") counts.Customer++;
      });

      setRoleCounts(counts);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch again if redirected after update
  useEffect(() => {
    if (location.state?.reload) {
      fetchUsers();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Helper to navigate with filter
  const handleNavigateWithRole = (role) => {
    navigate("/admin/users", { state: { filterRole: role } });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <button
          className="bg-white p-6 rounded-lg shadow-md text-center w-full focus:outline-none"
          onClick={() => navigate("/admin/users")}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Total Users</h2>
          <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
        </button>
        <button
          className="bg-white p-6 rounded-lg shadow-md text-center w-full focus:outline-none"
          onClick={() => handleNavigateWithRole("admin")}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Admins</h2>
          <p className="text-2xl font-bold text-gray-900">{roleCounts.Admin}</p>
        </button>
        <button
          className="bg-white p-6 rounded-lg shadow-md text-center w-full focus:outline-none"
          onClick={() => handleNavigateWithRole("manager")}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Managers</h2>
          <p className="text-2xl font-bold text-gray-900">{roleCounts.Manager}</p>
        </button>
        <button
          className="bg-white p-6 rounded-lg shadow-md text-center w-full focus:outline-none"
          onClick={() => handleNavigateWithRole("teamleader")}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Team Leaders</h2>
          <p className="text-2xl font-bold text-gray-900">{roleCounts.Teamleader}</p>
        </button>
        <button
          className="bg-white p-6 rounded-lg shadow-md text-center w-full focus:outline-none"
          onClick={() => handleNavigateWithRole("employee")}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Team Members</h2>
          <p className="text-2xl font-bold text-gray-900">{roleCounts.Employee}</p>
        </button>
        <button
          className="bg-white p-6 rounded-lg shadow-md text-center w-full focus:outline-none"
          onClick={() => handleNavigateWithRole("customer")}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Customers</h2>
          <p className="text-2xl font-bold text-gray-900">{roleCounts.Customer}</p>
        </button>
      </div>
      <div className="text-center">
        <Link
          to="/admin/users"
          className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Manage Users
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
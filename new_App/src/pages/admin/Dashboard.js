// src/pages/admin/Dashboard.js
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Link, useLocation } from "react-router-dom";
import "../../css/AdminDashboard.css";

const Dashboard = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleCounts, setRoleCounts] = useState({
    Admin: 0,
    Manager: 0,
    Employee: 0,
    Customer: 0,
    Teamleader: 0,
  });
  const location = useLocation();

  const fetchUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, "users_01"));
    const usersData = usersSnapshot.docs.map(doc => doc.data());

    setTotalUsers(usersData.length);

    const counts = { Admin: 0, Manager: 0, Employee: 0, Customer: 0, Teamleader: 0 };
    usersData.forEach(user => {
      const role = user.role ? user.role.toLowerCase() : "";
      if (role === "manager") counts.Manager++;
      if (role === "employee") counts.Employee++;
      if (role === "customer") counts.Customer++;
      if (role === "teamleader") counts.Teamleader++;
      if (role === "admin") counts.Admin++;
    });

    setRoleCounts(counts);
  };

  // ✅ Fetch again if redirected after update
  useEffect(() => {
    if (location.state?.reload) {
      fetchUsers();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div className="overview">
        <div className="summary-box">
          <h2>Total Users</h2>
          <p>{totalUsers}</p>
        </div>
        <div className="summary-box">
          <h2>Managers</h2>
          <p>{roleCounts.Manager}</p>
        </div>
        <div className="summary-box">
          <h2>Employees</h2>
          <p>{roleCounts.Employee}</p>
        </div>
        <div className="summary-box">
          <h2>Customers</h2>
          <p>{roleCounts.Customer}</p>
        </div>
        <div className="summary-box">
          <h2>Team Leader</h2>
          <p>{roleCounts.Teamleader}</p>
        </div>
        <div className="summary-box">
          <h2>Admins</h2>
          <p>{roleCounts.Admin}</p>
        </div>
      </div>
      <div className="actions">
        <Link to="/admin/users" className="button">Manage Users</Link>
      </div>
    </div>
  );
};

export default Dashboard;

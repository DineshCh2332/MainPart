// src/pages/admin/Dashboard.js
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config"; // Ensure you have a firebase configuration in this file
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import "../../css/AdminDashboard.css"; // Assuming you have a CSS file for styling

const Dashboard = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleCounts, setRoleCounts] = useState({ Admin: 0, Manager: 0, Employee: 0, Customer: 0, Teamleader: 0 });

  // Fetch users and calculate role counts
  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users_01"));
      const usersData = usersSnapshot.docs.map(doc => doc.data());

      // Set total user count
      setTotalUsers(usersData.length);

      // Calculate role counts
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
          <p>{roleCounts.Admin}</p> {/* Added Admin count */}
        </div>
      </div>
      <div className="actions">
        <Link to="/admin/users" className="button">Manage Users</Link>
      </div>
    </div>
  );
};

export default Dashboard;
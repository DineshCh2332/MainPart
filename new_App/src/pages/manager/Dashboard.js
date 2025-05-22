import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [counts, setCounts] = useState({
    teamleader: 0,
    employee: 0,
    total: 0,
  });

  const navigate = useNavigate();

  const fetchEmployeeCount = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users_01"));
      const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // Filter only team leaders and employees
      const filteredUsers = usersData.filter(user => {
        const role = user.role?.toLowerCase();
        return role === "teamleader" || role === "employee";
      });

      const teamLeaderCount = filteredUsers.filter(user => user.role?.toLowerCase() === "teamleader").length;
      const employeeCount = filteredUsers.filter(user => user.role?.toLowerCase() === "employee").length;
      const total = teamLeaderCount + employeeCount;

      setCounts({
        teamleader: teamLeaderCount,
        employee: employeeCount,
        total,
      });
    } catch (error) {
      console.error("Error fetching role counts:", error);
    }
  };

  useEffect(() => {
    fetchEmployeeCount();
  }, []);

  // Helper to navigate with role filter
  const handleNavigateWithRole = (role) => {
    navigate("/manager/employees", { state: { filterRole: role } });
  };

  return (
    <div className="max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <div className="text-center text-black py-4 px-6 mb-6">
        <h2 className="text-2xl font-semibold">Manager Dashboard</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {/* Total Employees */}
          <div
            onClick={() => handleNavigateWithRole("")}
            className="bg-white p-6 rounded-lg shadow-md text-center hover:bg-gray-100 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Total Employees</h2>
            <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
          </div>

          {/* Team Leaders */}
          <div
            onClick={() => handleNavigateWithRole("Team Leader")}
            className="bg-white p-6 rounded-lg shadow-md text-center hover:bg-gray-100 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Team Leaders</h2>
            <p className="text-2xl font-bold text-gray-900">{counts.teamleader}</p>
          </div>

          {/* Team Members */}
          <div
            onClick={() => handleNavigateWithRole("Team Member")}
            className="bg-white p-6 rounded-lg shadow-md text-center hover:bg-gray-100 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Team Members</h2>
            <p className="text-2xl font-bold text-gray-900">{counts.employee}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

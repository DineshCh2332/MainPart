import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [employeeCount, setEmployeeCount] = useState(0);

  const fetchEmployeeCount = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users_01"));
      const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const employeeOnly = usersData.filter(user => user.role?.toLowerCase() === "employee");
      setEmployeeCount(employeeOnly.length);
    } catch (error) {
      console.error("Error fetching employee count:", error);
    }
  };

  useEffect(() => {
    fetchEmployeeCount();
  }, []);

  return (
    <div className="max-w-7xl mx-auto bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="text-center text-black py-4 px-6  mb-6">
        <h2 className="text-2xl font-semibold">Manager Dashboard</h2>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <Link to="/manager/employees" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md text-center hover:bg-gray-100 transition">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Employees</h2>
              <p className="text-2xl font-bold text-gray-900">{employeeCount}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

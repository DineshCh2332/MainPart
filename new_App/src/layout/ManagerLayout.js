// src/layouts/ManagerLayout.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Dashboard from "../pages/manager/Dashboard";
import Employees from "../pages/manager/Employees";
import Employee from "../pages/manager/EmployeeDetails"
import Menu from "../pages/manager/Menu";
import Orders from "../pages/manager/Orders";
import Reports from "../pages/manager/Reports";
import ManagerAttendance from "../pages/manager/ManagerAttendance";

// Inventory pages
import WasteManagement from "../pages/admin/inventory/WasteManagement";
import StockCount from "../pages/admin/inventory/StockCount";
import InventoryAndWasteHistory from "../pages/admin/inventory/StockMovement";

//Cash Management pages
import OpenCashier from "../pages/manager/cashManagement/OpenCashier";
import CloseCashier from "../pages/manager/cashManagement/CloseCashier"
import SafeCountPage from "../pages/manager/cashManagement/SafeCountPage";
import BankingPage from "../pages/manager/cashManagement/BankingPage";


const ManagerLayout = () => {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "1rem" }}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employee/:id" element={<Employee />} />
          <Route path="menu" element={<Menu />} />
          <Route path="orders" element={<Orders />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ManagerAttendance" element={<ManagerAttendance />} />


          {/* Inventory Management */}
          <Route path="inventory/wastemanagement" element={<WasteManagement />} />
          <Route path="inventory/stockcount" element={<StockCount />} />
          <Route path="inventory/stockmovement" element={<InventoryAndWasteHistory />} />

          {/*Cash Management */}
          <Route path="cashManagement/opencashier" element={<OpenCashier />} />
          <Route path="cashManagement/closecashier" element={<CloseCashier />} />
          <Route path="cashManagement/safecountpage" element={<SafeCountPage />} />
          <Route path="cashManagement/bankingpage" element={<BankingPage />} />

        </Routes>
      </div>
    </div>
  );
};

export default ManagerLayout;

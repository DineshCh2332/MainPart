// src/layouts/AdminLayout.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AddUser from "../pages/admin/AddUser";
import Dashboard from "../pages/admin/Dashboard";
import UserDetails from "../pages/admin/UserDetails";
import Users from "../pages/admin/User";
import AdminAttendance from "../pages/admin/AdminAttendance";


// Inventory pages
import WasteManagement from "../pages/admin/inventory/WasteManagement";
import StockCount from "../pages/admin/inventory/StockCount";
import InventoryAndWasteHistory from "../pages/admin/inventory/StockMovement";


//Cash Management pages
import OpenCashier from "../pages/admin/cashManagement/OpenCashier";
import CloseCashier from "../pages/admin/cashManagement/CloseCashier"
import SafeCountPage from "../pages/admin/cashManagement/SafeCountPage";
import BankingPage from "../pages/admin/cashManagement/BankingPage";

//customer tracking
import KOT from "../pages/admin/customerTracking/KOT";
//import Reports from "../pages/admin/customerTracking/Reports";
import CustomerReport from "../pages/admin/customerTracking/CustomerReport";

const AdminLayout = () => {
  return (
    <div className="bg-white min-h-screen">
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div className="flex-1 p-4">
          <Routes>
            {/* User Management */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="users/add-employee" element={<AddUser />} />
            <Route path="user/:id" element={<UserDetails />} />
            <Route path="AdminAttendance" element={<AdminAttendance />} />
            {/*<Route path="kot" element={<KOT />} />
            <Route path="reports" element={<Reports />} />
  <Route path="customerreport" element={<CustomerReport />} />*/}



            {/* Inventory Management */}
            <Route path="inventory/wastemanagement" element={<WasteManagement />} />
            <Route path="inventory/stockcount" element={<StockCount />} />
            <Route path="inventory/stockmovement" element={<InventoryAndWasteHistory />} />

            {/*Cash Management */}
            <Route path="cashManagement/opencashier" element={<OpenCashier/>}/>
            <Route path="cashManagement/closecashier" element={<CloseCashier/>} />
            <Route path="cashManagement/safecountpage" element={<SafeCountPage/>} />
            <Route path="cashManagement/bankingpage" element={<BankingPage/>} />

            <Route path="customerTracking/customerreport" element={<CustomerReport/>}/>
            <Route path="customerTracking/kot" element={<KOT />}/>

          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

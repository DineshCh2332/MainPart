// src/layouts/AdminLayout.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AddUser from "../pages/admin/AddUser";
import Dashboard from "../pages/admin/Dashboard";
import UserDetails from "../pages/admin/UserDetails";
import Users from "../pages/admin/User";
import AdminAttendance from "../pages/admin/AdminAttendance";
import ChangePhoneNumber from "../pages/admin/phoneNumberChange";

// Inventory pages
import WasteManagement from "../pages/admin/inventory/WasteManagement";
import StockCount from "../pages/admin/inventory/StockCount";
import InventoryAndWasteHistory from "../pages/admin/inventory/StockMovement";
import InventoryRecords from "../pages/admin/inventory/inventoryrecords";
import Addinventory from '../pages/admin/inventory/Addinventory'; // Adjust path based on your file structure




//Cash Management pages
import OpenCashier from "../pages/admin/cashManagement/OpenCashier";
import CloseCashier from "../pages/admin/cashManagement/CloseCashier"
import SafeCountPage from "../pages/admin/cashManagement/SafeCountPage";
import BankingPage from "../pages/admin/cashManagement/BankingPage";
import MoneyMovementPage from "../pages/admin/cashManagement/MoneyMovement";

//customer tracking
import KOT from "../pages/admin/customerTracking/KOT";
//import Reports from "../pages/admin/customerTracking/Reports";
import CustomerReport from "../pages/admin/customerTracking/CustomerReport";
//Items Management pages
import Categories from "../pages/admin/itemsManagement/categories";
import Sauces from "../pages/admin/itemsManagement/sauces";
import ItemsManager from "../pages/admin/itemsManagement/items";



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
            <Route path="user/:userId" element={<UserDetails />} />
            <Route path="user/changephoneNumber" element={<ChangePhoneNumber />} />
            <Route path="AdminAttendance" element={<AdminAttendance />} />
            {/*<Route path="kot" element={<KOT />} />
            <Route path="reports" element={<Reports />} />
  <Route path="customerreport" element={<CustomerReport />} />*/}



            {/* Inventory Management */}
            <Route path="inventory/wastemanagement" element={<WasteManagement />} />
            <Route path="inventory/stockcount" element={<StockCount />} />
            <Route path="inventory/stockmovement" element={<InventoryAndWasteHistory />} />
            <Route path="inventory/inventoryrecords" element={<InventoryRecords/>} />
            <Route path="inventory/addinventory" element={<Addinventory />} />



            {/*Cash Management */}
            <Route path="cashManagement/opencashier" element={<OpenCashier/>}/>
            <Route path="cashManagement/closecashier" element={<CloseCashier/>} />
            <Route path="cashManagement/safecountpage" element={<SafeCountPage/>} />
            <Route path="cashManagement/bankingpage" element={<BankingPage/>} />
            <Route path="cashManagement/moneymovementpage" element={<MoneyMovementPage/>} />

           
            <Route path="customerTracking/customerreport" element={<CustomerReport/>}/>
            <Route path="customerTracking/kot" element={<KOT />}/>

            {/*Items Management */}
            <Route path="itemsManagement/Categories" element={<Categories/>} />
            <Route path="itemsManagement/sauces" element={<Sauces/>} />
            <Route path="itemsManagement/items" element={<ItemsManager/>}/>
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

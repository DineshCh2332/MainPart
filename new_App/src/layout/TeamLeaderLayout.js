// src/layouts/teamleaderLayout.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/teamleader/Dashboard';
import Sidebar from '../components/Sidebar';
import Shiftrunners from '../pages/teamleader/Shiftrunners';
import Shiftrunnersdetails from '../pages/teamleader/Shiftrunnersdetails';
import Attendance from "../pages/teamleader/Attendance";
// Inventory pages
import WasteManagement from "../pages/admin/inventory/WasteManagement";
import StockCount from "../pages/admin/inventory/StockCount";
import InventoryAndWasteHistory from "../pages/admin/inventory/StockMovement";

//Cash Management pages
import OpenCashier from "../pages/teamleader/cashManagement/OpenCashier";
import CloseCashier from "../pages/teamleader/cashManagement/CloseCashier"
import SafeCountPage from "../pages/teamleader/cashManagement/SafeCountPage";
import BankingPage from "../pages/teamleader/cashManagement/BankingPage";


const TeamLeaderLayout = () => {
    return (

        <div style={{ display: "flex" }}>
            <Sidebar />
            <div style={{ flex: 1, padding: "1rem" }}>
                <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="shiftrunners" element={<Shiftrunners />} />
                    <Route path="shiftrunners/:id" element={<Shiftrunnersdetails />} />
                    <Route path="attendance" element={<Attendance />} />
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

export default TeamLeaderLayout;


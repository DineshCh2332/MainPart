// src/layouts/teamleaderLayout.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/teamleader/Dashboard';
import Sidebar  from '../components/Sidebar';
import Shiftrunners from '../pages/teamleader/Shiftrunners';
import Shiftrunnersdetails from '../pages/teamleader/Shiftrunnersdetails';
import Attendance from "../pages/teamleader/Attendance";
// Inventory pages
import WasteManagement from "../pages/admin/inventory/WasteManagement";
import StockCount from "../pages/admin/inventory/StockCount";
import InventoryAndWasteHistory from "../pages/admin/inventory/StockMovement";


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
                </Routes>
            </div>
        </div>
    );
};

export default TeamLeaderLayout;

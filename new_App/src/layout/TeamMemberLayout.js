// src/layouts/ManagerLayout.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ViewDetails from "../pages/teammember/ViewDetails";
import MemberAttendance from "../pages/teammember/MemberAttendance";



const TeamMemberLayout = () => {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "1rem" }}>
        <Routes>
          <Route path="ViewDetails" element={<ViewDetails/>} />
          <Route path="MemberAttendance" element={<MemberAttendance />} />
        </Routes>
      </div>
    </div>
  );
};

export default TeamMemberLayout;

// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import AdminLayout from "./layout/AdminLayout";
import ManagerLayout from "./layout/ManagerLayout";
import TeamLeaderLayout from "./layout/TeamLeaderLayout";
import TeamMemberLayout from "./layout/TeamMemberLayout";

const App = () => {
  return (
    <div className="bg-white min-h-screen text-gray-900">
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/manager/*" element={<ManagerLayout />} />
        <Route path="/teamleader/*" element={<TeamLeaderLayout />} /> 
        <Route path="/teammember/*" element={<TeamMemberLayout />} />
     
          {/* <Route path="/shiftrunner/*" element={<ShiftrunnerLayout />} /> */}
        </Routes>
      </Router>
    </div>
  );
};

export default App;

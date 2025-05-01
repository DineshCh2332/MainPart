// src/AppRoutes.js
import { Routes, Route } from "react-router-dom";
import { RoleRoute } from './components/ProtectedRoute';  // Correct named import
import Login from './Login';
import Unauthorized from './Unauthorized';
import AdminLayout from './layout/AdminLayout';
import ManagerLayout from './layout/ManagerLayout';
import TeamLeaderLayout from './layout/TeamLeaderLayout';
import TeamMemberLayout from './layout/TeamMemberLayout';
import { ProtectedRoute } from "./components/ProtectedRoute";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
                <RoleRoute role="admin">
                    <AdminLayout />
                </RoleRoute>
            } />

            {/* Manager Routes */}
            <Route path="/manager/*" element={
                <RoleRoute role="manager">
                    <ManagerLayout />
                </RoleRoute>
            } />

            {/* Team Leader Routes */}
            <Route path="/teamleader/*" element={
                <RoleRoute role="teamleader">
                    <TeamLeaderLayout />
                </RoleRoute>
            } />

            {/* Team Member Routes */}
      // src/AppRoutes.js - Verify this exact structure
            <Route path="/teammember/*" element={
                <ProtectedRoute allowedRoles={["teammember", "employee"]}>
                    <TeamMemberLayout />
                </ProtectedRoute>
            } />
        </Routes>
    );
};

export default AppRoutes;
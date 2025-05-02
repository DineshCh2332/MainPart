import { Routes, Route } from "react-router-dom";
import { RoleRoute, ProtectedRoute } from './components/ProtectedRoute';
import Login from './Login';
import Unauthorized from './Unauthorized';
import AdminLayout from './layout/AdminLayout';
import ManagerLayout from './layout/ManagerLayout';
import TeamLeaderLayout from './layout/TeamLeaderLayout';
import TeamMemberLayout from './layout/TeamMemberLayout';
import { ROLES } from './config/roles';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/admin/*" element={
        <RoleRoute role={ROLES.ADMIN}>
          <AdminLayout />
        </RoleRoute>
      }/>

      <Route path="/manager/*" element={
        <RoleRoute role={ROLES.MANAGER}>
          <ManagerLayout />
        </RoleRoute>
      }/>

      <Route path="/teamleader/*" element={
        <RoleRoute role={ROLES.TEAM_LEADER}>
          <TeamLeaderLayout />
        </RoleRoute>
      }/>

      <Route path="/teammember/*" element={
        <ProtectedRoute allowedRoles={[ROLES.TEAM_MEMBER, ROLES.EMPLOYEE]}>
          <TeamMemberLayout />
        </ProtectedRoute>
      }/>
    </Routes>
  );
};

export default AppRoutes;
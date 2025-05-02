import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLES } from '../config/roles';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const normalizedUserRole = user.role?.toLowerCase();
  const isAllowed = allowedRoles.some(role => 
    role.toLowerCase() === normalizedUserRole
  );

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const RoleRoute = ({ role, children }) => (
  <ProtectedRoute allowedRoles={[role]}>
    {children}
  </ProtectedRoute>
);
// src/components/ProtectedRoute.js
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

// src/components/ProtectedRoute.js
export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();
    const location = useLocation();
  
    if (!user) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
  
    // Normalize roles to lowercase
    const normalizedUserRole = user.role?.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
  
    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  
    return children;
  };

export const RoleRoute = ({ role, children }) => (
    <ProtectedRoute allowedRoles={[role]}>
      {children}
    </ProtectedRoute>
);
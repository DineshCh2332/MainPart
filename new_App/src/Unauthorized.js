// src/Unauthorized.js
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">401 - Unauthorized Access</h1>
        <p className="mb-4">
          You don't have permission to access this page.
        </p>
        <div className="space-x-4">
          {user && (
            <button
              onClick={() => navigate(`/${user.role}/dashboard`)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Go to Dashboard
            </button>
          )}
          <button
            onClick={logout}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
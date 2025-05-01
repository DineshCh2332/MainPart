import { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from '../config/roles';

const AuthContext = createContext();
const SESSION_TIMEOUT = 20 * 60 * 10000; // 20 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [inactivityTimer, setInactivityTimer] = useState(null);

  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    const newTimer = setTimeout(logout, SESSION_TIMEOUT);
    setInactivityTimer(newTimer);
    localStorage.setItem('lastActivity', Date.now());
  };

  const handleActivity = () => {
    if (user) resetTimer();
  };

  useEffect(() => {
    const initializeAuth = () => {
      const storedUser = localStorage.getItem('user');
      const lastActivity = localStorage.getItem('lastActivity');

      if (storedUser && lastActivity) {
        const parsedUser = JSON.parse(storedUser);
        const timeElapsed = Date.now() - parseInt(lastActivity, 10);

        if (timeElapsed < SESSION_TIMEOUT) {
          setUser(parsedUser);
          resetTimer();
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('lastActivity');
        }
      }
    };

    initializeAuth();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearTimeout(inactivityTimer);
    };
  }, []);

  const login = (userData) => {
    const userWithSession = {
      ...userData,
      role: userData.role?.toLowerCase(),
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(userWithSession));
    localStorage.setItem('lastActivity', Date.now());
    setUser(userWithSession);
    resetTimer();
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setUser(null);
    clearTimeout(inactivityTimer);
  };

  const value = {
    user,
    login,
    logout,
    isAdmin: user?.role === ROLES.ADMIN,
    isManager: user?.role === ROLES.MANAGER,
    isTeamLeader: user?.role === ROLES.TEAM_LEADER,
    isTeamMember: [ROLES.TEAM_MEMBER, ROLES.EMPLOYEE].includes(user?.role)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
// src/config/roles.js
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEADER: 'teamleader',
  EMPLOYEE: 'teammember'
};

export const ROLE_PATHS = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.MANAGER]: '/manager/dashboard',
  [ROLES.TEAM_LEADER]: '/teamleader/dashboard',
  [ROLES.TEAM_MEMBER]: '/teammember/viewdetails',
  [ROLES.EMPLOYEE]: '/teammember/viewdetails'
};

export const getDashboardPath = (role) => {
  const normalizedRole = role?.toLowerCase();
  return ROLE_PATHS[normalizedRole] || '/unauthorized';
};
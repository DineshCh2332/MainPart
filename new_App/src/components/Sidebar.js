import React, { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles';
import "../css/Sidebar.css";

const Sidebar = () => {
  const { user, logout, isAdmin, isManager, isTeamLeader } = useAuth();
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [loginTime, setLoginTime] = useState('');

  // Memoized role configuration
  const { links, panelTitle, inventoryBasePath } = useMemo(() => {
    const roleConfig = {
      links: [],
      panelTitle: "System Panel",
      inventoryBasePath: ""
    };

    if (!user) return roleConfig;

    switch(user.role) {
      case ROLES.ADMIN:
        roleConfig.links = [
          { name: "Dashboard", path: "/admin/dashboard" },
          { name: "User Management", path: "/admin/users" },
          { name: "Attendance Records", path: "/admin/AdminAttendance" }
        ];
        roleConfig.panelTitle = "Administration Panel";
        roleConfig.inventoryBasePath = "/admin";
        break;
      
      case ROLES.MANAGER:
        roleConfig.links = [
          { name: "Performance Dashboard", path: "/manager/dashboard" },
          { name: "Staff Directory", path: "/manager/employees" },
          { name: "Shift Attendance", path: "/manager/ManagerAttendance" }
        ];
        roleConfig.panelTitle = "Management Console";
        roleConfig.inventoryBasePath = "/manager";
        break;
      
      case ROLES.TEAM_LEADER:
        roleConfig.links = [
          { name: "Team Dashboard", path: "/teamleader/dashboard" },
          { name: "Shift Runners", path: "/teamleader/Shiftrunners" },
          { name: "Attendance Tracking", path: "/teamleader/attendance" }
        ];
        roleConfig.panelTitle = "Team Leadership";
        roleConfig.inventoryBasePath = "/teamleader";
        break;
      
      case ROLES.TEAM_MEMBER:
      case ROLES.EMPLOYEE:
        roleConfig.links = [
          { name: "My Profile", path: "/teammember/ViewDetails" },
          { name: "Attendance History", path: "/teammember/MemberAttendance" }
        ];
        roleConfig.panelTitle = user.role === ROLES.TEAM_MEMBER 
          ? "My Account Portal" 
          : "Employee Portal";
        break;
    }

    return roleConfig;
  }, [user]);

  // Login time formatting with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const updateTime = () => {
      if (user?.loginTime && isMounted) {
        const formatted = new Date(user.loginTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setLoginTime(formatted);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [user?.loginTime]);

  return (
    <div className="sidebar-container">
      {/* User Info Section */}
      <div className="user-info-section">
        <div className="user-details">
          <h3 className="user-name">{user?.name || 'Guest User'}</h3>
          <div className="user-meta">
            <span className="user-role">{user?.role || 'No Role Assigned'}</span>
            {loginTime && (
              <span className="login-time">Active since: {loginTime}</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="navigation-section">
        <h4 className="panel-title">{panelTitle}</h4>
        
        <nav className="main-navigation">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active-nav-item' : ''}`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Inventory Section */}
        {(isAdmin || isManager || isTeamLeader) && (
          <div className="inventory-section">
            <button 
              className={`inventory-toggle ${inventoryExpanded ? 'expanded' : ''}`}
              onClick={() => setInventoryExpanded(!inventoryExpanded)}
            >
              Inventory Management
              <span className="toggle-indicator">
                {inventoryExpanded ? '−' : '+'}
              </span>
            </button>
            
            {inventoryExpanded && (
              <div className="inventory-submenu">
                <NavLink
                  to={`${inventoryBasePath}/inventory/wastemanagement`}
                  className={({ isActive }) =>
                    `submenu-item ${isActive ? 'active-subitem' : ''}`
                  }
                >
                  Waste Management
                </NavLink>
                <NavLink
                  to={`${inventoryBasePath}/inventory/stockcount`}
                  className={({ isActive }) =>
                    `submenu-item ${isActive ? 'active-subitem' : ''}`
                  }
                >
                  Stock Audit
                </NavLink>
                <NavLink
                  to={`${inventoryBasePath}/inventory/stockmovement`}
                  className={({ isActive }) =>
                    `submenu-item ${isActive ? 'active-subitem' : ''}`
                  }
                >
                  Stock Movement
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logout Section */}
      <div className="logout-section">
        <button 
          onClick={logout}
          className="logout-button"
        >
          Secure Logout
        </button>
      </div>
    </div>
  );
};

export default React.memo(Sidebar);
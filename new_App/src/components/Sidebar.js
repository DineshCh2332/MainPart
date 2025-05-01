import React, { useState } from "react";
import { NavLink, useLocation ,useNavigate } from "react-router-dom";
import "../css/Sidebar.css";
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation(); 

  // Check which role the current user belongs to
  const isAdmin = location.pathname.startsWith("/admin");
  const isManager = location.pathname.startsWith("/manager");
  const isteamleader = location.pathname.startsWith("/teamleader");
  const isteamMember = location.pathname.startsWith("/teammember");

  const [inventoryExpanded, setInventoryExpanded] = useState(
    location.pathname.includes("inventory")
  );

  const handleLogout = () => {
    logout();
    navigate('/'); // Move navigation here
  };
  // Define different links for each role
  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Users", path: "/admin/users" },
    { name: "Attendance", path: "/admin/AdminAttendance" }
  ];

  const managerLinks = [
    { name: "Dashboard", path: "/manager/dashboard" },
    { name: "Employees", path: "/manager/employees" },
    { name: "Attendance", path: "/manager/ManagerAttendance" },
  ];

  const teamleaderLinks = [
    { name: "Dashboard", path: "/teamleader/dashboard" },
    { name: "Employees", path: "/teamleader/Shiftrunners" },
    { name: "Attendance", path: "/teamleader/attendance" }
  ];

  const teamMemberLinks = [
    { name: "ViewDetails", path: "/teammember/ViewDetails" },
    { name: "Attendance", path: "/teammember/MemberAttendance" },
  ];

  const links = isAdmin
    ? adminLinks
    : isManager
      ? managerLinks
      : isteamleader
        ? teamleaderLinks
        : isteamMember
          ? teamMemberLinks
          : [];

  // Dynamic title based on role
  const panelTitle = isAdmin
    ? "Admin Panel"
    : isManager
      ? "Manager Panel"
      : isteamleader
        ? "Team Leader Panel"
        : isteamMember
          ? "Team Member Panel"
          : "Panel";

  return (
    <div className="sidebar">
      <h3>{panelTitle}</h3>
      <ul className="sidebar-links">
        {links.map((link) => {
          if (link.name !== "Inventory") {
            return (
              <li key={link.path} className="sidebar-link-item">
                <NavLink
                  to={link.path}
                  className={({ isActive }) =>
                    isActive ? "sidebar-link-active" : "sidebar-link"
                  }
                >
                  {link.name}
                </NavLink>
              </li>
            );
          }
          return null;
        })}

        {(isAdmin || isManager || isteamleader) && (
          <li className="sidebar-link-item">
            <div
              className="sidebar-link"
              onClick={() => setInventoryExpanded((prev) => !prev)}
              style={{ cursor: "pointer" }}
            >
              Inventory {inventoryExpanded ? "▲" : "▼"}
            </div>
            {inventoryExpanded && (
              <ul className="sidebar-submenu">
                <li>
                  <NavLink
                    to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/inventory/wastemanagement`}
                    className={({ isActive }) =>
                      isActive ? "sidebar-link-active" : "sidebar-link"
                    }
                  >
                    Waste Management
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/inventory/stockcount`}
                    className={({ isActive }) =>
                      isActive ? "sidebar-link-active" : "sidebar-link"
                    }
                  >
                    Stock Count
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/inventory/stockmovement`}
                    className={({ isActive }) =>
                      isActive ? "sidebar-link-active" : "sidebar-link"
                    }
                  >
                    Stock Movement
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        )}
      </ul>

      <button onClick={handleLogout} className="sidebar-logout-button">
        Logout
      </button>
    </div>
  );
};

export default Sidebar;
import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import "../css/Sidebar.css";
import { auth } from "../firebase/config"; // Import Firebase auth

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.startsWith("/admin");
  const isManager = location.pathname.startsWith("/manager");
  const isteamleader = location.pathname.startsWith("/teamleader");
  const isteamMember = location.pathname.startsWith("/teammember");

  const [inventoryExpanded, setInventoryExpanded] = useState(
    location.pathname.includes("inventory")
  );
  const [cashManagementExpanded, setCashManagementExpanded] = useState(
    location.pathname.includes("cashmanagement")
  );

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Users", path: "/admin/users" },
    { name: "Menu", path: "/admin/menu" },
    { name: "Orders", path: "/admin/orders" },
    { name: "Approvals", path: "/admin/approvals" },
    { name: "Reports", path: "/admin/reports" },
    { name: "Attendance", path: "/admin/AdminAttendance" }
  ];

  const managerLinks = [
    { name: "Dashboard", path: "/manager/dashboard" },
    { name: "Employees", path: "/manager/employees" },
    { name: "Menu", path: "/manager/menu" },
    { name: "Orders", path: "/manager/orders" },
    { name: "Reports", path: "/manager/reports" },
    { name: "Attendance", path: "/manager/ManagerAttendance" }
  ];

  const teamleaderLinks = [
    { name: "Dashboard", path: "/teamleader/dashboard" },
    { name: "Employees", path: "/teamleader/Shiftrunners" },
    { name: "Menu", path: "/teamleader/menu" },
    { name: "Inventory", path: "/teamleader/inventory" },
    { name: "Orders", path: "/teamleader/orders" },
    { name: "Reports", path: "/teamleader/reports" },
    { name: "Attendance", path: "/teamleader/attendance" }
  ];

  const teamMemberLinks = [
    { name: "ViewDetails", path: "/teammember/ViewDetails" },
    { name: "Attendance", path: "/teammember/MemberAttendance" }
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

  const panelTitle = isAdmin
    ? "Admin Panel"
    : isManager
    ? "Manager Panel"
    : isteamleader
    ? "Team Leader Panel"
    : isteamMember
    ? "Team Member Panel"
    : "Panel";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
          <>
            {/* Inventory dropdown */}
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

            {/* Cash Management dropdown */}
            <li className="sidebar-link-item">
              <div
                className="sidebar-link"
                onClick={() => setCashManagementExpanded((prev) => !prev)}
                style={{ cursor: "pointer" }}
              >
                Cash{cashManagementExpanded ? "▲" : "▼"}
              </div>
              {cashManagementExpanded && (
                <ul className="sidebar-submenu">
                  <li>
                    <NavLink
                      to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/cashmanagement/opencashier`}
                      className={({ isActive }) =>
                        isActive ? "sidebar-link-active" : "sidebar-link"
                      }
                    >
                      Open Cashier
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/cashmanagement/closecashier`}
                      className={({ isActive }) =>
                        isActive ? "sidebar-link-active" : "sidebar-link"
                      }
                    >
                      Close Cashier
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/cashmanagement/safecountpage`}
                      className={({ isActive }) =>
                        isActive ? "sidebar-link-active" : "sidebar-link"
                      }
                    >
                      Safe Count
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={`/${isAdmin ? "admin" : isManager ? "manager" : "teamleader"}/cashmanagement/bankingpage`}
                      className={({ isActive }) =>
                        isActive ? "sidebar-link-active" : "sidebar-link"
                      }
                    >
                      Banking
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          </>
        )}
      </ul>

      <button onClick={handleLogout} className="sidebar-logout-button">
        Logout
      </button>
    </div>
  );
};

export default Sidebar;

import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Shiftrunners = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    const userCollection = collection(db, "users_01");
    try {
      const snapshot = await getDocs(userCollection);
      const rawUsers = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));

      // Filter only users with role "teammember"
      const teamMembers = rawUsers.filter(
        (user) => user.role?.toLowerCase() === "teammember"
      );

      setUsers(teamMembers);
      setFilteredUsers(teamMembers);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  const filterUsers = useCallback(() => {
    const search = searchTerm.toLowerCase();
    const results = users.filter((user) => {
      const userId = (user.userId || "N/A").toLowerCase();
      const name = (user.name || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();
      const userRole = (user.role || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const address = (user.address || "").toLowerCase();

      return (
        !search ||
        userId.includes(search) ||
        name.includes(search) ||
        phone.includes(search) ||
        userRole.includes(search) ||
        email.includes(search) ||
        address.includes(search)
      );
    });

    setFilteredUsers(results);
  }, [searchTerm, users]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Apply filters when search term changes
  useEffect(() => {
    filterUsers();
  }, [searchTerm, filterUsers]);

  const sortUsers = (key) => {
    // Map user_id to userId for Firestore field
    const sortKey = key === "user_id" ? "userId" : key;

    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      const aValue = (a[sortKey] || "").toString().toLowerCase();
      const bValue = (b[sortKey] || "").toString().toLowerCase();
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setSortConfig({ key, direction });
    setFilteredUsers(sortedUsers);
  };

  const renderSortArrow = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "";
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-gray-600">
                Total Team Members: {filteredUsers.length}
              </span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search across all team members..."
              className="px-4 py-2 border rounded w-64 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-white border-b">
              <tr>
                {["USER ID", "NAME", "PHONE", "ROLE"].map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                    onClick={() =>
                      sortUsers(header.toLowerCase().replace(" ", "_"))
                    }
                  >
                    <div className="flex items-center">
                      {header}
                      <span className="ml-2 text-xs">
                        {renderSortArrow(
                          header.toLowerCase().replace(" ", "_")
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-4 text-center text-gray-500 text-sm"
                  >
                    No team members found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.docId}
                    onClick={() =>
                      navigate(`/teamleader/Shiftrunners/${user.userId}`)
                    }
                    className="hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.userId || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.phone || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full capitalize bg-gray-100 text-gray-800">
                        Team Member
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Shiftrunners;
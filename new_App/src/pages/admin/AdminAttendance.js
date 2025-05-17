import React, { useState, useEffect } from 'react';
import { format, addWeeks, startOfWeek, isWithinInterval, isBefore } from 'date-fns';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const AdminAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState({ empId: "", checkInStr: "", checkOutStr: "" });
  const [employees, setEmployees] = useState([]);
  const [shiftStartDate, setShiftStartDate] = useState(new Date());
  const [shiftEndDate, setShiftEndDate] = useState(new Date());

  // Calculate editable date range (past Monday to next Monday)
  const currentDate = new Date();
  const lastMonday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const nextMonday = addWeeks(lastMonday, 1);
  const isDateEditable = (dateToCheck) => {
    return isWithinInterval(dateToCheck, {
      start: lastMonday,
      end: nextMonday
    });
  };

  const isEditableDate = isDateEditable(date);

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const empCollection = collection(db, "users_01");
      const empSnapshot = await getDocs(empCollection);
      const empList = empSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(emp => 
          emp.active && 
          ['employee', 'manager', 'teamleader'].includes(emp.role)
        );
      setEmployees(empList);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Calculate worked hours
  const calculateWorkedHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Incomplete";
    const duration = checkOut - checkIn;
    const hrs = Math.floor(duration / (1000 * 60 * 60));
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  // Fetch attendance data
  const fetchAttendanceData = async (selectedDate) => {
    setLoading(true);
    try {
      const yearMonth = format(selectedDate, 'yyyy-MM');
      const day = format(selectedDate, 'd');
      const allUsers = await getDocs(collection(db, "users_01"));
      const logs = [];

      for (const userDoc of allUsers.docs) {
        const userData = userDoc.data();
        if (!userData.active || !['employee', 'manager', 'teamleader'].includes(userData.role)) {
          continue;
        }

        const userId = userDoc.id;
        const attendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
        const attendanceSnap = await getDoc(attendanceRef);

        if (!attendanceSnap.exists()) continue;

        const daysMap = attendanceSnap.data().days || {};
        const dayData = daysMap[day];

        if (!dayData?.sessions?.length) continue;

        dayData.sessions.forEach((session, index) => {
          const checkIn = session.checkIn?.toDate();
          const checkOut = session.checkOut?.toDate();

          logs.push({
            empName: userData.name,
            checkInStr: checkIn ? format(checkIn, 'HH:mm') : '',
            checkOutStr: checkOut ? format(checkOut, 'HH:mm') : '',
            worked: calculateWorkedHours(checkIn, checkOut),
            empId: userId,
            sessionId: `${yearMonth}-${day}-${index}`,
            checkInTime: checkIn?.getTime() || 0,
            originalCheckIn: checkIn,
            originalCheckOut: checkOut,
            checkInEdited: session.checkInEdited || false,
            checkOutEdited: session.checkOutEdited || false,
          });
        });
      }

      setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save edited attendance
  const saveEdit = async (record) => {
    try {
      // Correctly parse sessionId
      const parts = record.sessionId.split('-');
      if (parts.length !== 4) {
        console.error("Invalid sessionId format:", record.sessionId);
        return;
      }
      const yearMonth = `${parts[0]}-${parts[1]}`; // e.g., "2025-05"
      const day = parts[2]; // e.g., "17"
      const index = parseInt(parts[3]); // e.g., 0
      const userId = record.empId;

      const userAttendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
      const userAttendanceSnap = await getDoc(userAttendanceRef);

      let days = {};
      let dayData = { sessions: [], isClockedIn: false };

      if (userAttendanceSnap.exists()) {
        const userData = userAttendanceSnap.data();
        days = { ...userData.days };
        dayData = days[day] ? { ...days[day] } : dayData;
      }

      const sessions = [...dayData.sessions];
      if (index >= sessions.length) {
        console.error("Session index out of bounds:", index);
        return;
      }

      const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);

      const newCheckIn = new Date(record.originalCheckIn || date);
      newCheckIn.setHours(checkInHour, checkInMinute);

      const newCheckOut = new Date(record.originalCheckOut || newCheckIn);
      newCheckOut.setHours(checkOutHour, checkOutMinute);

      if (isBefore(newCheckOut, newCheckIn)) {
        alert("Check-out time must be after check-in time!");
        return;
      }

      sessions[index] = {
        ...sessions[index],
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        editedBy: "Admin",
        editedAt: new Date(),
        checkInEdited: true,
        checkOutEdited: true
      };

      dayData.sessions = sessions;
      days[day] = {
        ...dayData,
        metadata: {
          created: days[day]?.metadata?.created || serverTimestamp(),
          lastUpdated: serverTimestamp()
        }
      };

      await setDoc(userAttendanceRef, { days }, { merge: true });
      setEditing(null);
      setEditData({});
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  // Delete shift
  const deleteShift = async (record) => {
    if (!window.confirm(`Delete shift for ${record.empName}?`)) return;

    try {
      // Correctly parse sessionId
      const parts = record.sessionId.split('-');
      if (parts.length !== 4) {
        console.error("Invalid sessionId format:", record.sessionId);
        return;
      }
      const yearMonth = `${parts[0]}-${parts[1]}`; // e.g., "2025-05"
      const day = parts[2]; // e.g., "17"
      const index = parseInt(parts[3]); // e.g., 0
      const userId = record.empId;

      const userAttendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
      const userAttendanceSnap = await getDoc(userAttendanceRef);
      if (!userAttendanceSnap.exists()) return;

      const userData = userAttendanceSnap.data();
      const days = { ...userData.days };
      const dayData = { ...days[day] };
      const sessions = [...dayData.sessions];

      if (index >= sessions.length) {
        console.error("Session index out of bounds:", index);
        return;
      }
      sessions.splice(index, 1);

      if (sessions.length === 0) {
        delete days[day];
      } else {
        dayData.sessions = sessions;
        days[day] = {
          ...dayData,
          metadata: {
            created: dayData.metadata?.created || serverTimestamp(),
            lastUpdated: serverTimestamp()
          }
        };
      }

      await updateDoc(userAttendanceRef, { days });
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error deleting shift:", error);
    }
  };

  // Add new attendance
  const addNewAttendance = async () => {
    try {
      if (!newData.empId || !newData.checkInStr || !newData.checkOutStr) {
        alert("Please fill all fields");
        return;
      }

      const userId = newData.empId;
      const yearMonth = format(shiftStartDate, 'yyyy-MM');
      const day = format(shiftStartDate, 'd');

      const [checkInHour, checkInMinute] = newData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = newData.checkOutStr.split(':').map(Number);

      const checkInDate = new Date(shiftStartDate);
      checkInDate.setHours(checkInHour, checkInMinute);
      const checkOutDate = new Date(shiftEndDate);
      checkOutDate.setHours(checkOutHour, checkOutMinute);

      if (isBefore(checkOutDate, checkInDate)) {
        alert("Check-out time must be after check-in time!");
        return;
      }

      const userAttendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
      const userAttendanceSnap = await getDoc(userAttendanceRef);

      let daysData = {};
      if (userAttendanceSnap.exists()) {
        daysData = userAttendanceSnap.data().days || {};
      }

      const dayData = daysData[day] || { sessions: [], isClockedIn: false };
      const newSession = {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        editedBy: "Admin",
        editedAt: new Date(),
        checkInEdited: false,
        checkOutEdited: false,
        status: "closed"
      };

      dayData.sessions = [...dayData.sessions, newSession];
      daysData[day] = {
        ...dayData,
        metadata: {
          created: daysData[day]?.metadata?.created || serverTimestamp(),
          lastUpdated: serverTimestamp()
        }
      };

      await setDoc(userAttendanceRef, { days: daysData }, { merge: true });
      setAddingNew(false);
      setNewData({ empId: "", checkInStr: "", checkOutStr: "" });
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error adding attendance:", error);
    }
  };

  // Fetch data on mount and when date changes
  useEffect(() => {
    fetchEmployees();
    fetchAttendanceData(date);
  }, [date]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">
            Attendance Management
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="p-2 border rounded-md text-sm bg-white shadow-sm"
              max={format(nextMonday, 'yyyy-MM-dd')}
              min={format(lastMonday, 'yyyy-MM-dd')}
            />
            {isEditableDate && (
              <button
                onClick={() => setAddingNew(!addingNew)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  addingNew
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {addingNew ? 'Cancel' : 'Add Attendance'}
              </button>
            )}
          </div>
        </div>

        {/* Editable Date Range Notice */}
        <div className="mb-6 text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
          Editable date range: {format(lastMonday, 'MMM dd')} -{' '}
          {format(nextMonday, 'MMM dd')}
        </div>

        {/* Attendance Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  {isEditableDate && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.empName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing === index ? (
                        <input
                          type="time"
                          value={editData.checkInStr}
                          onChange={(e) =>
                            setEditData({ ...editData, checkInStr: e.target.value })
                          }
                          className="border rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{record.checkInStr || '--:--'}</span>
                          {record.checkInEdited && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing === index ? (
                        <input
                          type="time"
                          value={editData.checkOutStr}
                          onChange={(e) =>
                            setEditData({ ...editData, checkOutStr: e.target.value })
                          }
                          className="border rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{record.checkOutStr || '--:--'}</span>
                          {record.checkOutEdited && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.worked}
                    </td>
                    {isEditableDate && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editing === index ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(record)}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs hover:bg-green-200"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditing(index);
                                setEditData({
                                  checkInStr: record.checkInStr,
                                  checkOutStr: record.checkOutStr
                                });
                              }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteShift(record)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {attendanceData.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                No attendance records found for this date
              </div>
            )}
          </div>
        )}

        {/* Add Attendance Form */}
        {addingNew && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Add New Attendance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Employee
                </label>
                <select
                  value={newData.empId}
                  onChange={(e) => setNewData({ ...newData, empId: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={format(shiftStartDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (isDateEditable(selectedDate)) {
                      setShiftStartDate(selectedDate);
                    }
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <input
                  type="time"
                  value={newData.checkInStr}
                  onChange={(e) =>
                    setNewData({ ...newData, checkInStr: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  value={format(shiftEndDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (isDateEditable(selectedDate)) {
                      setShiftEndDate(selectedDate);
                    }
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <input
                  type="time"
                  value={newData.checkOutStr}
                  onChange={(e) =>
                    setNewData({ ...newData, checkOutStr: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={addNewAttendance}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Add Attendance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAttendance;
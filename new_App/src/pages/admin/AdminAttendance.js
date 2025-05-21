import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import debounce from 'lodash/debounce';
import Select from 'react-select';

const AdminAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState({ userId: "", checkInStr: "", checkOutStr: "" });
  const [users, setUsers] = useState([]);
  const [shiftStartDate, setShiftStartDate] = useState(new Date());
  const [shiftEndDate, setShiftEndDate] = useState(new Date());
  const [errors, setErrors] = useState({ userId: "", checkInStr: "", checkOutStr: "" });

  // Calculate editable date range
  const currentDate = new Date();
  const lastMonday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const nextMonday = addWeeks(lastMonday, 1);
  const isDateEditable = (dateToCheck) => {
    return isWithinInterval(dateToCheck, { start: lastMonday, end: nextMonday });
  };
  const isEditableDate = isDateEditable(date);

  // Fetch all users from users_01
const fetchUsers = useCallback(async () => {
  try {
    const userCollection = collection(db, "users_01");
    const userSnapshot = await getDocs(userCollection);
    const userList = userSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(user => user.role !== "admin"); // Remove users with role 'admin'
    
    console.log("Filtered users (non-admin):", userList);
    setUsers(userList);
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}, []);


  // User options for searchable select (only names)
  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name
  }));

  // Calculate worked hours
  const calculateWorkedHours = useMemo(() => {
    return (checkIn, checkOut) => {
      if (!checkIn || !checkOut) return "Incomplete";
      const duration = checkOut - checkIn;
      const hrs = Math.floor(duration / (1000 * 60 * 60));
      const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
    };
  }, []);

  // Fetch attendance data with debouncing
  const fetchAttendanceData = useCallback(async (selectedDate) => {
    setLoading(true);
    try {
      const yearMonth = format(selectedDate, 'yyyy-MM');
      const day = format(selectedDate, 'd');
      const allUsers = await getDocs(collection(db, "users_01"));
      const logs = [];

      const attendancePromises = allUsers.docs.map(userDoc => {
        const userId = userDoc.id;
        return getDoc(doc(db, "users_01", userId, "attendance", yearMonth)).then(attendanceSnap => ({
          userId,
          userData: userDoc.data(),
          attendanceSnap
        }));
      });

      const results = await Promise.all(attendancePromises);

      for (const { userId, userData, attendanceSnap } of results) {
        if (!attendanceSnap.exists()) continue;

        const daysMap = attendanceSnap.data().days || {};
        const dayData = daysMap[day];

        if (!dayData?.sessions?.length) continue;

        dayData.sessions.forEach((session, index) => {
          const checkIn = session.checkIn?.toDate();
          const checkOut = session.checkOut?.toDate();

          logs.push({
            userName: userData.name,
            checkInStr: checkIn ? format(checkIn, 'HH:mm') : '',
            checkOutStr: checkOut ? format(checkOut, 'HH:mm') : '',
            worked: calculateWorkedHours(checkIn, checkOut),
            userId: userId,
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
  }, [calculateWorkedHours]);

  const debouncedFetchAttendance = useMemo(() => 
    debounce((newDate) => fetchAttendanceData(newDate), 300), 
    [fetchAttendanceData]
  );

  // Save edited attendance
  const saveEdit = async (record) => {
    try {
      const parts = record.sessionId.split('-');
      if (parts.length !== 4) {
        console.error("Invalid sessionId format:", record.sessionId);
        return;
      }
      const yearMonth = `${parts[0]}-${parts[1]}`;
      const day = parts[2];
      const index = parseInt(parts[3]);
      const userId = record.userId;

      const userAttendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
      const userAttendanceSnap = await getDoc(userAttendanceRef);

      let days = {};
      let dayData = { sessions: [], isClockedIn: false };

      if (userAttendanceSnap.exists()) {
        days = { ...userAttendanceSnap.data().days };
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
    if (!window.confirm(`Delete shift for ${record.userName}?`)) return;

    try {
      const parts = record.sessionId.split('-');
      if (parts.length !== 4) {
        console.error("Invalid sessionId format:", record.sessionId);
        return;
      }
      const yearMonth = `${parts[0]}-${parts[1]}`;
      const day = parts[2];
      const index = parseInt(parts[3]);
      const userId = record.userId;

      const userAttendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
      const userAttendanceSnap = await getDoc(userAttendanceRef);
      if (!userAttendanceSnap.exists()) return;

      const userData = userAttendanceSnap.data();
      const days = { ...userData.days };
      const dayData = { ...days[day] };
      const sessions = [...dayData.sessions];

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

  // Validate and add new attendance
  const validateNewAttendance = () => {
    const newErrors = { userId: "", checkInStr: "", checkOutStr: "" };
    let isValid = true;

    if (!newData.userId) {
      newErrors.userId = "User selection is required";
      isValid = false;
    }
    if (!newData.checkInStr) {
      newErrors.checkInStr = "Check-in time is required";
      isValid = false;
    }
    if (!newData.checkOutStr) {
      newErrors.checkOutStr = "Check-out time is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const addNewAttendance = async () => {
    if (!validateNewAttendance()) return;

    try {
      const userId = newData.userId;
      const yearMonth = format(shiftStartDate, 'yyyy-MM');
      const day = format(shiftStartDate, 'd');

      const [checkInHour, checkInMinute] = newData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = newData.checkOutStr.split(':').map(Number);

      const checkInDate = new Date(shiftStartDate);
      checkInDate.setHours(checkInHour, checkInMinute);
      const checkOutDate = new Date(shiftEndDate);
      checkOutDate.setHours(checkOutHour, checkOutMinute);

      if (isBefore(checkOutDate, checkInDate)) {
        setErrors(prev => ({ ...prev, checkOutStr: "Check-out must be after check-in" }));
        return;
      }

      if (checkInDate > new Date() || checkOutDate > new Date()) {
        setErrors(prev => ({ ...prev, checkOutStr: "Cannot add future attendance" }));
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
      setNewData({ userId: "", checkInStr: "", checkOutStr: "" });
      setErrors({ userId: "", checkInStr: "", checkOutStr: "" });
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error adding attendance:", error);
    }
  };

  // Fetch data on mount and date change
  useEffect(() => {
    fetchUsers();
    debouncedFetchAttendance(date);
    return () => debouncedFetchAttendance.cancel();
  }, [date, fetchUsers, debouncedFetchAttendance]);

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
              className="p-2 border rounded-md text-sm bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {isEditableDate && (
              <button
                onClick={() => setAddingNew(!addingNew)}
                disabled={date > new Date()}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  date > new Date()
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : addingNew
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
                    User
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
                      {record.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing === index ? (
                        <input
                          type="time"
                          value={editData.checkInStr}
                          onChange={(e) =>
                            setEditData({ ...editData, checkInStr: e.target.value })
                          }
                          className="border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
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
                          className="border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
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
          <div className="mt-6 p-6 bg-gray-50 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Add New Attendance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  User
                </label>
                <Select
                  options={userOptions}
                  value={userOptions.find(option => option.value === newData.userId) || null}
                  onChange={(selectedOption) => 
                    setNewData({ ...newData, userId: selectedOption ? selectedOption.value : '' })
                  }
                  placeholder="Select User"
                  isSearchable
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors.userId ? 'red' : base.borderColor,
                      boxShadow: errors.userId ? '0 0 0 1px red' : base.boxShadow,
                      '&:hover': {
                        borderColor: errors.userId ? 'red' : base.borderColor
                      }
                    })
                  }}
                />
                {errors.userId && (
                  <p className="text-red-500 text-xs mt-1">{errors.userId}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Start Date & Time
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                />
                <input
                  type="time"
                  value={newData.checkInStr}
                  onChange={(e) =>
                    setNewData({ ...newData, checkInStr: e.target.value })
                  }
                  className={`block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${
                    errors.checkInStr ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkInStr && (
                  <p className="text-red-500 text-xs mt-1">{errors.checkInStr}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  End Date & Time
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                />
                <input
                  type="time"
                  value={newData.checkOutStr}
                  onChange={(e) =>
                    setNewData({ ...newData, checkOutStr: e.target.value })
                  }
                  className={`block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${
                    errors.checkOutStr ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkOutStr && (
                  <p className="text-red-500 text-xs mt-1">{errors.checkOutStr}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => {
                  setAddingNew(false);
                  setErrors({ userId: "", checkInStr: "", checkOutStr: "" });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
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
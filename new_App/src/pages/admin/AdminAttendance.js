import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addWeeks, startOfWeek, isWithinInterval, isBefore, isMonday, subWeeks, addDays } from 'date-fns';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp
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
  const [errors, setErrors] = useState({ userId: "", checkInStr: "", checkOutStr: "", shiftEndDate: "" });
  const [tableKey, setTableKey] = useState(0); // For forcing table re-render

  // Calculate editable date range
  const currentDate = new Date();
  const lastMonday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const nextMonday = addWeeks(lastMonday, 1);

  const editableStart = isMonday(currentDate) ? subWeeks(lastMonday, 1) : lastMonday;
  const editableEnd = isMonday(currentDate) ? addDays(lastMonday, 1) : nextMonday;

  const isDateEditable = (dateToCheck) => {
    return isWithinInterval(dateToCheck, { start: editableStart, end: editableEnd });
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
        .filter(user => ["teammember", "manager", "teamleader"].includes(user.role));
      console.log("Filtered users (employees):", userList);
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  // User options for searchable select
  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name
  }));

  // Calculate worked hours
  const calculateWorkedHours = useMemo(() => {
    return (checkIn, checkOut) => {
      if (!checkIn || !checkOut) return "Incomplete";
      if (isBefore(checkOut, checkIn)) return "Invalid";
      let duration = checkOut - checkIn;
      // Cap duration at 24 hours
      const maxDuration = 24 * 60 * 60 * 1000;
      if (duration > maxDuration) {
        duration = maxDuration;
      }
      if (duration >= 12.5 * 60 * 60 * 1000) {
        duration -= 60 * 60 * 1000; // 1 hour break
      } else if (duration >= 4.5 * 60 * 60 * 1000) {
        duration -= 30 * 60 * 1000; // 30 min break
      }
      const hrs = Math.floor(duration / (1000 * 60 * 60));
      const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
    };
  }, []);

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async (selectedDate) => {
    setLoading(true);
    setAttendanceData([]); // Clear data to force refresh
    try {
      const yearMonth = format(selectedDate, 'yyyy-MM');
      const day = format(selectedDate, 'd');
      const allUsers = await getDocs(collection(db, "users_01"));
      const logs = [];

      console.log(`Fetching attendance for date: ${format(selectedDate, 'yyyy-MM-dd')}`);

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
          const checkIn = session.checkIn && typeof session.checkIn.toDate === 'function'
            ? session.checkIn.toDate()
            : (session.checkIn instanceof Date ? session.checkIn : null);
          const checkOut = session.checkOut && typeof session.checkOut.toDate === 'function'
            ? session.checkOut.toDate()
            : (session.checkOut instanceof Date ? session.checkOut : null);

          logs.push({
            userName: userData.name,
            checkInStr: checkIn ? format(checkIn, 'HH:mm') : '',
            checkOutStr: checkOut ? format(checkOut, 'HH:mm') : '',
            worked: session.worked_hours || calculateWorkedHours(checkIn, checkOut),
            userId,
            sessionId: `${yearMonth}-${day}-${index}`,
            checkInTime: checkIn?.getTime() || 0,
            originalCheckIn: checkIn,
            originalCheckOut: checkOut,
            checkInEdited: session.checkInEdited || false,
            checkOutEdited: session.checkOutEdited || false,
          });
        });
      }

      console.log("Fetched logs:", logs);
      setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
      setTableKey(prev => prev + 1); // Force table re-render
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

      const newWorkedHours = calculateWorkedHours(newCheckIn, newCheckOut);

      // Determine which fields were edited
      const isCheckInEdited = editData.checkInStr !== record.checkInStr;
      const isCheckOutEdited = editData.checkOutStr !== record.checkOutStr;

      sessions[index] = {
        ...sessions[index],
        checkIn: Timestamp.fromDate(newCheckIn),
        checkOut: Timestamp.fromDate(newCheckOut),
        worked_hours: newWorkedHours,
        editedBy: "Admin",
        editedAt: Timestamp.fromDate(new Date()),
        checkInEdited: isCheckInEdited ? true : sessions[index].checkInEdited || false,
        checkOutEdited: isCheckOutEdited ? true : sessions[index].checkOutEdited || false,
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
    setLoading(true); // Show loading during deletion
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

      console.log(`Deleting shift: userId=${userId}, sessionId=${record.sessionId}`);

      const userAttendanceRef = doc(db, "users_01", userId, "attendance", yearMonth);
      const userAttendanceSnap = await getDoc(userAttendanceRef);
      if (!userAttendanceSnap.exists()) {
        console.warn("No attendance document found for deletion");
        return;
      }

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
      console.log("Shift deleted successfully");
      setAttendanceData([]); // Clear data to force refresh
      await fetchAttendanceData(date); // Re-fetch data
      setTableKey(prev => prev + 1); // Force table re-render
    } catch (error) {
      console.error("Error deleting shift:", error);
    } finally {
      setLoading(false);
    }
  };

  // Validate and add new attendance
  const validateNewAttendance = () => {
    const newErrors = { userId: "", checkInStr: "", checkOutStr: "", shiftEndDate: "" };
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
    // Validate shiftEndDate
    const startDateStr = format(shiftStartDate, 'yyyy-MM-dd');
    const endDateStr = format(shiftEndDate, 'yyyy-MM-dd');
    const nextDay = addDays(shiftStartDate, 1);
    const nextDayStr = format(nextDay, 'yyyy-MM-dd');
    if (endDateStr !== startDateStr && endDateStr !== nextDayStr) {
      newErrors.shiftEndDate = "Check-out date must be the same as check-in or the next day";
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

      console.log("Adding attendance:", { userId, checkInDate, checkOutDate });

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
        checkIn: Timestamp.fromDate(checkInDate),
        checkOut: Timestamp.fromDate(checkOutDate),
        worked_hours: calculateWorkedHours(checkInDate, checkOutDate),
        editedBy: "Admin",
        editedAt: Timestamp.fromDate(new Date()),
        checkInEdited: false,
        checkOutEdited: false,
        status: "closed"
      };

      console.log("New session:", newSession);

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
      setErrors({ userId: "", checkInStr: "", checkOutStr: "", shiftEndDate: "" });
      setShiftEndDate(shiftStartDate); // Reset to same day
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error adding attendance:", error);
    }
  };

  // Sync shiftEndDate when shiftStartDate changes
  useEffect(() => {
    setShiftEndDate(shiftStartDate);
  }, [shiftStartDate]);

  // Fetch data on mount and date change
  useEffect(() => {
    fetchUsers();
    debouncedFetchAttendance(date);
    return () => debouncedFetchAttendance.cancel();
  }, [date, fetchUsers, debouncedFetchAttendance]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
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
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${date > new Date()
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

        <div className="mb-6 text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
          Editable date range: {format(editableStart, 'MMM dd')} - {format(addDays(editableEnd, -1), 'MMM dd')}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table key={tableKey} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  {isEditableDate && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing === index ? (
                        <input
                          type="time"
                          value={editData.checkInStr}
                          onChange={(e) => setEditData({ ...editData, checkInStr: e.target.value })}
                          className="border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{record.checkInStr || '--:--'}</span>
                          {record.checkInEdited && <span className="text-xs text-gray-400">(edited)</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing === index ? (
                        <input
                          type="time"
                          value={editData.checkOutStr}
                          onChange={(e) => setEditData({ ...editData, checkOutStr: e.target.value })}
                          className="border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{record.checkOutStr || '--:--'}</span>
                          {record.checkOutEdited && <span className="text-xs text-gray-400">(edited)</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.worked}</td>
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

        {addingNew && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Attendance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">User</label>
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
                      '&:hover': { borderColor: errors.userId ? 'red' : base.borderColor }
                    })
                  }}
                />
                {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
                <input
                  type="date"
                  value={format(shiftStartDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (isDateEditable(selectedDate)) {
                      setShiftStartDate(selectedDate);
                    }
                  }}
                  min={format(editableStart, 'yyyy-MM-dd')}
                  max={format(addDays(editableEnd, -1), 'yyyy-MM-dd')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
                />
                <input
                  type="time"
                  value={newData.checkInStr}
                  onChange={(e) => setNewData({ ...newData, checkInStr: e.target.value })}
                  className={`block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${errors.checkInStr ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.checkInStr && <p className="text-red-500 text-xs mt-1">{errors.checkInStr}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
                <input
                  type="date"
                  value={format(shiftEndDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    const startDateStr = format(shiftStartDate, 'yyyy-MM-dd');
                    const nextDay = addDays(shiftStartDate, 1);
                    const nextDayStr = format(nextDay, 'yyyy-MM-dd');
                    if ([startDateStr, nextDayStr].includes(format(selectedDate, 'yyyy-MM-dd'))) {
                      setShiftEndDate(selectedDate);
                      setErrors(prev => ({ ...prev, shiftEndDate: "" }));
                    } else {
                      setErrors(prev => ({ ...prev, shiftEndDate: "Check-out date must be the same as check-in or the next day" }));
                    }
                  }}
                  min={format(shiftStartDate, 'yyyy-MM-dd')}
                  max={format(addDays(shiftStartDate, 1), 'yyyy-MM-dd')}
                  className={`block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${errors.shiftEndDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                <input
                  type="time"
                  value={newData.checkOutStr}
                  onChange={(e) => setNewData({ ...newData, checkOutStr: e.target.value })}
                  className={`block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${errors.checkOutStr ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.checkOutStr && <p className="text-red-500 text-xs mt-1">{errors.checkOutStr}</p>}
                {errors.shiftEndDate && <p className="text-red-500 text-xs mt-1">{errors.shiftEndDate}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => {
                  setAddingNew(false);
                  setErrors({ userId: "", checkInStr: "", checkOutStr: "", shiftEndDate: "" });
                  setShiftEndDate(shiftStartDate);
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
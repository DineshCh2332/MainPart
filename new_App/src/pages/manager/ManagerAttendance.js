
import React, { useState, useEffect } from 'react';
import { format, isToday, isBefore } from 'date-fns';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, // Changed to setDoc to match AdminAttendance
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const ManagerAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

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
        // Only include active employees
        if (!userData.active || userData.role !== 'employee') {
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
            isToday: checkIn ? isToday(checkIn) : false
          });
        });
      }

      setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      alert("Failed to fetch attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save edited attendance
  const saveEdit = async (record) => {
    try {
      if (!record.isToday) {
        alert("You can only edit records from today.");
        return;
      }

      const parts = record.sessionId.split('-');
      if (parts.length !== 4) {
        console.error("Invalid sessionId format:", record.sessionId);
        alert("Invalid session data. Please try again.");
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
        days = { ...userData.days } || {};
        dayData = days[day] ? { ...days[day] } : dayData;
      }

      const sessions = [...(dayData.sessions || [])];
      if (index >= sessions.length) {
        console.error("Session index out of bounds:", index);
        alert("Session data not found. Please try again.");
        return;
      }

      const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);

      const newCheckIn = new Date(record.originalCheckIn || date);
      newCheckIn.setHours(checkInHour, checkInMinute, 0, 0);

      const newCheckOut = new Date(record.originalCheckOut || newCheckIn);
      newCheckOut.setHours(checkOutHour, checkOutMinute, 0, 0);

      if (isBefore(newCheckOut, newCheckIn)) {
        alert("Check-out time must be after check-in time!");
        return;
      }

      sessions[index] = {
        ...sessions[index],
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        editedBy: "Manager",
        editedAt: new Date(), // Use Date instead of serverTimestamp() to avoid array issues
        checkInEdited: record.checkInStr !== editData.checkInStr,
        checkOutEdited: record.checkOutStr !== editData.checkOutStr
      };

      dayData.sessions = sessions;
      dayData.isClockedIn = sessions.some(s => s.checkIn && !s.checkOut);
      days[day] = {
        ...dayData,
        metadata: {
          created: days[day]?.metadata?.created || new Date(), // Avoid serverTimestamp() in arrays
          lastUpdated: new Date() // Use Date to ensure consistency
        }
      };

      // Use setDoc with merge to match AdminAttendance and avoid array issues
      await setDoc(userAttendanceRef, { days }, { merge: true });
      setEditing(null);
      setEditData({});
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance: " + error.message);
    }
  };

  useEffect(() => {
    fetchAttendanceData(date);
  }, [date]);

  return (
    <div className="max-w-4xl mx-auto my-5 p-5 border border-gray-200 rounded bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Manager Attendance</h1>
        <input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
          className="p-2 border border-gray-300 rounded text-sm"
        />
      </div>

      <div className="mb-3 text-sm text-gray-700">
        Date: {format(date, 'dd-MMM-yyyy')}
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading attendance data...</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Employee</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Check-In</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Check-Out</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Hours Worked</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length > 0 ? (
              attendanceData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 text-sm border-b">{record.empName}</td>
                  <td className="p-2 text-sm border-b">
                    {editing === index ? (
                      <input
                        type="time"
                        value={editData.checkInStr}
                        onChange={(e) => setEditData({ ...editData, checkInStr: e.target.value })}
                        className="p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span>{record.checkInStr || "--:--"}</span>
                        {record.checkInEdited && <span className="text-xs text-gray-600 italic">Edited</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-sm border-b">
                    {editing === index ? (
                      <input
                        type="time"
                        value={editData.checkOutStr}
                        onChange={(e) => setEditData({ ...editData, checkOutStr: e.target.value })}
                        className="p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span>{record.checkOutStr || "--:--"}</span>
                        {record.checkOutEdited && <span className="text-xs text-gray-600 italic">Edited</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-sm border-b">{record.worked}</td>
                  <td className="p-2 text-sm border-b">
                    {record.isToday ? (
                      editing === index ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(record)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(index);
                            setEditData({
                              checkInStr: record.checkInStr || '',
                              checkOutStr: record.checkOutStr || ''
                            });
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      )
                    ) : (
                      <span className="text-gray-500 text-xs">Read-only</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500 text-sm">
                  No attendance records found for this date
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManagerAttendance;
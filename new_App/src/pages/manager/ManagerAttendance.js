import React, { useState, useEffect, useCallback,useMemo } from 'react';
import { format, isToday, isBefore } from 'date-fns';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const ManagerAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");


  // Calculate worked hours
  const calculateWorkedHours = useMemo(() => {
  return (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Incomplete";

    let duration = checkOut - checkIn;

    // Break deduction logic:
    if (duration >= 12.5 * 60 * 60 * 1000) {
      // 12h 30m and above → 1 hour break
      duration -= 60 * 60 * 1000;
    } else if (duration >= 4.5 * 60 * 60 * 1000) {
      // 4h 30m to 12h 29m → 30 minute break
      duration -= 30 * 60 * 1000;
    }
    // Else → no deduction

    const hrs = Math.floor(duration / (1000 * 60 * 60));
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    return `${hrs}h ${mins}m`;
  };
}, []);

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async (selectedDate) => {
    setLoading(true);
    try {
      const yearMonth = format(selectedDate, 'yyyy-MM');
      const day = format(selectedDate, 'd');
      const allUsers = await getDocs(collection(db, "users_01"));
      const logs = [];

      for (const userDoc of allUsers.docs) {
        const userData = userDoc.data();
        // Exclude admins, include employees and team leaders
        if (userData.role === 'admin') {
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
            isToday: checkIn ? isToday(checkIn) : false,
            role: userData.role?.toLowerCase() === 'employee' ? 'Team Member' : userData.role
          });
        });
      }

      setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
      setFilteredAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      alert("Failed to fetch attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter attendance data based on search term
  const filterAttendanceData = useCallback(() => {
    const search = searchTerm.toLowerCase();

    const results = attendanceData.filter((record) => {
      const empName = (record.empName || "").toLowerCase();
      const role = (record.role?.toLowerCase() === 'team member' ? 'employee' : record.role || "").toLowerCase();
      const checkInStr = (record.checkInStr || "").toLowerCase();
      const checkOutStr = (record.checkOutStr || "").toLowerCase();
      const worked = (record.worked || "").toLowerCase();

      return (
        !search ||
        empName.includes(search) ||
        role.includes(search) ||
        checkInStr.includes(search) ||
        checkOutStr.includes(search) ||
        worked.includes(search)
      );
    });

    setFilteredAttendanceData(results.sort((a, b) => b.checkInTime - a.checkInTime));
  }, [searchTerm, attendanceData]);

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
      const yearMonth = `${parts[0]}-${parts[1]}`;
      const day = parts[2];
      const index = parseInt(parts[3]);
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
        editedAt: new Date(),
        checkInEdited: record.checkInStr !== editData.checkInStr,
        checkOutEdited: record.checkOutStr !== editData.checkOutStr
      };

      dayData.sessions = sessions;
      dayData.isClockedIn = sessions.some(s => s.checkIn && !s.checkOut);
      days[day] = {
        ...dayData,
        metadata: {
          created: days[day]?.metadata?.created || new Date(),
          lastUpdated: new Date()
        }
      };

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
  }, [date, fetchAttendanceData]);

  useEffect(() => {
    filterAttendanceData();
  }, [searchTerm, filterAttendanceData]);

  return (
    <div className="max-w-4xl mx-auto my-5 p-5 border border-gray-200 rounded bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Manager Attendance</h1>
        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => setDate(new Date(e.target.value))}
            className="p-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            placeholder="Search attendance..."
            className="p-2 border border-gray-300 rounded text-sm w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Team Member</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Check-In</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Check-Out</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Hours Worked</th>
              <th className="text-left p-2 bg-blue-600 text-white text-sm border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendanceData.length > 0 ? (
              filteredAttendanceData.map((record, index) => (
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
                <td colSpan="6" className="py-4 text-center text-gray-500 text-sm">
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
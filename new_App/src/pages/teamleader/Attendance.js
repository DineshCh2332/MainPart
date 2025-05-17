import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, isToday } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TimeAndAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef(null);

  // Calculate worked hours
  const calculateWorkedHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Incomplete";
    const duration = checkOut - checkIn;
    const hrs = Math.floor(duration / (1000 * 60 * 60));
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  // Fetch attendance data (aligned with ManagerAttendance)
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
            empName: userData.name || userId,
            checkInStr: checkIn ? format(checkIn, 'HH:mm') : '',
            checkOutStr: checkOut ? format(checkOut, 'HH:mm') : '',
            worked: calculateWorkedHours(checkIn, checkOut),
            empId: userId,
            sessionId: `${yearMonth}-${day}-${index}`,
            checkInTime: checkIn?.getTime() || 0,
            originalCheckIn: checkIn,
            originalCheckOut: checkOut,
            editedAt: session.editedAt?.toDate(),
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

  // Handle clicks outside calendar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Filter data for the selected date
  const startTime = new Date(date);
  startTime.setHours(1, 0, 0, 0);
  const endTime = addDays(startTime, 1);

  const formattedDate = format(date, 'dd-MMM-yyyy');
  const startTimeStr = format(startTime, 'dd MMM yyyy hh:mm a');
  const endTimeStr = format(endTime, 'dd MMM yyyy hh:mm a');

  const filteredData = attendanceData.filter(record => {
    const recordDate = new Date(record.checkInTime);
    return recordDate >= startTime && recordDate < endTime;
  });

  useEffect(() => {
    fetchAttendanceData(date);
  }, [date]);

  return (
    <div className="max-w-4xl mx-auto my-5 p-5 border border-gray-200 rounded bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Time and Attendance</h1>
        <div className="relative">
          <input
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => setDate(new Date(e.target.value))}
            className="p-2 border border-gray-300 rounded text-sm"
          />
        
          {showCalendar && (
            <div
              ref={calendarRef}
              className="absolute top-12 right-0 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-72"
            >
              <Calendar
                onChange={(value) => {
                  setDate(value);
                  setShowCalendar(false);
                }}
                value={date}
                className="border-none"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-700">
        Date: {formattedDate}
      </div>

      <div className="mb-4 text-xs text-gray-600">
        Showing shifts between {startTimeStr} and {endTimeStr}
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
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 text-sm border-b">{record.empName}</td>
                  <td className="p-2 text-sm border-b">
                    <div className="flex flex-col gap-1">
                      <span>{record.checkInStr || "-"}</span>
                      {record.checkInEdited && <span className="text-xs text-gray-600 italic">Edited</span>}
                    </div>
                  </td>
                  <td className="p-2 text-sm border-b">
                    <div className="flex flex-col gap-1">
                      <span>{record.checkOutStr || "-"}</span>
                      {record.checkOutEdited && <span className="text-xs text-gray-600 italic">Edited</span>}
                    </div>
                  </td>
                  <td className="p-2 text-sm border-b">{record.worked}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-500 text-sm">
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

export default TimeAndAttendance;
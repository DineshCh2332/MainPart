import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const MemberAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empId, setEmpId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [empName, setEmpName] = useState('');
  const calendarRef = useRef(null);

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const formatFirebaseDate = (date) => format(date, 'yyyy-MM-dd');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  const fetchEmployeeAttendance = async (employeeId, targetDate = date) => {
    setLoading(true);
    try {
      // Get employee details
      const empQuery = query(collection(db, "users_01"), where("employeeID", "==", employeeId));
      const empQuerySnapshot = await getDocs(empQuery);
      
      if (empQuerySnapshot.empty) {
        alert("Employee not found");
        setLoading(false);
        return;
      }

      const empDoc = empQuerySnapshot.docs[0];
      setEmpName(empDoc.data().name || employeeId);
      setIsAuthenticated(true);

      const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
      const targetWeekDays = eachDayOfInterval({ start: targetWeekStart, end: targetWeekEnd });

      // Fetch attendance for all days in the week
      const weeklyLogs = await Promise.all(
        targetWeekDays.map(async (day) => {
          const dateStr = formatFirebaseDate(day);
          const sessionsCollection = collection(db, "attendance", dateStr, "sessions");
          
          const sessionQuery = query(
            sessionsCollection,
            where("user", "==", doc(db, "users_01", empDoc.id))
          );
          const sessionSnapshot = await getDocs(sessionQuery);

          if (sessionSnapshot.empty) {
            return {
              date: day,
              dateStr: format(day, 'EEE, MMM dd'),
              checkInStr: "—",
              checkOutStr: "—",
              worked: "No Record",
              checkInTime: 0,
              source: "none",
              edited: false
            };
          }

          const dayLogs = sessionSnapshot.docs.map((sessionDoc) => {
            const sessionData = sessionDoc.data();
            const checkIn = sessionData.checkIn?.toDate();
            const checkOut = sessionData.checkOut?.toDate();

            const checkInStr = checkIn ? format(checkIn, 'hh:mm a') : "—";
            const checkOutStr = checkOut ? format(checkOut, 'hh:mm a') : "—";

            let worked = "Incomplete";
            if (checkIn && checkOut) {
              const duration = checkOut - checkIn;
              const hrs = Math.floor(duration / (1000 * 60 * 60));
              const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
              worked = `${hrs}h ${mins}m`;
            }

            return {
              date: day,
              dateStr: format(day, 'EEE, MMM dd'),
              checkInStr,
              checkOutStr,
              worked,
              checkInTime: checkIn?.getTime() || 0,
              source: sessionData.source || "system",
              edited: sessionData.editedAt ? true : false
            };
          });

          return dayLogs.sort((a, b) => a.checkInTime - b.checkInTime)[0] || {
            date: day,
            dateStr: format(day, 'EEE, MMM dd'),
            checkInStr: "—",
            checkOutStr: "—",
            worked: "No Record",
            checkInTime: 0,
            source: "none",
            edited: false
          };
        })
      );

      setAttendanceData(weeklyLogs.sort((a, b) => a.date - b.date));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      alert("Error loading attendance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDayAttendance = async (employeeId, selectedDate) => {
    setLoading(true);
    try {
      const empQuery = query(collection(db, "users_01"), where("employeeID", "==", employeeId));
      const empQuerySnapshot = await getDocs(empQuery);
      
      if (empQuerySnapshot.empty) {
        setLoading(false);
        return;
      }

      const empDoc = empQuerySnapshot.docs[0];
      const dateStr = formatFirebaseDate(selectedDate);
      const sessionsCollection = collection(db, "attendance", dateStr, "sessions");
      
      const backstageQuery = query(
        sessionsCollection,
        where("user", "==", doc(db, "users_01", empDoc.id))
      );
      const sessionSnapshot = await getDocs(backstageQuery);

      const dayLogs = sessionSnapshot.docs.map((sessionDoc) => {
        const sessionData = sessionDoc.data();
        const checkIn = sessionData.checkIn?.toDate();
        const checkOut = sessionData.checkOut?.toDate();

        const checkInStr = checkIn ? format(checkIn, 'hh:mm a') : "—";
        const checkOutStr = checkOut ? format(checkOut, 'hh:mm a') : "—";

        let worked = "Incomplete";
        if (checkIn && checkOut) {
          const duration = checkOut - checkIn;
          const hrs = Math.floor(duration / (1000 * 60 * 60));
          const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
          worked = `${hrs}h ${mins}m`;
        }

        return {
          date: selectedDate,
          dateStr: format(selectedDate, 'EEE, MMM dd'),
          checkInStr,
          checkOutStr,
          worked,
          checkInTime: checkIn?.getTime() || 0,
          source: sessionData.source || "system",
          edited: sessionData.editedAt ? true : false
        };
      });

      setSelectedDayData({
        date: selectedDate,
        records: dayLogs.sort((a, b) => a.checkInTime - b.checkInTime)
      });
    } catch (error) {
      console.error("Error fetching day attendance:", error);
      alert("Error loading day attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchEmployeeAttendance(empId);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmpId('');
    setEmpName('');
    setAttendanceData([]);
    setSelectedDayData(null);
  };

  const changeWeek = (direction) => {
    const newDate = direction === 'next' ? addWeeks(date, 1) : subWeeks(date, 1);
    setDate(newDate);
    setSelectedDayData(null);
    if (isAuthenticated) {
      fetchEmployeeAttendance(empId, newDate);
    }
  };

  const handleDateClick = (selectedDate) => {
    setDate(selectedDate);
    setShowCalendar(false);
    if (isAuthenticated) {
      fetchDayAttendance(empId, selectedDate);
    }
  };

  const formattedWeekRange = `${format(weekStart, 'EEE, MMM dd')} - ${format(weekEnd, 'EEE, MMM dd, yyyy')}`;

  useEffect(() => {
    if (isAuthenticated && !selectedDayData) {
      fetchEmployeeAttendance(empId, date);
    }
  }, [date, isAuthenticated]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm relative">
      {!isAuthenticated ? (
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8">Employee Attendance Portal</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4 max-w-md mx-auto">
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="Enter your Employee ID"
              className="p-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View My Attendance
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">My Weekly Attendance</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span>{empName} (ID: {empId})</span>
                <button
                  onClick={handleLogout}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Logout
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="p-2 bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeWeek('prev')}
              className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm text-gray-700">Week: {formattedWeekRange}</div>
            <button
              onClick={() => changeWeek('next')}
              className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {showCalendar && (
            <div
              ref={calendarRef}
              className="absolute top-16 right-6 z-10 bg-white border border-gray-200 rounded-md shadow-lg p-3"
            >
              <Calendar
                onChange={handleDateClick}
                value={date}
                locale="en-US"
                className="border-none"
              />
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 text-gray-600">
              Loading attendance data...
            </div>
          ) : selectedDayData ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Attendance for {format(selectedDayData.date, 'EEEE, MMMM dd, yyyy')}
                </h2>
                <button
                  onClick={() => setSelectedDayData(null)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Back to Weekly View
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Session</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Check-In</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Check-Out</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Hours Worked</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDayData.records.length > 0 ? (
                      selectedDayData.records.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-3 text-sm text-gray-700">Session {index + 1}</td>
                          <td className="p-3 text-sm text-gray-700 relative">
                            {record.checkInStr}
                            {record.edited && <span className="text-blue-600 text-xs ml-1 absolute">*</span>}
                          </td>
                          <td className="p-3 text-sm text-gray-700 relative">
                            {record.checkOutStr}
                            {record.edited && <span className="text-blue-600 text-xs ml-1 absolute">*</span>}
                          </td>
                          <td className="p-3 text-sm text-gray-700">{record.worked}</td>
                          <td className="p-3 text-sm">
                            {record.worked === "Incomplete" || record.worked === "No Record" ? (
                              <span className="text-red-600 font-semibold">{record.worked}</span>
                            ) : (
                              <span className="text-green-600 font-semibold">Complete</span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-gray-700">{record.source}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-gray-500">
                          No attendance records found for this day
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {selectedDayData.records.some(record => record.edited) && (
                <div className="text-xs text-gray-600 mt-2 text-right italic">* Edited entries</div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Check-In</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Check-Out</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Hours Worked</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.length > 0 ? (
                    attendanceData.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-700">{record.dateStr}</td>
                        <td className="p-3 text-sm text-gray-700 relative">
                          {record.checkInStr}
                          {record.edited && <span className="text-blue-600 text-xs ml-1 absolute">*</span>}
                        </td>
                        <td className="p-3 text-sm text-gray-700 relative">
                          {record.checkOutStr}
                          {record.edited && <span className="text-blue-600 text-xs ml-1 absolute">*</span>}
                        </td>
                        <td className="p-3 text-sm text-gray-700">{record.worked}</td>
                        <td className="p-3 text-sm">
                          {record.worked === "Incomplete" || record.worked === "No Record" ? (
                            <span className="text-red-600 font-semibold">{record.worked}</span>
                          ) : (
                            <span className="text-green-600 font-semibold">Complete</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-gray-500">
                        No attendance records found for this week
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {attendanceData.some(record => record.edited) && (
                <div className="text-xs text-gray-600 mt-2 text-right italic">* Edited entries</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemberAttendance;
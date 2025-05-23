import React, { useState, useEffect, useCallback } from 'react';
import { format, isToday } from 'date-fns';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Attendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate worked hours
  const calculateWorkedHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Incomplete";
    let duration = checkOut - checkIn;
    duration = duration - 30 * 60 * 1000;
    const hrs = Math.floor(duration / (1000 * 60 * 60));
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async (selectedDate) => {
    setLoading(true);
    try {
      const yearMonth = format(selectedDate, 'yyyy-MM');
      const day = format(selectedDate, 'd');
      const allUsers = await getDocs(collection(db, 'users_01'));
      const logs = [];

      for (const userDoc of allUsers.docs) {
        const userData = userDoc.data();
        // Exclude admins, include employees and team leaders
        if (userData.role === 'admin') continue;

        const userId = userDoc.id;
        const attendanceRef = doc(db, 'users_01', userId, 'attendance', yearMonth);
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
            checkInEdited: session.checkInEdited || false,
            checkOutEdited: session.checkOutEdited || false,
            isToday: checkIn ? isToday(checkIn) : false,
            role: userData.role?.toLowerCase() === 'employee' ? 'Team Member' : userData.role,
          });
        });
      }

      const sortedLogs = logs.sort((a, b) => b.checkInTime - a.checkInTime);
      setAttendanceData(sortedLogs);
      setFilteredAttendanceData(sortedLogs);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      alert('Failed to fetch attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter attendance data based on search term
  const filterAttendanceData = useCallback(() => {
    const search = searchTerm.toLowerCase().trim();
    const results = attendanceData.filter((record) => {
      const empName = (record.empName || '').toLowerCase();
      const role = (record.role?.toLowerCase() === 'team member' ? 'employee' : record.role || '').toLowerCase();
      const checkInStr = (record.checkInStr || '').toLowerCase();
      const checkOutStr = (record.checkOutStr || '').toLowerCase();
      const worked = (record.worked || '').toLowerCase();

      return (
        !search ||
        empName.includes(search) ||
        role.includes(search) ||
        checkInStr.includes(search) ||
        checkOutStr.includes(search) ||
        worked.includes(search)
      );
    });

    setFilteredAttendanceData(results);
  }, [searchTerm, attendanceData]);

  useEffect(() => {
    fetchAttendanceData(date);
  }, [date, fetchAttendanceData]);

  useEffect(() => {
    filterAttendanceData();
  }, [searchTerm, filterAttendanceData]);

  return (
    <div className="max-w-4xl mx-auto my-5 p-5 border border-gray-200 rounded bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
        <div className="flex gap-4 items-center">
          <label htmlFor="date-picker" className="sr-only">
            Select Date
          </label>
          <input
            id="date-picker"
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => setDate(new Date(e.target.value))}
            className="p-2 border border-gray-300 rounded text-sm"
            aria-label="Select attendance date"
          />
          <label htmlFor="search-input" className="sr-only">
            Search Attendance
          </label>
          <input
            id="search-input"
            type="text"
            placeholder="Search attendance..."
            className="p-2 border border-gray-300 rounded text-sm w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search attendance records"
          />
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-700">
        Date: {format(date, 'dd-MMM-yyyy')}
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500">
          <svg
            className="animate-spin h-5 w-5 mx-auto text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading attendance data...
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left p-2 bg-blue-600 text-white text-sm border-b"
              >
                Team Member
              </th>
              <th
                scope="col"
                className="text-left p-2 bg-blue-600 text-white text-sm border-b"
              >
                Check-In
              </th>
              <th
                scope="col"
                className="text-left p-2 bg-blue-600 text-white text-sm border-b"
              >
                Check-Out
              </th>
              <th
                scope="col"
                className="text-left p-2 bg-blue-600 text-white text-sm border-b"
              >
                Hours Worked
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendanceData.length > 0 ? (
              filteredAttendanceData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 text-sm border-b">{record.empName}</td>
                  <td className="p-2 text-sm border-b">
                    <div className="flex flex-col gap-1">
                      <span>{record.checkInStr || '-'}</span>
                      {record.checkInEdited && (
                        <span className="text-xs text-gray-600 italic">Edited</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-sm border-b">
                    <div className="flex flex-col gap-1">
                      <span>{record.checkOutStr || '-'}</span>
                      {record.checkOutEdited && (
                        <span className="text-xs text-gray-600 italic">Edited</span>
                      )}
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

export default Attendance;
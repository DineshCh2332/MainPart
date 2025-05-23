import React, { useState, useEffect } from 'react';
import { format, isBefore } from 'date-fns';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

const MemberAttendance = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [employeeName, setEmployeeName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Calculate worked hours
  const calculateWorkedHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Incomplete";
    let duration = checkOut - checkIn;
    duration = duration - 30 * 60 * 1000;
    const hrs = Math.floor(duration / (1000 * 60 * 60));
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  // Fetch attendance data for the employee
  const fetchAttendanceData = async (empId) => {
    if (!empId) {
      setError('Please enter a valid Employee ID.');
      return;
    }
    setLoading(true);
    setError('');
    setAttendanceData([]);
    setEmployeeName('');
    setPhoneNumber('');

    try {
      // Query users_01 to find the document with matching employeeID
      const usersQuery = query(
        collection(db, "users_01"),
        where("employeeID", "==", empId.trim())
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        setError('Employee ID not found.');
        setLoading(false);
        return;
      }

      // Assume the first matching document (employeeID should be unique)
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const phoneNum = userDoc.id; // Document ID is the phone number
      setEmployeeName(userData.name || empId);
      setPhoneNumber(phoneNum);

      // Fetch all attendance subcollections
      const attendanceCollection = collection(db, "users_01", phoneNum, "attendance");
      const attendanceSnapshots = await getDocs(attendanceCollection);

      let logs = [];

      for (const attendanceDoc of attendanceSnapshots.docs) {
        const yearMonth = attendanceDoc.id; // e.g., "2025-05"
        const daysMap = attendanceDoc.data().days || {};

        Object.keys(daysMap).forEach((day) => {
          const dayData = daysMap[day];
          if (!dayData?.sessions?.length) return;

          dayData.sessions.forEach((session, index) => {
            const checkIn = session.checkIn?.toDate();
            const checkOut = session.checkOut?.toDate();

            // Apply date range filter
            if (startDate && endDate) {
              const recordDate = new Date(checkIn);
              recordDate.setHours(0, 0, 0, 0);
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (recordDate < start || recordDate > end) return;
            }

            logs.push({
              date: checkIn ? format(checkIn, 'dd-MMM-yyyy') : '',
              checkInStr: checkIn ? format(checkIn, 'HH:mm') : '',
              checkOutStr: checkOut ? format(checkOut, 'HH:mm') : '',
              worked: calculateWorkedHours(checkIn, checkOut),
              empId: phoneNum,
              sessionId: `${yearMonth}-${day}-${index}`,
              checkInTime: checkIn?.getTime() || 0,
              originalCheckIn: checkIn,
              originalCheckOut: checkOut,
              checkInEdited: session.checkInEdited || false,
              checkOutEdited: session.checkOutEdited || false,
              editedAt: session.editedAt?.toDate()
            });
          });
        });
      }

      setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      setError('Failed to fetch attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    fetchAttendanceData(employeeId);
  };

  // Handle date range filter
  const handleDateFilter = () => {
    if (startDate && endDate && isBefore(new Date(endDate), new Date(startDate))) {
      setError('End date cannot be before start date.');
      return;
    }
    fetchAttendanceData(employeeId);
  };

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    fetchAttendanceData(employeeId);
  };

  return (
    <div className="max-w-5xl mx-auto my-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Attendance</h1>

      {/* Employee ID Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Enter your Employee ID"
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            View Attendance
          </button>
        </div>
      </form>

      {/* Date Range Filter */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Filter by Date Range</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleDateFilter}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              Apply Filter
            </button>
            <button
              onClick={clearDateFilter}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Attendance Table */}
      {employeeName && (
        <div className="mb-4 text-sm text-gray-700">
          Showing attendance for: <span className="font-medium">{employeeName}</span>
        </div>
      )}
      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading attendance data...</div>
      ) : attendanceData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 bg-blue-600 text-white text-sm border-b">Date</th>
                <th className="text-left p-3 bg-blue-600 text-white text-sm border-b">Check-In</th>
                <th className="text-left p-3 bg-blue-600 text-white text-sm border-b">Check-Out</th>
                <th className="text-left p-3 bg-blue-600 text-white text-sm border-b">Hours Worked</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-3 text-sm border-b">{record.date}</td>
                  <td className="p-3 text-sm border-b">
                    <div className="flex flex-col gap-1">
                      <span>{record.checkInStr || "-"}</span>
                      {record.checkInEdited && <span className="text-xs text-gray-600 italic">Edited</span>}
                    </div>
                  </td>
                  <td className="p-3 text-sm border-b">
                    <div className="flex flex-col gap-1">
                      <span>{record.checkOutStr || "-"}</span>
                      {record.checkOutEdited && <span className="text-xs text-gray-600 italic">Edited</span>}
                    </div>
                  </td>
                  <td className="p-3 text-sm border-b">{record.worked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : employeeId && !error ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No attendance records found for this employee.
        </div>
      ) : null}
    </div>
  );
};

export default MemberAttendance;
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import debounce from 'lodash/debounce';

const Attendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

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
        .filter(user => ["teammember"].includes(user.role));
      console.log("Filtered users (employees):", userList);
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  // Fetch attendance data
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

        dayData.sessions.forEach((session) => {
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
            worked: session.worked_hours || 'N/A',
            checkInTime: checkIn?.getTime() || 0,
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
  }, []);

  const debouncedFetchAttendance = useMemo(() =>
    debounce((newDate) => fetchAttendanceData(newDate), 300),
    [fetchAttendanceData]
  );

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
            Attendance Records
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="p-2 border rounded-md text-sm bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span>{record.checkInStr || '--:--'}</span>
                        {record.checkInEdited && <span className="text-xs text-gray-400">(edited)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span>{record.checkOutStr || '--:--'}</span>
                        {record.checkOutEdited && <span className="text-xs text-gray-400">(edited)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.worked}</td>
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
      </div>
    </div>
  );
};

export default Attendance;
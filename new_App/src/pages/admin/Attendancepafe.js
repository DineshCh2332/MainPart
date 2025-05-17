import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(null);
  const [userDocId, setUserDocId] = useState(null);

  const getCurrentMonthDocId = () => {
    const today = new Date();
    return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const getCurrentDayKey = () => {
    const today = new Date();
    return String(today.getUTCDate()).padStart(2, '0');
  };

  useEffect(() => {
    const checkStatus = async () => {
      if (!employeeId) {
        setEmployeeName('');
        setIsClockedIn(null);
        setUserDocId(null);
        setStatusMessage('');
        return;
      }

      try {
        const usersQuery = query(collection(db, 'users_01'), where('employeeID', '==', employeeId));
        const phoneQuery = query(collection(db, 'users_01'), where('phone', '==', employeeId));
        const [usersSnap, phoneSnap] = await Promise.all([getDocs(usersQuery), getDocs(phoneQuery)]);

        let empDoc = usersSnap.empty ? (phoneSnap.empty ? null : phoneSnap.docs[0]) : usersSnap.docs[0];
        if (!empDoc) {
          setEmployeeName('');
          setIsClockedIn(null);
          setUserDocId(null);
          setStatusMessage('Employee not found.');
          return;
        }

        const empData = empDoc.data();
        setUserDocId(empDoc.id);
        setEmployeeName(empData.name || 'Unknown');

        const monthDocId = getCurrentMonthDocId();
        const dayKey = getCurrentDayKey();
        const attendanceRef = doc(db, 'users_01', empDoc.id, 'attendance', monthDocId);
        const attendanceSnap = await getDoc(attendanceRef);
        setIsClockedIn(attendanceSnap.exists() && attendanceSnap.data().days?.[dayKey]?.isClockedIn === true);
        setStatusMessage('');
      } catch (err) {
        console.error('Error:', err);
        setStatusMessage('Error checking status.');
      }
    };

    checkStatus();
  }, [employeeId]);

  const handleClockIn = async () => {
    if (!employeeId || !userDocId) {
      setStatusMessage('Enter valid Employee ID or Phone.');
      return;
    }

    try {
      const monthDocId = getCurrentMonthDocId();
      const dayKey = getCurrentDayKey();
      const attendanceRef = doc(db, 'users_01', userDocId, 'attendance', monthDocId);

      await runTransaction(db, async (transaction) => {
        const attendanceDoc = await transaction.get(attendanceRef);

        if (!attendanceDoc.exists()) {
          transaction.set(attendanceRef, {
            days: { [dayKey]: { sessions: [{ checkIn: new Date(), checkOut: null }], isClockedIn: true } },
            metadata: { created: serverTimestamp(), lastUpdated: serverTimestamp() },
          });
        } else {
          const days = attendanceDoc.data().days || {};
          if (days[dayKey]?.isClockedIn) {
            throw new Error('Already clocked in.');
          }
          transaction.update(attendanceRef, {
            [`days.${dayKey}.sessions`]: arrayUnion({ checkIn: new Date(), checkOut: null }),
            [`days.${dayKey}.isClockedIn`]: true,
            'metadata.lastUpdated': serverTimestamp(),
          });
        }
      });

      setStatusMessage('Clocked in.');
      setIsClockedIn(true);
    } catch (err) {
      console.error('Clock In error:', err);
      setStatusMessage(err.message || 'Clock In failed.');
    }
  };

  const handleClockOut = async () => {
    if (!employeeId || !userDocId) {
      setStatusMessage('Enter valid Employee ID or Phone.');
      return;
    }

    try {
      const monthDocId = getCurrentMonthDocId();
      const dayKey = getCurrentDayKey();
      const attendanceRef = doc(db, 'users_01', userDocId, 'attendance', monthDocId);

      await runTransaction(db, async (transaction) => {
        const attendanceDoc = await transaction.get(attendanceRef);
        if (!attendanceDoc.exists()) {
          throw new Error('No attendance record.');
        }

        const days = attendanceDoc.data().days || {};
        if (!days[dayKey]?.isClockedIn) {
          throw new Error('Not clocked in.');
        }

        const todaySessions = days[dayKey].sessions || [];
        const lastSessionIndex = todaySessions.length - 1;
        if (!todaySessions[lastSessionIndex].checkIn) {
          throw new Error('No open session.');
        }

        todaySessions[lastSessionIndex].checkOut = new Date();

        transaction.update(attendanceRef, {
          [`days.${dayKey}.sessions`]: todaySessions,
          [`days.${dayKey}.isClockedIn`]: false,
          'metadata.lastUpdated': serverTimestamp(),
        });
      });

      setStatusMessage('Clocked out.');
      setIsClockedIn(false);
    } catch (err) {
      console.error('Clock Out error:', err);
      setStatusMessage(err.message || 'Clock Out failed.');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Employee Attendance</h2>
      <input
        type="text"
        placeholder="Enter Employee ID or Phone"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value.trim())}
        className="border p-2 mb-4 w-full rounded"
      />
      {employeeName && (
        <p className="mb-4 text-sm">
          Employee: {employeeName} ({isClockedIn === null ? 'Unknown' : isClockedIn ? 'Clocked In' : 'Clocked Out'})
        </p>
      )}
      <div className="flex gap-4 mb-4">
        <button
          onClick={handleClockIn}
          className="bg-green-600 text-white p-2 rounded disabled:opacity-50"
          disabled={isClockedIn === true}
        >
          Clock In
        </button>
        <button
          onClick={handleClockOut}
          className="bg-red-600 text-white p-2 rounded disabled:opacity-50"
          disabled={isClockedIn !== true}
        >
          Clock Out
        </button>
      </div>
      {statusMessage && (
        <p className={`text-lg text-center ${statusMessage.includes('Clocked') ? 'text-green-600' : 'text-red-600'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}
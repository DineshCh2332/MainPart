import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, isToday } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ManagerAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const calendarRef = useRef(null);

  const formatFirebaseDate = (date) => format(date, 'yyyy-MM-dd');

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

  const fetchAttendanceData = async (selectedDate) => {
    setLoading(true);
    try {
      const dateStr = formatFirebaseDate(selectedDate);
      const empCollection = collection(db, "users_01");
      const empSnapshot = await getDocs(empCollection);
  
      let logs = [];
  
      for (const empDoc of empSnapshot.docs) {
        const empData = empDoc.data();
        const empName = empData.name || empDoc.id;
  
        const sessionsRef = collection(
          db, 
          "users_01", 
          empDoc.id, 
          "attendance", 
          dateStr, 
          "sessions"
        );
        
        const sessionSnapshot = await getDocs(sessionsRef);
  
        sessionSnapshot.forEach((sessionDoc) => {
          const sessionData = sessionDoc.data();
          // Include both system and admin records
          if (sessionData.source !== "system" && sessionData.source !== "admin") return;
  
          const checkIn = sessionData.checkIn?.toDate();
          const checkOut = sessionData.checkOut?.toDate();
  
          const checkInStr = checkIn ? format(checkIn, 'HH:mm') : "";
          const checkOutStr = checkOut ? format(checkOut, 'HH:mm') : "";
  
          let worked = "Incomplete";
          if (checkIn && checkOut) {
            const duration = checkOut - checkIn;
            const hrs = Math.floor(duration / (1000 * 60 * 60));
            const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
            worked = `${hrs}h ${mins}m`;
          }
  
          logs.push({
            empName,
            checkInStr,
            checkOutStr,
            worked,
            empId: empDoc.id,
            sessionId: sessionDoc.id,
            checkInTime: checkIn?.getTime() || 0,
            originalCheckIn: checkIn,
            originalCheckOut: checkOut,
            editedBy: sessionData.editedBy,
            editedAt: sessionData.editedAt?.toDate(),
            checkInEdited: sessionData.checkInEdited || false,
            checkOutEdited: sessionData.checkOutEdited || false,
            isToday: isToday(checkIn),
            source: sessionData.source || "system" // Add source information
          });
        });
      }
  
      logs.sort((a, b) => b.checkInTime - a.checkInTime);
      setAttendanceData(logs);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  

  const saveEdit = async (record) => {
    try {
      const dateStr = formatFirebaseDate(date);
      const sessionRef = doc(
        db,
        "users_01",
        record.empId,
        "attendance",
        dateStr,
        "sessions",
        record.sessionId
      );
  
      const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);
  
      const baseDate = record.originalCheckIn || new Date();
  
      const newCheckIn = new Date(baseDate);
      newCheckIn.setHours(checkInHour);
      newCheckIn.setMinutes(checkInMinute);
  
      const newCheckOut = new Date(baseDate);
      newCheckOut.setHours(checkOutHour);
      newCheckOut.setMinutes(checkOutMinute);

      // Determine which fields were actually edited
      const checkInEdited = record.checkInStr !== editData.checkInStr;
      const checkOutEdited = record.checkOutStr !== editData.checkOutStr;
  
      await updateDoc(sessionRef, {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        editedBy: "Manager",
        editedAt: serverTimestamp(),
        checkInEdited: checkInEdited || record.checkInEdited,
        checkOutEdited: checkOutEdited || record.checkOutEdited
      });
  
      setEditing(null);
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

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
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Manager Attendance</h1>
        <button 
          style={styles.calendarButton}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <svg style={styles.calendarIcon} viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>

      <div style={styles.dateRow}>
        <div style={styles.dateDisplay}>Date: {formattedDate}</div>
      </div>

      <div style={styles.timeRange}>
        Showing shifts between {startTimeStr} and {endTimeStr}
      </div>

      {showCalendar && (
        <div style={styles.calendarPopup} ref={calendarRef}>
          <Calendar 
            onChange={(newDate) => {
              setDate(newDate);
              setShowCalendar(false);
            }} 
            value={date} 
          />
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading attendance data...</div>
      ) : (
        <table style={styles.attendanceTable}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Employee</th>
              <th style={styles.tableHeader}>Check-In</th>
              <th style={styles.tableHeader}>Check-Out</th>
              <th style={styles.tableHeader}>Hours Worked</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((record, index) => (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.tableCell}>{record.empName}</td>
                  <td style={styles.tableCell}>
                    {editing === index ? (
                      <input
                        type="time"
                        value={editData.checkInStr}
                        onChange={(e) => setEditData({ ...editData, checkInStr: e.target.value })}
                        style={styles.timeInput}
                      />
                    ) : (
                      <div style={styles.timeCell}>
                        <div>{record.checkInStr || "-"}</div>
                        {record.checkInEdited && (
                          <div style={styles.editedLabel}>Edited</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={styles.tableCell}>
                    {editing === index ? (
                      <input
                        type="time"
                        value={editData.checkOutStr}
                        onChange={(e) => setEditData({ ...editData, checkOutStr: e.target.value })}
                        style={styles.timeInput}
                      />
                    ) : (
                      <div style={styles.timeCell}>
                        <div>{record.checkOutStr || "-"}</div>
                        {record.checkOutEdited && (
                          <div style={styles.editedLabel}>Edited</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={styles.tableCell}>{record.worked}</td>
                  <td style={styles.tableCell}>
        {editing === index ? (
          <>
            <button onClick={() => saveEdit(record)} style={styles.saveButton}>Save</button>
            <button onClick={() => setEditing(null)} style={styles.cancelButton}>Cancel</button>
          </>
        ) : (
          record.isToday && ( // Only show edit button if it's today's record
            <button 
              onClick={() => {
                setEditing(index);
                setEditData({
                  checkInStr: record.checkInStr,
                  checkOutStr: record.checkOutStr
                });
              }} 
              style={styles.editButton}
            >
              Edit
            </button>
          )
        )}
      </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={styles.noRecords}>
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

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '900px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    backgroundColor: '#fff',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333',
  },
  dateRow: {
    marginBottom: '10px',
  },
  dateDisplay: {
    fontSize: '14px',
    color: '#333',
  },
  timeRange: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '20px',
  },
  calendarButton: {
    background: '#1a73e8',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    height: '32px',
    width: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  calendarIcon: {
    width: '16px',
    height: '16px',
    stroke: '#fff',
    strokeWidth: '2',
  },
  calendarPopup: {
    position: 'absolute',
    top: '60px',
    right: '20px',
    zIndex: 100,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  attendanceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    textAlign: 'left',
    padding: '10px',
    borderBottom: '1px solid #ddd',
    fontSize: '14px',
  },
  tableCell: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    fontSize: '13px',
    verticalAlign: 'top',
  },
  timeCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  editedLabel: {
    fontSize: '10px',
    color: '#666',
    fontStyle: 'italic',
  },
  timeInput: {
    padding: '5px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  tableRow: {},
  editButton: {
    backgroundColor: '#1a73e8',
    color: '#fff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '5px',
  },
  saveButton: {
    backgroundColor: '#34a853',
    color: '#fff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '5px',
  },
  cancelButton: {
    backgroundColor: '#ea4335',
    color: '#fff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noRecords: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
  },
};

export default ManagerAttendance;

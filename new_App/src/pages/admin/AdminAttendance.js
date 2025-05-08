// import React, { useState, useEffect, useRef } from 'react';
// import { format, addDays, isToday, isBefore } from 'date-fns';
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';
// import { collection, query,where, getDoc, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
// import { db } from '../../firebase/config';

// const AdminAttendance = () => {
//   const [date, setDate] = useState(new Date());
//   const [showCalendar, setShowCalendar] = useState(false);
//   const [attendanceData, setAttendanceData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [editing, setEditing] = useState(null);
//   const [editData, setEditData] = useState({});
//   const [addingNew, setAddingNew] = useState(false);
//   const [newData, setNewData] = useState({ empId: "", checkInStr: "", checkOutStr: "" });
//   const [employees, setEmployees] = useState([]);
//   const [shiftStartDate, setShiftStartDate] = useState(new Date());
//   const [shiftEndDate, setShiftEndDate] = useState(new Date());
//   const [showStartCalendar, setShowStartCalendar] = useState(false);
//   const [showEndCalendar, setShowEndCalendar] = useState(false);
//   const calendarRef = useRef(null);
//   const startCalendarRef = useRef(null);
//   const endCalendarRef = useRef(null);

//   const formatFirebaseDate = (date) => format(date, 'yyyy-MM-dd');

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (calendarRef.current && !calendarRef.current.contains(event.target)) {
//         setShowCalendar(false);
//       }
//       if (startCalendarRef.current && !startCalendarRef.current.contains(event.target)) {
//         setShowStartCalendar(false);
//       }
//       if (endCalendarRef.current && !endCalendarRef.current.contains(event.target)) {
//         setShowEndCalendar(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const fetchEmployees = async () => {
//     const empCollection = collection(db, "users_01");
//     const empSnapshot = await getDocs(empCollection);
//     const empList = empSnapshot.docs
//       .map(doc => ({ id: doc.id, ...doc.data() }))
//       .filter(emp => ['employee', 'manager', 'teamleader'].includes(emp.role)); // 👈 Filter here
//     setEmployees(empList);
//   };


//   const fetchAttendanceData = async (selectedDate) => {
//     setLoading(true);
//     try {
//       const dateStr = formatFirebaseDate(selectedDate);
//       const sessionsRef = collection(db, "attendance", dateStr, "sessions");
//       const sessionSnapshot = await getDocs(sessionsRef);

//       const logs = await Promise.all(sessionSnapshot.docs.map(async (sessionDoc) => {
//         const sessionData = sessionDoc.data();
//         const userRef = doc(db, "users_01", sessionData.user.id);
//         const userSnap = await getDoc(userRef);

//         const checkIn = sessionData.checkIn?.toDate();
//         const checkOut = sessionData.checkOut?.toDate();

//         let worked = "Incomplete";
//         if (checkIn && checkOut) {
//           const duration = checkOut - checkIn;
//           const hrs = Math.floor(duration / (1000 * 60 * 60));
//           const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
//           worked = `${hrs}h ${mins}m`;
//         }

//         return {
//           empName: userSnap.data()?.name || "Unknown",
//           checkInStr: checkIn ? format(checkIn, 'HH:mm') : "",
//           checkOutStr: checkOut ? format(checkOut, 'HH:mm') : "",
//           worked,
//           empId: sessionData.user.id,
//           sessionId: sessionDoc.id,
//           checkInTime: checkIn?.getTime() || 0,
//           originalCheckIn: checkIn,
//           originalCheckOut: checkOut,
//           editedBy: sessionData.editedBy,
//           editedAt: sessionData.editedAt?.toDate(),
//           checkInEdited: sessionData.checkInEdited || false,
//           checkOutEdited: sessionData.checkOutEdited || false,
//           checkInTime: checkIn?.getTime() || 0,
//         };
//       }));

//       setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
//     } catch (error) {
//       console.error("Error fetching attendance data:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Modified date range handling
//   const startTime = new Date(date);
//   startTime.setHours(1, 0, 0, 0); // Set to 1 AM of selected date
//   const endTime = addDays(startTime, 1); // 1 AM next day

//   const formattedDate = format(date, 'dd-MMM-yyyy');
//   const filteredData = attendanceData.filter(record => {
//     const recordDate = new Date(record.checkInTime);
//     return recordDate >= startTime && recordDate < endTime;
//   });

//   // Updated time range display
//   const startTimeStr = format(startTime, 'dd MMM yyyy HH:mm');
//   const endTimeStr = format(endTime, 'dd MMM yyyy HH:mm');


//   const saveEdit = async (record) => {
//     try {
//       const dateStr = formatFirebaseDate(date);
//       const sessionRef = doc(db, "attendance", dateStr, "sessions", record.sessionId);

//       const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
//       const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);

//       const newCheckIn = new Date(record.originalCheckIn);
//       newCheckIn.setHours(checkInHour, checkInMinute);
//       const newCheckOut = new Date(record.originalCheckOut || newCheckIn);
//       newCheckOut.setHours(checkOutHour, checkOutMinute);

//       if (isBefore(newCheckOut, newCheckIn)) {
//         alert("Check-out time must be after check-in time!");
//         return;
//       }

//       await updateDoc(sessionRef, {
//         checkIn: newCheckIn,
//         checkOut: newCheckOut,
//         editedBy: "Admin",
//         editedAt: serverTimestamp(),
//         checkInEdited: true,
//         checkOutEdited: true
//       });

//       setEditing(null);
//       fetchAttendanceData(date);
//     } catch (error) {
//       console.error("Error updating attendance:", error);
//     }
//   };

//   const deleteShift = async (record) => {
//     try {
//       const dateStr = formatFirebaseDate(date);
//       const sessionRef = doc(db, "attendance", dateStr, "sessions", record.sessionId);
//       await deleteDoc(sessionRef);
//       fetchAttendanceData(date);
//     } catch (error) {
//       console.error("Error deleting shift:", error);
//     }
//   };

//   const addNewAttendance = async () => {
//     try {
//       if (!newData.empId || !newData.checkInStr || !newData.checkOutStr) {
//         alert("Please fill all fields");
//         return;
//       }

//       const [checkInHour, checkInMinute] = newData.checkInStr.split(':').map(Number);
//       const [checkOutHour, checkOutMinute] = newData.checkOutStr.split(':').map(Number);

//       const checkInDate = new Date(shiftStartDate);
//       checkInDate.setHours(checkInHour, checkInMinute);
//       const checkOutDate = new Date(shiftEndDate);
//       checkOutDate.setHours(checkOutHour, checkOutMinute);

//       if (isBefore(checkOutDate, checkInDate)) {
//         alert("Check-out time must be after check-in time!");
//         return;
//       }

//       const dateStr = formatFirebaseDate(shiftStartDate);
//       const sessionsRef = collection(db, "attendance", dateStr, "sessions");
//       await addDoc(sessionsRef, {
//         checkIn: checkInDate,
//         checkOut: checkOutDate,
//         user: doc(db, "users_01", newData.empId),
//         editedBy: "Admin",
//         editedAt: serverTimestamp(),
//         source: "admin",
//         checkInEdited: false,
//         checkOutEdited: false
//       });

//       setAddingNew(false);
//       setNewData({ empId: "", checkInStr: "", checkOutStr: "" });
//       fetchAttendanceData(date);
//     } catch (error) {
//       console.error("Error adding attendance:", error);
//     }
//   };

//   const formatDateTimeDisplay = (date, timeStr) => {
//     const [hours, minutes] = timeStr.split(':').map(Number);
//     const newDate = new Date(date);
//     newDate.setHours(hours, minutes);
//     return format(newDate, 'dd MMM yyyy, HH:mm');
//   };


//   useEffect(() => {
//     fetchEmployees();
//     fetchAttendanceData(date);
//   }, [date]);

//   return (
//     <div style={styles.container}>
//       <div style={styles.header}>
//         <h1 style={styles.title}>Admin Attendance Management</h1>
//         <button
//           style={styles.calendarButton}
//           onClick={() => setShowCalendar(!showCalendar)}
//         >
//           {showCalendar ? "Hide Calendar" : "Select Date"}
//         </button>
//       </div>

//       <div style={styles.dateRow}>
//         <div style={styles.dateDisplay}>Date: {formattedDate}</div>
//       </div>

//       <div style={styles.timeRange}>
//         Showing shifts between {startTimeStr} and {endTimeStr}
//       </div>


//       {showCalendar && (
//         <div style={styles.calendarPopup} ref={calendarRef}>
//           <Calendar
//             onChange={(newDate) => {
//               setDate(newDate);
//               setShowCalendar(false);
//             }}
//             value={date}
//           />
//         </div>
//       )}
//       {loading ? (
//         <div style={styles.loading}>Loading attendance data...</div>
//       ) : (
//         <table style={styles.attendanceTable}>
//           <thead>
//             <tr>
//               <th style={styles.tableHeader}>Employee</th>
//               <th style={styles.tableHeader}>Check-In</th>
//               <th style={styles.tableHeader}>Check-Out</th>
//               <th style={styles.tableHeader}>Hours Worked</th>
//               <th style={styles.tableHeader}>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredData.map((record, index) => (
//               <tr key={index} style={styles.tableRow}>
//                 <td style={styles.tableCell}>{record.empName}</td>
//                 <td style={styles.tableCell}>
//                   {editing === index ? (
//                     <input
//                       type="time"
//                       value={editData.checkInStr}
//                       onChange={(e) => setEditData({ ...editData, checkInStr: e.target.value })}
//                       style={styles.timeInput}
//                     />
//                   ) : (
//                     <div style={styles.timeCell}>
//                       <div>{record.checkInStr || "-"}</div>
//                       {record.checkInEdited && <div style={styles.editedLabel}>Edited</div>}
//                     </div>
//                   )}
//                 </td>
//                 <td style={styles.tableCell}>
//                   {editing === index ? (
//                     <input
//                       type="time"
//                       value={editData.checkOutStr}
//                       onChange={(e) => setEditData({ ...editData, checkOutStr: e.target.value })}
//                       style={styles.timeInput}
//                     />
//                   ) : (
//                     <div style={styles.timeCell}>
//                       <div>{record.checkOutStr || "-"}</div>
//                       {record.checkOutEdited && <div style={styles.editedLabel}>Edited</div>}
//                     </div>
//                   )}
//                 </td>
//                 <td style={styles.tableCell}>{record.worked}</td>
//                 <td style={styles.tableCell}>
//                   {editing === index ? (
//                     <>
//                       <button onClick={() => saveEdit(record)} style={styles.saveButton}>Save</button>
//                       <button onClick={() => setEditing(null)} style={styles.cancelButton}>Cancel</button>
//                     </>
//                   ) : (
//                     <div style={styles.actionButtons}>
//                       <button
//                         onClick={() => {
//                           setEditData({ checkInStr: record.checkInStr, checkOutStr: record.checkOutStr });
//                           setTimeout(() => setEditing(index), 0);
//                         }}
//                         style={styles.editButton}
//                       >
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => deleteShift(record)}
//                         style={styles.deleteButton}
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}

//       <div style={styles.addSection}>
//         <button
//           onClick={() => setAddingNew(!addingNew)}
//           style={styles.addButton}
//         >
//           {addingNew ? "Cancel" : "➕ Add Attendance"}
//         </button>

//         {addingNew && (
//           <div style={styles.addForm}>
//             <select
//               value={newData.empId}
//               onChange={(e) => setNewData({ ...newData, empId: e.target.value })}
//               style={styles.selectInput}
//             >
//               <option value="">Select Employee</option>
//               {employees.map(emp => (
//                 <option key={emp.id} value={emp.id}>{emp.name}</option>
//               ))}
//             </select>

//             <div style={styles.dateTimeGroup}>
//               <div style={styles.dateTimeInput}>
//                 <div style={styles.dateDisplay}>
//                   Start: {format(shiftStartDate, 'dd MMM yyyy')}
//                   <button
//                     onClick={() => setShowStartCalendar(!showStartCalendar)}
//                     style={styles.smallCalendarButton}
//                   >
//                     📅
//                   </button>
//                 </div>
//                 {showStartCalendar && (
//                   <div style={styles.calendarPopup} ref={startCalendarRef}>
//                     <Calendar
//                       onChange={(date) => {
//                         setShiftStartDate(date);
//                         setShowStartCalendar(false);
//                       }}
//                       value={shiftStartDate}
//                     />
//                   </div>
//                 )}
//                 <input
//                   type="time"
//                   value={newData.checkInStr}
//                   onChange={(e) => setNewData({ ...newData, checkInStr: e.target.value })}
//                   style={styles.timeInput}
//                 />
//               </div>

//               <div style={styles.dateTimeInput}>
//                 <div style={styles.dateDisplay}>
//                   End: {format(shiftEndDate, 'dd MMM yyyy')}
//                   <button
//                     onClick={() => setShowEndCalendar(!showEndCalendar)}
//                     style={styles.smallCalendarButton}
//                   >
//                     📅
//                   </button>
//                 </div>
//                 {showEndCalendar && (
//                   <div style={styles.calendarPopup} ref={endCalendarRef}>
//                     <Calendar
//                       onChange={(date) => {
//                         setShiftEndDate(date);
//                         setShowEndCalendar(false);
//                       }}
//                       value={shiftEndDate}
//                     />
//                   </div>
//                 )}
//                 <input
//                   type="time"
//                   value={newData.checkOutStr}
//                   onChange={(e) => setNewData({ ...newData, checkOutStr: e.target.value })}
//                   style={styles.timeInput}
//                 />
//               </div>
//             </div>

//             <button
//               onClick={() => {
//                 setTimeout(() => addNewAttendance(), 0);
//               }}
//               style={styles.saveButton}
//             >
//               Add
//             </button>

//           </div>
//         )}
//       </div>
//     </div>
//   );
// };


// const styles = {
//   container: {
//     fontFamily: 'Arial, sans-serif',
//     maxWidth: '900px',
//     margin: '20px auto',
//     padding: '20px',
//     border: '1px solid black',
//     borderRadius: '4px',
//     backgroundColor: '#fff',
//     position: 'relative',
//   },
//   header: {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: '15px',
//   },
//   title: {
//     fontSize: '22px',
//     fontWeight: 'bold',
//     margin: 0,
//     color: '#333',
//   },
//   dateRow: {
//     marginBottom: '10px',
//   },
//   dateDisplay: {
//     fontSize: '14px',
//     color: '#333',
//   },
//   timeRange: {
//     fontSize: '13px',
//     color: '#666',
//     marginBottom: '20px',
//   },
//   calendarButton: {
//     background: '#1a73e8',
//     color: '#fff',
//     border: 'none',
//     borderRadius: '4px',
//     cursor: 'pointer',
//     padding: '8px 12px',
//     fontSize: '14px',
//   },
//   calendarPopup: {
//     position: 'absolute',
//     top: '60px',
//     right: '20px',
//     zIndex: 100,
//     backgroundColor: '#fff',
//     border: '1px solid #ddd',
//     borderRadius: '4px',
//     color: '#333', // Changed from 'black' to match the dark text
//     boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
//   },
//   attendanceTable: {
//     width: '100%',
//     borderCollapse: 'collapse',
//     marginTop: '15px',
//   },
//   tableHeader: {
//     backgroundColor: '#f5f5f5',
//     textAlign: 'left',
//     padding: '10px',
//     borderBottom: '1px solid #ddd',
//     fontSize: '14px',
//   },
//   tableCell: {
//     padding: '10px',
//     borderBottom: '1px solid #eee',
//     fontSize: '13px',
//     verticalAlign: 'top',
//   },
//   timeCell: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '2px',
//   },
//   editedLabel: {
//     fontSize: '10px',
//     color: '#666',
//     fontStyle: 'italic',
//   },
//   timeInput: {
//     padding: '5px',
//     border: '1px solid #ddd',
//     borderRadius: '4px',
//     marginRight: '5px',
//   },
//   tableRow: {},
//   editButton: {
//     backgroundColor: '#1a73e8',
//     color: '#fff',
//     border: 'none',
//     padding: '5px 10px',
//     borderRadius: '4px',
//     cursor: 'pointer',
//     fontSize: '12px',
//   },
//   saveButton: {
//     backgroundColor: '#34a853',
//     color: '#fff',
//     border: 'none',
//     padding: '5px 10px',
//     borderRadius: '4px',
//     cursor: 'pointer',
//     fontSize: '12px',
//     marginRight: '5px',
//   },
//   cancelButton: {
//     backgroundColor: '#ea4335',
//     color: '#fff',
//     border: 'none',
//     padding: '5px 10px',
//     borderRadius: '4px',
//     cursor: 'pointer',
//     fontSize: '12px',
//   },
//   noRecords: {
//     padding: '20px',
//     textAlign: 'center',
//     color: '#999',
//     fontSize: '14px',
//   },
//   loading: {
//     padding: '20px',
//     textAlign: 'center',
//     color: '#666',
//   },
//   addSection: {
//     marginTop: '20px',
//   },
//   addButton: {
//     backgroundColor: '#1a73e8',
//     color: '#fff',
//     border: 'none',
//     padding: '8px 12px',
//     borderRadius: '4px',
//     cursor: 'pointer',
//     fontSize: '14px',
//   },
//   addForm: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '10px',
//     marginTop: '10px',
//   },
//   selectInput: {
//     padding: '5px',
//     border: '1px solid #ddd',
//     borderRadius: '4px',
//     minWidth: '150px',
//   },
//   actionButtons: {
//     display: 'flex',
//     gap: '5px',
//   },
//   deleteButton: {
//     backgroundColor: '#ea4335',
//     color: '#fff',
//     border: 'none',
//     padding: '5px 10px',
//     borderRadius: '4px',
//     cursor: 'pointer',
//     fontSize: '12px',
//   },
//   dateTimeGroup: {
//     display: 'flex',
//     gap: '15px',
//     margin: '10px 0',
//   },
//   dateTimeInput: {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '5px',
//   },
//   smallCalendarButton: {
//     background: 'none',
//     border: 'none',
//     cursor: 'pointer',
//     fontSize: '16px',
//     padding: 0,
//   },
//   preview: {
//     margin: '10px 0',
//     fontSize: '14px',
//     color: '#555',
//   },
// };

// export default AdminAttendance;

import React, { useState, useEffect } from 'react';
import { format, addDays, isToday, isBefore } from 'date-fns';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const AdminAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState({ empId: "", checkInStr: "", checkOutStr: "" });
  const [employees, setEmployees] = useState([]);
  const [shiftStartDate, setShiftStartDate] = useState(new Date());
  const [shiftEndDate, setShiftEndDate] = useState(new Date());
  const isTodayDate = isToday(date);

  const formatFirebaseDate = (date) => format(date, 'yyyy-MM-dd');
  
  const fetchEmployees = async () => {
    const empCollection = collection(db, "users_01");
    const empSnapshot = await getDocs(empCollection);
    const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(empList);
  };

  const calculateWorkedHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Incomplete";
    const duration = checkOut - checkIn;
    const hrs = Math.floor(duration / (1000 * 60 * 60));
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  const fetchAttendanceData = async (selectedDate) => {
    setLoading(true);
    try {
      const dateStr = formatFirebaseDate(selectedDate);
      const sessionsCollection = collection(db, "attendance", dateStr, "sessions");
      const sessionsSnapshot = await getDocs(sessionsCollection);

      let logs = [];

      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = sessionDoc.data();
        const userRef = sessionData.user;
        let userData = {};
        let empName = "Unknown";
        
        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            userData = userDoc.data();
            empName = userData.name || userRef.id;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }

        const checkIn = sessionData.checkIn?.toDate();
        const checkOut = sessionData.checkOut?.toDate();

        logs.push({
          empName,
          checkInStr: checkIn ? format(checkIn, 'HH:mm') : "",
          checkOutStr: checkOut ? format(checkOut, 'HH:mm') : "",
          worked: calculateWorkedHours(checkIn, checkOut),
          empId: userRef.id,
          sessionId: sessionDoc.id,
          checkInTime: checkIn?.getTime() || 0,
          originalCheckIn: checkIn,
          originalCheckOut: checkOut,
          status: sessionData.status || "open",
          role: sessionData.role || "employee",
          checkInEdited: sessionData.checkInEdited || false,
          checkOutEdited: sessionData.checkOutEdited || false
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
      const sessionRef = doc(db, "attendance", dateStr, "sessions", record.sessionId);

      const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);

      const baseDate = record.originalCheckIn || new Date();

      const newCheckIn = new Date(baseDate);
      newCheckIn.setHours(checkInHour);
      newCheckIn.setMinutes(checkInMinute);

      const newCheckOut = new Date(baseDate);
      newCheckOut.setHours(checkOutHour);
      newCheckOut.setMinutes(checkOutMinute);

      if (isBefore(newCheckOut, newCheckIn)) {
        alert("End time cannot be before start time!");
        return;
      }

      const updates = {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        status: "closed",
        editedAt: serverTimestamp()
      };

      // Track which fields were edited
      if (record.checkInStr !== editData.checkInStr) {
        updates.checkInEdited = true;
      }
      if (record.checkOutStr !== editData.checkOutStr) {
        updates.checkOutEdited = true;
      }

      await updateDoc(sessionRef, updates);

      setEditing(null);
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  const deleteShift = async (record) => {
    if (!window.confirm(`Are you sure you want to delete this shift for ${record.empName}?`)) {
      return;
    }

    try {
      const dateStr = formatFirebaseDate(date);
      const sessionRef = doc(db, "attendance", dateStr, "sessions", record.sessionId);

      await deleteDoc(sessionRef);
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert("Failed to delete shift. Please try again.");
    }
  };

  const addNewAttendance = async () => {
    try {
      if (!newData.empId || !newData.checkInStr || !newData.checkOutStr) {
        alert("Please fill all fields.");
        return;
      }

      const [checkInHour, checkInMinute] = newData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = newData.checkOutStr.split(':').map(Number);

      const checkInDate = new Date(shiftStartDate);
      checkInDate.setHours(checkInHour, checkInMinute);

      const checkOutDate = new Date(shiftEndDate);
      checkOutDate.setHours(checkOutHour, checkOutMinute);

      const isSameDay = format(shiftStartDate, 'yyyy-MM-dd') === format(shiftEndDate, 'yyyy-MM-dd');

      if (isSameDay) {
        if (checkOutHour < checkInHour || 
            (checkOutHour === checkInHour && checkOutMinute <= checkInMinute)) {
          alert("Check-out time must be after check-in time on the same day!");
          return;
        }
      } else {
        if (isBefore(shiftEndDate, shiftStartDate)) {
          alert("End date cannot be before start date!");
          return;
        }
      }

      const dateStr = formatFirebaseDate(shiftStartDate);
      const userRef = doc(db, "users_01", newData.empId);

      const sessionCollection = collection(db, "attendance", dateStr, "sessions");

      await addDoc(sessionCollection, {
        user: userRef,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: "closed",
        role: "employee",
        editedBy: "admin",
        checkInEdited: false,
        checkOutEdited: false
      });

      setAddingNew(false);
      setNewData({ empId: "", checkInStr: "", checkOutStr: "" });
      setShiftStartDate(new Date());
      setShiftEndDate(new Date());
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error adding new attendance:", error);
    }
  };

  const formatDateTimeDisplay = (date, timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes);
    return format(newDate, 'dd MMM yyyy, HH:mm');
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
    fetchEmployees();
    fetchAttendanceData(date);
  }, [date]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Attendance Management</h1>
        <div style={styles.dateInputContainer}>
          <input
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => setDate(new Date(e.target.value))}
            style={styles.dateInput}
          />
        </div>
      </div>

      <div style={styles.dateRow}>
        <div style={styles.dateDisplay}>Date: {formattedDate}</div>
      </div>

      <div style={styles.timeRange}>
        Showing shifts between {startTimeStr} and {endTimeStr}
      </div>

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
              {isTodayDate && <th style={styles.tableHeader}>Actions</th>}
            </tr>
          </thead>
          <tbody >
            {filteredData.length > 0 ? (
              filteredData.map((record, index) => (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.tableCell}>{record.empName}</td>
                  <td style={styles.tableCell}>
                    {editing === index ? (
                      <input
                        type="time"
                        value={editData.checkInStr}
                        onChange={(e) => setEditData({...editData, checkInStr: e.target.value})}
                        style={styles.timeInput}
                      />
                    ) : (
                      <div style={styles.timeCell}>
                        <div>{record.checkInStr || "-"}</div>
                        {record.checkInEdited && <div style={styles.editedLabel}>Edited</div>}
                      </div>
                    )}
                  </td>
                  <td style={styles.tableCell}>
                    {editing === index ? (
                      <input
                        type="time"
                        value={editData.checkOutStr}
                        onChange={(e) => setEditData({...editData, checkOutStr: e.target.value})}
                        style={styles.timeInput}
                      />
                    ) : (
                      <div style={styles.timeCell}>
                        <div>{record.checkOutStr || "-"}</div>
                        {record.checkOutEdited && <div style={styles.editedLabel}>Edited</div>}
                      </div>
                    )}
                  </td>
                  <td style={styles.tableCell}>{record.worked}</td>
                  {isTodayDate && (
                    <td style={styles.tableCell}>
                      {editing === index ? (
                        <>
                          <button onClick={() => saveEdit(record)} style={styles.saveButton}>Save</button>
                          <button onClick={() => setEditing(null)} style={styles.cancelButton}>Cancel</button>
                        </>
                      ) : (
                        <div style={styles.actionButtons}>
                          <button 
                            onClick={() => {
                              setEditing(index);
                              setEditData({
                                checkInStr: record.checkInStr || '',
                                checkOutStr: record.checkOutStr || ''
                              });
                            }} 
                            style={styles.editButton}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteShift(record)} 
                            style={styles.deleteButton}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isTodayDate ? 5 : 4} style={styles.noRecords}>
                  No attendance records found for this date
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={styles.addSection}>
        <button 
          onClick={() => setAddingNew(!addingNew)} 
          style={styles.addButton}
        >
          {addingNew ? "Cancel" : "➕ Add Attendance"}
        </button>

        {addingNew && (
          <div style={styles.addForm}>
            <select 
              value={newData.empId} 
              onChange={(e) => setNewData({ ...newData, empId: e.target.value })}
              style={styles.selectInput}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            <div style={styles.dateTimeGroup}>
              <div style={styles.dateTimeInput}>
                <label>Start Date</label>
                <input
                  type="date"
                  value={format(shiftStartDate, 'yyyy-MM-dd')}
                  onChange={(e) => setShiftStartDate(new Date(e.target.value))}
                  style={styles.dateInput}
                />
                <input
                  type="time"
                  value={newData.checkInStr}
                  onChange={(e) => setNewData({ ...newData, checkInStr: e.target.value })}
                  style={styles.timeInput}
                  placeholder="Start time"
                />
              </div>

              <div style={styles.dateTimeInput}>
                <label>End Date</label>
                <input
                  type="date"
                  value={format(shiftEndDate, 'yyyy-MM-dd')}
                  onChange={(e) => setShiftEndDate(new Date(e.target.value))}
                  style={styles.dateInput}
                />
                <input
                  type="time"
                  value={newData.checkOutStr}
                  onChange={(e) => setNewData({ ...newData, checkOutStr: e.target.value })}
                  style={styles.timeInput}
                  placeholder="End time"
                />
              </div>
            </div>

            <div style={styles.preview}>
              {newData.checkInStr && (
                <div>Start: {formatDateTimeDisplay(shiftStartDate, newData.checkInStr)}</div>
              )}
              {newData.checkOutStr && (
                <div>End: {formatDateTimeDisplay(shiftEndDate, newData.checkOutStr)}</div>
              )}
            </div>

            <button onClick={addNewAttendance} style={styles.saveButton}>Add</button>
          </div>
        )}
      </div>
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
  dateInputContainer: {
    position: 'relative',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
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
  attendanceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  tableHeader: {
    backgroundColor: '#1a73e8',
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
    marginRight: '5px',
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
  addSection: {
    marginTop: '20px',
  },
  addButton: {
    backgroundColor: '#1a73e8',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px',
  },
  selectInput: {
    padding: '5px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: '150px',
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
  },
  deleteButton: {
    backgroundColor: '#ea4335',
    color: '#fff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  dateTimeGroup: {
    display: 'flex',
    gap: '15px',
    margin: '10px 0',
  },
  dateTimeInput: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  preview: {
    margin: '10px 0',
    fontSize: '14px',
    color: '#555',
  },
};

export default AdminAttendance;
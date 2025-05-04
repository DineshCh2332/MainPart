// import React, { useState, useEffect, useRef } from 'react';
// import { format, addDays, isToday, isBefore } from 'date-fns';
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';
// import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
// import { db } from '../../firebase/config';
// import '../../css/calendar-overrides.css'

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
//   const isTodayDate = isToday(date);
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

//     if (showCalendar || showStartCalendar || showEndCalendar) {
//       document.addEventListener('mousedown', handleClickOutside);
//     } else {
//       document.removeEventListener('mousedown', handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [showCalendar, showStartCalendar, showEndCalendar]);

//   const fetchEmployees = async () => {
//     const empCollection = collection(db, "users_01");
//     const empSnapshot = await getDocs(empCollection);
//     const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//     setEmployees(empList);
//   };

//   const fetchAttendanceData = async (selectedDate) => {
//     setLoading(true);
//     try {
//       const dateStr = formatFirebaseDate(selectedDate);
//       const empCollection = collection(db, "users_01");
//       const empSnapshot = await getDocs(empCollection);

//       let logs = [];

//       for (const empDoc of empSnapshot.docs) {
//         const empData = empDoc.data();
//         const empName = empData.name || empDoc.id;

//         const sessionsRef = collection(
//           db, 
//           "users_01", 
//           empDoc.id, 
//           "attendance", 
//           dateStr, 
//           "sessions"
//         );
        
//         const sessionSnapshot = await getDocs(sessionsRef);

//         sessionSnapshot.forEach((sessionDoc) => {
//           const sessionData = sessionDoc.data();
//           if (sessionData.source !== "system" && sessionData.source !== "admin") return;

//           const checkIn = sessionData.checkIn?.toDate();
//           const checkOut = sessionData.checkOut?.toDate();

//           const checkInStr = checkIn ? format(checkIn, 'HH:mm') : "";
//           const checkOutStr = checkOut ? format(checkOut, 'HH:mm') : "";

//           let worked = "Incomplete";
//           if (checkIn && checkOut) {
//             const duration = checkOut - checkIn;
//             const hrs = Math.floor(duration / (1000 * 60 * 60));
//             const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
//             worked = `${hrs}h ${mins}m`;
//           }

//           logs.push({
//             empName,
//             checkInStr,
//             checkOutStr,
//             worked,
//             empId: empDoc.id,
//             sessionId: sessionDoc.id,
//             checkInTime: checkIn?.getTime() || 0,
//             originalCheckIn: checkIn,
//             originalCheckOut: checkOut,
//             editedBy: sessionData.editedBy,
//             editedAt: sessionData.editedAt?.toDate(),
//             checkInEdited: sessionData.checkInEdited || false,
//             checkOutEdited: sessionData.checkOutEdited || false
//           });
//         });
//       }

//       logs.sort((a, b) => b.checkInTime - a.checkInTime);
//       setAttendanceData(logs);
//     } catch (error) {
//       console.error("Error fetching attendance data:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const saveEdit = async (record) => {
//     try {
//       const dateStr = formatFirebaseDate(date);
//       const sessionRef = doc(
//         db,
//         "users_01",
//         record.empId,
//         "attendance",
//         dateStr,
//         "sessions",
//         record.sessionId
//       );
  
//       const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
//       const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);
  
//       const baseDate = record.originalCheckIn || new Date();
  
//       const newCheckIn = new Date(baseDate);
//       newCheckIn.setHours(checkInHour);
//       newCheckIn.setMinutes(checkInMinute);
  
//       const newCheckOut = new Date(baseDate);
//       newCheckOut.setHours(checkOutHour);
//       newCheckOut.setMinutes(checkOutMinute);

//       if (isBefore(newCheckOut, newCheckIn)) {
//         alert("End time cannot be before start time!");
//         return;
//       }

//       const checkInEdited = record.checkInStr !== editData.checkInStr || record.checkInEdited;
//       const checkOutEdited = record.checkOutStr !== editData.checkOutStr || record.checkOutEdited;
  
//       await updateDoc(sessionRef, {
//         checkIn: newCheckIn,
//         checkOut: newCheckOut,
//         editedBy: "Admin",
//         editedAt: serverTimestamp(),
//         checkInEdited: checkInEdited,
//         checkOutEdited: checkOutEdited,
//         source: "admin"
//       });
  
//       setEditing(null);
//       fetchAttendanceData(date);
//     } catch (error) {
//       console.error("Error updating attendance:", error);
//     }
//   };

//   const deleteShift = async (record) => {
//     if (!window.confirm(`Are you sure you want to delete this shift for ${record.empName}?`)) {
//       return;
//     }

//     try {
//       const dateStr = formatFirebaseDate(date);
//       const sessionRef = doc(
//         db,
//         "users_01",
//         record.empId,
//         "attendance",
//         dateStr,
//         "sessions",
//         record.sessionId
//       );

//       await deleteDoc(sessionRef);
//       fetchAttendanceData(date);
//     } catch (error) {
//       console.error("Error deleting shift:", error);
//       alert("Failed to delete shift. Please try again.");
//     }
//   };

//   const addNewAttendance = async () => {
//     try {
//       if (!newData.empId || !newData.checkInStr || !newData.checkOutStr) {
//         alert("Please fill all fields.");
//         return;
//       }
  
//       const [checkInHour, checkInMinute] = newData.checkInStr.split(':').map(Number);
//       const [checkOutHour, checkOutMinute] = newData.checkOutStr.split(':').map(Number);
  
//       const checkInDate = new Date(shiftStartDate);
//       checkInDate.setHours(checkInHour, checkInMinute);
  
//       const checkOutDate = new Date(shiftEndDate);
//       checkOutDate.setHours(checkOutHour, checkOutMinute);
  
//       // Check if dates are the same day
//       const isSameDay = format(shiftStartDate, 'yyyy-MM-dd') === format(shiftEndDate, 'yyyy-MM-dd');
  
//       if (isSameDay) {
//         // For same day, check if check-out is before check-in
//         if (checkOutHour < checkInHour || 
//             (checkOutHour === checkInHour && checkOutMinute <= checkInMinute)) {
//           alert("Check-out time must be after check-in time on the same day!");
//           return;
//         }
//       } else {
//         // For different days, check if end date is before start date
//         if (isBefore(shiftEndDate, shiftStartDate)) {
//           alert("End date cannot be before start date!");
//           return;
//         }
//       }
  
//       const dateStr = formatFirebaseDate(shiftStartDate);
  
//       const sessionCollection = collection(
//         db,
//         "users_01",
//         newData.empId,
//         "attendance",
//         dateStr,
//         "sessions"
//       );
  
//       await addDoc(sessionCollection, {
//         checkIn: checkInDate,
//         checkOut: checkOutDate,
//         editedBy: "Admin",
//         editedAt: serverTimestamp(),
//         source: "admin",
//         checkInEdited: false,
//         checkOutEdited: false
//       });
  
//       setAddingNew(false);
//       setNewData({ empId: "", checkInStr: "", checkOutStr: "" });
//       setShiftStartDate(new Date());
//       setShiftEndDate(new Date());
//       fetchAttendanceData(date);
//     } catch (error) {
//       console.error("Error adding new attendance:", error);
//     }
//   };
//   const formatDateTimeDisplay = (date, timeStr) => {
//     if (!timeStr) return "";
//     const [hours, minutes] = timeStr.split(':').map(Number);
//     const newDate = new Date(date);
//     newDate.setHours(hours, minutes);
//     return format(newDate, 'dd MMM yyyy, HH:mm');
//   };

//   const startTime = new Date(date);
//   startTime.setHours(1, 0, 0, 0);
//   const endTime = addDays(startTime, 1);

//   const formattedDate = format(date, 'dd-MMM-yyyy');
//   const startTimeStr = format(startTime, 'dd MMM yyyy hh:mm a');
//   const endTimeStr = format(endTime, 'dd MMM yyyy hh:mm a');

//   const filteredData = attendanceData.filter(record => {
//     const recordDate = new Date(record.checkInTime);
//     return recordDate >= startTime && recordDate < endTime;
//   });

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
//               {isTodayDate && <th style={styles.tableHeader}>Actions</th>}
//             </tr>
//           </thead>
//           <tbody>
//             {filteredData.length > 0 ? (
//               filteredData.map((record, index) => (
//                 <tr key={index} style={styles.tableRow}>
//                   <td style={styles.tableCell}>{record.empName}</td>
//                   <td style={styles.tableCell}>
//                     {editing === index ? (
//                       <input
//                         type="time"
//                         value={editData.checkInStr}
//                         onChange={(e) => setEditData({...editData, checkInStr: e.target.value})}
//                         style={styles.timeInput}
//                       />
//                     ) : (
//                       <div style={styles.timeCell}>
//                         <div>{record.checkInStr || "-"}</div>
//                         {record.checkInEdited && <div style={styles.editedLabel}>Edited</div>}
//                       </div>
//                     )}
//                   </td>
//                   <td style={styles.tableCell}>
//                     {editing === index ? (
//                       <input
//                         type="time"
//                         value={editData.checkOutStr}
//                         onChange={(e) => setEditData({...editData, checkOutStr: e.target.value})}
//                         style={styles.timeInput}
//                       />
//                     ) : (
//                       <div style={styles.timeCell}>
//                         <div>{record.checkOutStr || "-"}</div>
//                         {record.checkOutEdited && <div style={styles.editedLabel}>Edited</div>}
//                       </div>
//                     )}
//                   </td>
//                   <td style={styles.tableCell}>{record.worked}</td>
//                   {isTodayDate && (
//                     <td style={styles.tableCell}>
//                       {editing === index ? (
//                         <>
//                           <button onClick={() => saveEdit(record)} style={styles.saveButton}>Save</button>
//                           <button onClick={() => setEditing(null)} style={styles.cancelButton}>Cancel</button>
//                         </>
//                       ) : (
//                         <div style={styles.actionButtons}>
//                           <button 
//                             onClick={() => {
//                               setEditing(index);
//                               setEditData({
//                                 checkInStr: record.checkInStr || '',
//                                 checkOutStr: record.checkOutStr || ''
//                               });
//                             }} 
//                             style={styles.editButton}
//                           >
//                             Edit
//                           </button>
//                           <button 
//                             onClick={() => deleteShift(record)} 
//                             style={styles.deleteButton}
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       )}
//                     </td>
//                   )}
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={isTodayDate ? 5 : 4} style={styles.noRecords}>
//                   No attendance records found for this date
//                 </td>
//               </tr>
//             )}
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
//             <div style={styles.dateTimeInput}>
//               <div style={styles.dateDisplay}>
//                 Start: {format(shiftStartDate, 'dd MMM yyyy')}
//                 <button 
//                   onClick={() => setShowStartCalendar(!showStartCalendar)} 
//                   style={styles.smallCalendarButton}
//                 >
//                   📅
//                 </button>
//               </div>
//               {showStartCalendar && (
//                 <div style={styles.calendarPopup} ref={startCalendarRef}>
//                   <Calendar 
//                     onChange={(date) => {
//                       setShiftStartDate(date);
//                       setShowStartCalendar(false);
//                     }} 
//                     value={shiftStartDate} 
//                   />
//                 </div>
//               )}
//               <input
//                 type="time"
//                 value={newData.checkInStr}
//                 onChange={(e) => setNewData({ ...newData, checkInStr: e.target.value })}
//                 style={styles.timeInput}
//                 placeholder="Start time"
//               />
//             </div>

//             <div style={styles.dateTimeInput}>
//               <div style={styles.dateDisplay}>
//                 End: {format(shiftEndDate, 'dd MMM yyyy')}
//                 <button 
//                   onClick={() => setShowEndCalendar(!showEndCalendar)} 
//                   style={styles.smallCalendarButton}
//                 >
//                   📅
//                 </button>
//               </div>
//               {showEndCalendar && (
//                 <div style={styles.calendarPopup} ref={endCalendarRef}>
//                   <Calendar 
//                     onChange={(date) => {
//                       setShiftEndDate(date);
//                       setShowEndCalendar(false);
//                     }} 
//                     value={shiftEndDate} 
//                   />
//                 </div>
//               )}
//               <input
//                 type="time"
//                 value={newData.checkOutStr}
//                 onChange={(e) => setNewData({ ...newData, checkOutStr: e.target.value })}
//                 style={styles.timeInput}
//                 placeholder="End time"
//               />
//             </div>
//           </div>

//             <div style={styles.preview}>
//               {newData.checkInStr && (
//                 <div>Start: {formatDateTimeDisplay(shiftStartDate, newData.checkInStr)}</div>
//               )}
//               {newData.checkOutStr && (
//                 <div>End: {formatDateTimeDisplay(shiftEndDate, newData.checkOutStr)}</div>
//               )}
//             </div>

//             <button onClick={addNewAttendance} style={styles.saveButton}>Add</button>
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


import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, isToday, isBefore } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import '../../css/calendar-overrides.css';

const AdminAttendance = () => {
  // State management
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState({ empId: "", checkInStr: "", checkOutStr: "" });
  const [employees, setEmployees] = useState([]);
  const [shiftStartDate, setShiftStartDate] = useState(new Date());
  const [shiftEndDate, setShiftEndDate] = useState(new Date());
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  
  // Refs for calendar positioning
  const calendarRef = useRef(null);
  const startCalendarRef = useRef(null);
  const endCalendarRef = useRef(null);
  
  // Utility functions
  const formatFirebaseDate = (date) => format(date, 'yyyy-MM-dd');
  const isTodayDate = isToday(date);

  // Click outside handler for calendars
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target)) {
        setShowEndCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch employee list
  const fetchEmployees = async () => {
    const empSnapshot = await getDocs(collection(db, "users_01"));
    setEmployees(empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Fetch attendance data with hours calculation
  const fetchAttendanceData = async (selectedDate) => {
    setLoading(true);
    try {
      const dateStr = formatFirebaseDate(selectedDate);
      const sessionsRef = collection(db, "attendance", dateStr, "sessions");
      const q = query(sessionsRef, where("role", "==", "employee"));
      
      const sessionSnapshot = await getDocs(q);
      const logs = await Promise.all(sessionSnapshot.docs.map(async (sessionDoc) => {
        const sessionData = sessionDoc.data();
        const userSnap = await getDoc(sessionData.user);
        const empData = userSnap.exists() ? userSnap.data() : {};
        
        const checkIn = sessionData.checkIn?.toDate();
        const checkOut = sessionData.checkOut?.toDate();

        // Hours worked calculation
        let worked = "Incomplete";
        if (checkIn && checkOut) {
          const duration = checkOut - checkIn;
          const hrs = Math.floor(duration / (1000 * 60 * 60));
          const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
          worked = `${hrs}h ${mins}m`;
        }

        return {
          empName: empData.name || "Unknown",
          checkInStr: checkIn ? format(checkIn, 'HH:mm') : "",
          checkOutStr: checkOut ? format(checkOut, 'HH:mm') : "",
          worked,
          empId: sessionData.user.id,
          sessionId: sessionDoc.id,
          checkInTime: checkIn?.getTime() || 0,
          originalCheckIn: checkIn,
          originalCheckOut: checkOut,
          editedBy: sessionData.editedBy,
          editedAt: sessionData.editedAt?.toDate(),
          checkInEdited: sessionData.checkInEdited || false,
          checkOutEdited: sessionData.checkOutEdited || false
        };
      }));

      setAttendanceData(logs.sort((a, b) => b.checkInTime - a.checkInTime));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Edit save handler
  const saveEdit = async (record) => {
    try {
      const dateStr = formatFirebaseDate(date);
      const sessionRef = doc(db, "attendance", dateStr, "sessions", record.sessionId);

      const [checkInHour, checkInMinute] = editData.checkInStr.split(':').map(Number);
      const [checkOutHour, checkOutMinute] = editData.checkOutStr.split(':').map(Number);
  
      const baseDate = record.originalCheckIn || new Date();
      const newCheckIn = new Date(baseDate);
      newCheckIn.setHours(checkInHour, checkInMinute);
      const newCheckOut = new Date(baseDate);
      newCheckOut.setHours(checkOutHour, checkOutMinute);

      if (isBefore(newCheckOut, newCheckIn)) {
        alert("End time cannot be before start time!");
        return;
      }

      await updateDoc(sessionRef, {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        editedBy: "Admin",
        editedAt: serverTimestamp(),
        checkInEdited: true,
        checkOutEdited: true,
        source: "admin"
      });

      setEditing(null);
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  // Delete shift handler
  const deleteShift = async (record) => {
    if (!window.confirm(`Delete shift for ${record.empName}?`)) return;
    
    try {
      const dateStr = formatFirebaseDate(date);
      const sessionRef = doc(db, "attendance", dateStr, "sessions", record.sessionId);
      await deleteDoc(sessionRef);
      fetchAttendanceData(date);
    } catch (error) {
      console.error("Error deleting shift:", error);
    }
  };

  // Add new attendance handler
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

      if (isBefore(checkOutDate, checkInDate)) {
        alert("End time cannot be before start time!");
        return;
      }

      const dateStr = formatFirebaseDate(shiftStartDate);
      const sessionsRef = collection(db, "attendance", dateStr, "sessions");
      
      await addDoc(sessionsRef, {
        user: doc(db, "users_01", newData.empId),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        role: "employee",
        editedBy: "Admin",
        editedAt: serverTimestamp(),
        source: "admin",
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

  // Initial data load
  useEffect(() => {
    fetchEmployees();
    fetchAttendanceData(date);
  }, [date]);

  // Date/time formatting helpers
  const startTime = new Date(date);
  startTime.setHours(1, 0, 0, 0);
  const endTime = addDays(startTime, 1);
  const formattedDate = format(date, 'dd-MMM-yyyy');
  const startTimeStr = format(startTime, 'dd MMM yyyy hh:mm a');
  const endTimeStr = format(endTime, 'dd MMM yyyy hh:mm a');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Attendance Management</h1>
        <button 
          style={styles.calendarButton}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          {showCalendar ? "Hide Calendar" : "Select Date"}
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
              {isTodayDate && <th style={styles.tableHeader}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {attendanceData.filter(record => {
              const recordDate = new Date(record.checkInTime);
              return recordDate >= startTime && recordDate < endTime;
            }).map((record, index) => (
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
            ))}
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
                <div style={styles.dateDisplay}>
                  Start: {format(shiftStartDate, 'dd MMM yyyy')}
                  <button 
                    onClick={() => setShowStartCalendar(!showStartCalendar)} 
                    style={styles.smallCalendarButton}
                  >
                    📅
                  </button>
                </div>
                {showStartCalendar && (
                  <div style={styles.calendarPopup} ref={startCalendarRef}>
                    <Calendar 
                      onChange={(date) => {
                        setShiftStartDate(date);
                        setShowStartCalendar(false);
                      }} 
                      value={shiftStartDate} 
                    />
                  </div>
                )}
                <input
                  type="time"
                  value={newData.checkInStr}
                  onChange={(e) => setNewData({ ...newData, checkInStr: e.target.value })}
                  style={styles.timeInput}
                  placeholder="Start time"
                />
              </div>

              <div style={styles.dateTimeInput}>
                <div style={styles.dateDisplay}>
                  End: {format(shiftEndDate, 'dd MMM yyyy')}
                  <button 
                    onClick={() => setShowEndCalendar(!showEndCalendar)} 
                    style={styles.smallCalendarButton}
                  >
                    📅
                  </button>
                </div>
                {showEndCalendar && (
                  <div style={styles.calendarPopup} ref={endCalendarRef}>
                    <Calendar 
                      onChange={(date) => {
                        setShiftEndDate(date);
                        setShowEndCalendar(false);
                      }} 
                      value={shiftEndDate} 
                    />
                  </div>
                )}
                <input
                  type="time"
                  value={newData.checkOutStr}
                  onChange={(e) => setNewData({ ...newData, checkOutStr: e.target.value })}
                  style={styles.timeInput}
                  placeholder="End time"
                />
              </div>
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
    border: '1px solid black',
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
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '8px 12px',
    fontSize: '14px',
  },
  calendarPopup: {
    position: 'absolute',
    top: '60px',
    right: '20px',
    zIndex: 100,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    color: '#333', // Changed from 'black' to match the dark text
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
  smallCalendarButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: 0,
  },
  preview: {
    margin: '10px 0',
    fontSize: '14px',
    color: '#555',
  },
};

export default AdminAttendance;
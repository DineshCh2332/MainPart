// const admin = require('firebase-admin');
// const serviceAccount = require('./bhookiecore-firebase-adminsdk-fbsvc-633a017700.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// const db = admin.firestore();

// // Random ID generator functions
// function generateRandomId(length) {
//   return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1)).toString();
// }

// function generateRandomLetters(length) {
//   const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
//   return Array.from({length}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
// }

// async function addDummyUsers() {
//   // Employees Data (5 employees)
//   const employees = Array.from({length: 5}, (_, i) => ({
//     userId: db.collection('users_01').doc().id,
//     userData: {
//       address: `Employee Address ${i+1}, City`,
//       bank_details: {
//         account_number: generateRandomId(12),
//         bank_name: "Employee Bank",
//         branch_name: "Main Branch",
//         ifsc_code: `${generateRandomLetters(4)}${generateRandomId(5)}`
//       },
//       customer_id: "",
//       dob: `19${80 + i}-0${i + 1}-0${i + 1}`,
//       document_number: `DOC${generateRandomId(8)}`,
//       email: `employee${i + 1}@company.com`,
//       employeeID: generateRandomId(5),
//       member_since: admin.firestore.Timestamp.now(),
//       name: `Employee ${i + 1}`,
//       phone: `9${generateRandomId(9)}`, // Random 10-digit number starting with 9
//       role: "employee",
//       countryCode: "+91"
//     }
//   }));

//   // Team Leader Data
//   const teamLeader = {
//     userId: db.collection('users_01').doc().id,
//     userData: {
//       address: "Team Leader Address, City",
//       bank_details: {
//         account_number: generateRandomId(12),
//         bank_name: "Team Leader Bank",
//         branch_name: "Operations Branch",
//         ifsc_code: `${generateRandomLetters(4)}${generateRandomId(5)}`
//       },
//       customer_id: "",
//       dob: "1985-05-15",
//       document_number: `DOC${generateRandomId(8)}`,
//       email: "teamleader@company.com",
//       employeeID: generateRandomId(5),
//       member_since: admin.firestore.Timestamp.now(),
//       name: "Team Leader 1",
//       phone: `9${generateRandomId(9)}`,
//       role: "teamleader",
//       countryCode: "+91"
//     }
//   };

//   // Manager Data
//   const manager = {
//     userId: db.collection('users_01').doc().id,
//     userData: {
//       address: "Manager Address, City",
//       bank_details: {
//         account_number: generateRandomId(12),
//         bank_name: "Manager Bank",
//         branch_name: "Corporate Branch",
//         ifsc_code: `${generateRandomLetters(4)}${generateRandomId(5)}`
//       },
//       customer_id: "",
//       dob: "1980-01-01",
//       document_number: `DOC${generateRandomId(8)}`,
//       email: "manager@company.com",
//       employeeID: generateRandomId(5),
//       member_since: admin.firestore.Timestamp.now(),
//       name: "Manager 1",
//       phone: `9${generateRandomId(9)}`,
//       role: "manager",
//       countryCode: "+91"
//     }
//   };

//   // Admin Data
//   const adminUser = {
//     userId: db.collection('users_01').doc().id,
//     userData: {
//       address: "Admin Address, City",
//       bank_details: {
//         account_number: generateRandomId(12),
//         bank_name: "Admin Bank",
//         branch_name: "Head Office",
//         ifsc_code: `${generateRandomLetters(4)}${generateRandomId(5)}`
//       },
//       customer_id: "",
//       dob: "1985-01-01",
//       document_number: `DOC${generateRandomId(8)}`,
//       email: "admin@company.com",
//       employeeID: generateRandomId(5),
//       member_since: admin.firestore.Timestamp.now(),
//       name: "Admin 1",
//       phone: `9${generateRandomId(9)}`,
//       role: "admin",
//       countryCode: "+91"
//     }
//   };

//   // Customers Data (5 customers)
//   const customers = Array.from({length: 5}, (_, i) => ({
//     userId: db.collection('users_01').doc().id,
//     userData: {
//       address: `Customer Address ${i+1}, City`,
//       bank_details: {
//         account_number: generateRandomId(12),
//         bank_name: "Customer Bank",
//         branch_name: "Local Branch",
//         ifsc_code: `${generateRandomLetters(4)}${generateRandomId(5)}`
//       },
//       customer_id: generateRandomId(9),
//       dob: `19${90 + i}-0${i + 1}-0${i + 1}`,
//       document_number: `DOC${generateRandomId(8)}`,
//       email: `customer${i + 1}@mail.com`,
//       employeeID: "",
//       member_since: admin.firestore.Timestamp.now(),
//       name: `Customer ${i + 1}`,
//       phone: `9${generateRandomId(9)}`,
//       role: "customer",
//       countryCode: "+91"
//     }
//   }));

//   // Add all users to Firestore
//   const batch = db.batch();
  
//   [...employees, teamLeader, manager, adminUser, ...customers].forEach(user => {
//     const userRef = db.collection('users_01').doc(user.userId);
//     batch.set(userRef, user.userData);
//   });

//   await batch.commit();
//   console.log('All dummy users with random IDs added successfully!');
// }

// addDummyUsers().catch(console.error);




import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase/config';

const MemberAttendance = () => {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
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
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const fetchEmployeeAttendance = async (employeeId) => {
    setLoading(true);
    try {
      // First get employee details from users_01
      const empQuery = query(collection(db, "users_01"), where("employeeID", "==", employeeId));
      const empQuerySnapshot = await getDocs(empQuery);
      
      if (empQuerySnapshot.empty) {
        alert("Employee not found");
        return;
      }
  
      const empDoc = empQuerySnapshot.docs[0];
      setEmpName(empDoc.data().name || employeeId);
      setIsAuthenticated(true);
  
      let weeklyLogs = [];
  
      // Now fetch attendance from centralized attendance collection
      for (const day of weekDays) {
        const dateStr = formatFirebaseDate(day);
        const sessionsCollection = collection(
          db, 
          "attendance", 
          dateStr, 
          "sessions"
        );
        
        // Query sessions for this employee on this date
        const sessionQuery = query(sessionsCollection, where("user", "==", doc(db, "users_01", empDoc.id)));
        const sessionSnapshot = await getDocs(sessionQuery);
        
        let dayLogs = [];
  
        sessionSnapshot.forEach((sessionDoc) => {
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
  
          dayLogs.push({
            date: day,
            dateStr: format(day, 'EEE, MMM dd'),
            checkInStr,
            checkOutStr,
            worked,
            checkInTime: checkIn?.getTime() || 0,
            source: sessionData.source || "system",
            edited: sessionData.editedAt ? true : false
          });
        });
  
        dayLogs.sort((a, b) => a.checkInTime - b.checkInTime);
        weeklyLogs = [...weeklyLogs, ...dayLogs];
      }
  
      setAttendanceData(weeklyLogs);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      alert("Error loading attendance data");
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
    setAttendanceData([]);
  };

  const formattedWeekRange = `${format(weekStart, 'EEE, MMM dd')} - ${format(weekEnd, 'EEE, MMM dd, yyyy')}`;

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmployeeAttendance(empId);
    }
  }, [date, isAuthenticated]);

  return (
    <div style={styles.container}>
      {!isAuthenticated ? (
        <div style={styles.authContainer}>
          <h2 style={styles.authTitle}>Employee Attendance Portal</h2>
          <form onSubmit={handleLogin} style={styles.authForm}>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="Enter your Employee ID"
              style={styles.authInput}
              required
            />
            <button type="submit" style={styles.authButton}>
              View My Attendance
            </button>
          </form>
        </div>
      ) : (
        <>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>My Weekly Attendance</h1>
              <div style={styles.empInfo}>
                {empName} (ID: {empId})
                
              </div>
            </div>
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
            <div style={styles.dateDisplay}>Week: {formattedWeekRange}</div>
          </div>
          
          {showCalendar && (
            <div style={styles.calendarPopup} ref={calendarRef}>
              <Calendar 
                onChange={(newDate) => {
                  setDate(newDate);
                  setShowCalendar(false);
                }} 
                value={date}
                locale="en-US"
              />
            </div>
          )}

          {loading ? (
            <div style={styles.loading}>Loading your weekly attendance data...</div>
          ) : (
            <table style={styles.attendanceTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Date</th>
                  <th style={styles.tableHeader}>Check-In</th>
                  <th style={styles.tableHeader}>Check-Out</th>
                  <th style={styles.tableHeader}>Hours Worked</th>
                  <th style={styles.tableHeader}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length > 0 ? (
                  attendanceData.map((record, index) => (
                    <tr key={index} style={styles.tableRow}>
                      <td style={styles.tableCell}>{record.dateStr}</td>
                      <td style={styles.tableCell}>
                        {record.checkInStr}
                        {record.edited && <span style={styles.editedIndicator}>*</span>}
                      </td>
                      <td style={styles.tableCell}>
                        {record.checkOutStr}
                        {record.edited && <span style={styles.editedIndicator}>*</span>}
                      </td>
                      <td style={styles.tableCell}>{record.worked}</td>
                      <td style={styles.tableCell}>
                        {record.worked === "Incomplete" ? (
                          <span style={styles.incompleteStatus}>Incomplete</span>
                        ) : (
                          <span style={styles.completeStatus}>Complete</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={styles.noRecords}>
                      No attendance records found for this week
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {attendanceData.some(record => record.edited) && (
            <div style={styles.editedNote}>* Edited entries</div>
          )}
        </>
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
  authContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  authTitle: {
    fontSize: '24px',
    marginBottom: '30px',
    color: '#333',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxWidth: '400px',
    margin: '0 auto',
  },
  authInput: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  authButton: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#0d5bba',
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333',
  },
  empInfo: {
    fontSize: '14px',
    color: '#555',
    marginTop: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: '#1a73e8',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
    padding: 0,
  },
  dateRow: {
    marginBottom: '10px',
  },
  dateDisplay: {
    fontSize: '14px',
    color: '#333',
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
    padding: '10px',
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
    position: 'relative',
  },
  editedIndicator: {
    color: '#1a73e8',
    fontSize: '12px',
    marginLeft: '4px',
    position: 'absolute',
  },
  tableRow: {
    '&:hover': {
      backgroundColor: '#f9f9f9',
    },
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
  completeStatus: {
    color: '#34a853',
    fontWeight: 'bold',
  },
  incompleteStatus: {
    color: '#ea4335',
    fontWeight: 'bold',
  },
  editedNote: {
    fontSize: '12px',
    color: '#666',
    marginTop: '10px',
    textAlign: 'right',
    fontStyle: 'italic',
  },
};

export default MemberAttendance;
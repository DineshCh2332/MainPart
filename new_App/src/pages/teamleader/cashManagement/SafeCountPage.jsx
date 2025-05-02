import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from "../../../firebase/config";
import SessionButtons from './SessionButtons';
import SafeCountTable from './SafeCountTable';
import AuthorizationForm from './SafeCountAuthorizationForm';
import "../../../css/SafeCount.css";


function SafeCountPage() {
  const sessions = ['morning', 'changeover', 'night', 'change_receive'];
  const [currentSession, setCurrentSession] = useState(null);
  const [disabledSessions, setDisabledSessions] = useState(['changeover', 'night', 'change_receive']);
  const [cashierName, setCashierName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [isAuthorized, setIsAuthorized] = useState({ cashier: false, manager: false });
  const [isReadOnly, setIsReadOnly] = useState(false);

  const denominations = useMemo(() => [
    { name: '1p', value: 0.01, bagValue: 1.00 },
    { name: '2p', value: 0.02, bagValue: 1.00 },
    { name: '5p', value: 0.05, bagValue: 5.00 },
    { name: '10p', value: 0.10, bagValue: 5.00 },
    { name: '20p', value: 0.20, bagValue: 10.00 },
    { name: '50p', value: 0.50, bagValue: 10.00 },
    { name: '£1', value: 1.00, bagValue: 20.00 },
    { name: '£2', value: 2.00, bagValue: 50.00 },
    { name: '£5', value: 5.00, bagValue: 500.00 },
    { name: '£10', value: 10.00, bagValue: 1000.00 },
    { name: '£20', value: 20.00, bagValue: 2000.00 },
    { name: '£50', value: 50.00, bagValue: 5000.00 },
  ], []);

  const [values, setValues] = useState(denominations.map(() => ({ bags: 0, loose: 0, value: 0 })));
  const [actualAmount, setActualAmount] = useState(0);
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [variance, setVariance] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, "safeCounts", today);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const savedData = docSnap.data();
        let updatedDisabledSessions = [...sessions];

        // Enable buttons for sessions with data
        sessions.forEach(session => {
          if (savedData[session]) {
            updatedDisabledSessions = updatedDisabledSessions.filter(s => s !== session);
          }
        });

        setDisabledSessions(updatedDisabledSessions);

        if (currentSession) {
          const sessionData = savedData[currentSession];
          if (sessionData) {
            setValues(sessionData.values || denominations.map(() => ({ bags: 0, loose: 0, value: 0 })));
            setActualAmount(sessionData.actualAmount || 0);
            setExpectedAmount(sessionData.expectedAmount || 0);
            setVariance(sessionData.variance || 0);
            setCashierName(sessionData.cashier || '');
            setManagerName(sessionData.manager || '');
            setIsAuthorized({ cashier: true, manager: true });
            setIsReadOnly(true);
          } else {
            setValues(denominations.map(() => ({ bags: 0, loose: 0, value: 0 })));
            setActualAmount(0);
            setExpectedAmount(0);
            setVariance(0);
            setCashierName('');
            setManagerName('');
            setIsAuthorized({ cashier: false, manager: false });
            setIsReadOnly(false);
          }
        }
      } else {
        setDisabledSessions(sessions.filter(s => s !== 'morning'));
      }
    };

    fetchData();
  }, [currentSession, denominations, today]);

  const updateValues = (index, type, newValue) => {
    const updatedValues = [...values];
    updatedValues[index][type] = parseFloat(newValue) || 0;
    updatedValues[index].value = (updatedValues[index].bags * denominations[index].bagValue) + (updatedValues[index].loose * denominations[index].value);
    setValues(updatedValues);

    const total = updatedValues.reduce((sum, row) => sum + row.value, 0);
    setExpectedAmount(total);
    setVariance(actualAmount - total);
  };

  const handleActualChange = e => {
    const newActual = parseFloat(e.target.value) || 0;
    setActualAmount(newActual);
    setVariance(newActual - expectedAmount);
  };

  const handleSave = async () => {
    if (!isAuthorized.cashier || !isAuthorized.manager) {
      alert("Both Cashier and Manager must authorize before saving.");
      return;
    }
  
    const data = {
      expectedAmount, actualAmount, variance,
      cashier: cashierName, manager: managerName,
      values: values,
    };
  
    const docRef = doc(db, "safeCounts", today);
    await setDoc(docRef, { [currentSession]: data }, { merge: true });
    alert(`Data for ${currentSession} saved!`);
  
    const index = sessions.indexOf(currentSession);
    const nextSessions = [...disabledSessions];
  
    // Remove this session from disabled list if present
    if (nextSessions.includes(currentSession)) {
      nextSessions.splice(nextSessions.indexOf(currentSession), 1);
    }
  
    // Enable next session (if any)
    if (index !== -1 && index + 1 < sessions.length) {
      const nextSession = sessions[index + 1];
      if (nextSessions.includes(nextSession)) {
        nextSessions.splice(nextSessions.indexOf(nextSession), 1);
      }
    }
  
    setDisabledSessions(nextSessions);
    setCurrentSession(null);
  };
  

  const handleSessionSelect = session => {
    setCurrentSession(session);
  };

  return (
    <div className="safe-count-page">
    <div className="container">
      <h2>Safe Count </h2>
      <SessionButtons
        sessions={sessions}
        currentSession={currentSession}
        onSelect={handleSessionSelect}
        disabledSessions={disabledSessions}
      />
      {currentSession && (
        <>
          <SafeCountTable
            denominations={denominations}
            values={values}
            onChange={updateValues}
            actualAmount={actualAmount}
            onActualChange={handleActualChange}
            expectedAmount={expectedAmount}
            variance={variance}
            readOnly={isReadOnly}
          />
          <AuthorizationForm
            cashierName={cashierName}
            setCashierName={setCashierName}
            managerName={managerName}
            setManagerName={setManagerName}
            isAuthorized={isAuthorized}
            setIsAuthorized={setIsAuthorized}
          />
          <button onClick={handleSave}>Save Session Data</button>
        </>
      )}
    </div>
    </div>
  );
}

export default SafeCountPage;

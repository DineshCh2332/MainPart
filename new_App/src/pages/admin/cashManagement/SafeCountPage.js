import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import SessionButtons from './SessionButtons';
import SafeCountTable from './SafeCountTable';
// import '../../../css/SafeCount.css';
import DatePicker from 'react-datepicker';
import { Repeat } from 'lucide-react';

function SafeCountPage() {
  const [currentSession, setCurrentSession] = useState(null);
  const [disabledSessions, setDisabledSessions] = useState(['changeover', 'night']);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showTransferTable, setShowTransferTable] = useState(false);
  const [authDisabled, setAuthDisabled] = useState(false);
  const [saveDisabled, setSaveDisabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [authCashierId, setAuthCashierId] = useState('');
  const [authWitnessId, setAuthWitnessId] = useState('');
  const [confirmCashier, setConfirmCashier] = useState(false);
  const [confirmManager, setConfirmManager] = useState(false);

  const currentDateStr = selectedDate.toISOString().slice(0, 10);

  const denominations = useMemo(() => [
    { name: '1p', value: 0.01, bagValue: 100.00 },
    { name: '2p', value: 0.02, bagValue: 50.00 },
    { name: '5p', value: 0.05, bagValue: 100.00 },
    { name: '10p', value: 0.1, bagValue: 50.00 },
    { name: '20p', value: 0.2, bagValue: 50.00 },
    { name: '50p', value: 0.5, bagValue: 20.00 },
    { name: '£1', value: 1.00, bagValue: 20.00 },
    { name: '£2', value: 2.00, bagValue: 20.00 },
    { name: '£5', value: 5.00, bagValue: 0.00 },
    { name: '£10', value: 10.00, bagValue: 0.00 },
    { name: '£20', value: 20.00, bagValue: 0.00 },
    { name: '£50', value: 50.00, bagValue: 0.00 },
  ], []);

  const [values, setValues] = useState(denominations.map(() => ({ bags: 0, loose: 0, value: 0 })));
  const [actualAmount, setActualAmount] = useState(0);
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [variance, setVariance] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  const [savedSessions, setSavedSessions] = useState({
    morning: false,
    changeover: false,
    night: false,
  });

  const [transferValues, setTransferValues] = useState([
    { name: '£5', loose: 0, value: 0 },
    { name: '£10', loose: 0, value: 0 },
    { name: '£20', loose: 0, value: 0 },
    { name: '£50', loose: 0, value: 0 },
  ]);

  const [transferTotal, setTransferTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'safeCounts', currentDateStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const savedData = docSnap.data();
        setSavedSessions({
          morning: !!savedData.morning,
          changeover: !!savedData.changeover,
          night: !!savedData.night,
        });
      }
    };
    fetchData();
  }, [currentDateStr]);

  useEffect(() => {
    let newDisabledSessions = ['changeover', 'night'];
    if (savedSessions.morning) newDisabledSessions = newDisabledSessions.filter(s => s !== 'changeover');
    if (savedSessions.changeover) newDisabledSessions = newDisabledSessions.filter(s => s !== 'night');
    setDisabledSessions(newDisabledSessions);
  }, [savedSessions]);

  const handleSave = async () => {
    if (!confirmCashier || !confirmManager) {
      alert('Both cashier and manager must confirm.');
      return;
    }

    const cashierQuery = query(
      collection(db,"users_01"),
      where("employeeID", "==", authCashierId.trim()),
      
      // should log 'string'

    );
    console.log(typeof authCashierId.trim())
    const cashierSnap = await getDocs(cashierQuery);
    if (cashierSnap.empty) {
      alert('Invalid Employee ID for cashier.');
      return;
    }

    const managerQuery = query(
      collection(db, 'users_01'),
      where("employeeID", "==", authWitnessId.trim()),
      where("role", "in", ["manager", "teamleader"])
    );
    const managerSnap = await getDocs(managerQuery);
    if (managerSnap.empty) {
      alert('Invalid witness ID or not a manager/team leader.');
      return;
    }

    if (savedSessions[currentSession]) {
      alert(`${currentSession} session has already been saved.`);
      return;
    }

    const data = {
      expectedAmount,
      actualAmount,
      variance,
      values,
      cashier:authCashierId,
      manager:authWitnessId,
    };
    const docRef = doc(db, 'safeCounts', currentDateStr);
    await setDoc(docRef, { [currentSession]: data }, { merge: true });
    alert(`Data for ${currentSession} saved!`);

    setSavedSessions(prev => ({ ...prev, [currentSession]: true }));
    setValues(denominations.map(() => ({ bags: 0, loose: 0, value: 0 })));
    setActualAmount(0);
    setExpectedAmount(0);
    setVariance(0);
    setCurrentSession(null);
    setAuthCashierId('');
    setAuthWitnessId('');
    setConfirmCashier(false);
    setConfirmManager(false);
    setAuthDisabled(true);
    setSaveDisabled(true);
  };

  const handleSessionSelect = async (session) => {
    if (showTransferTable) return;
    setCurrentSession(session);

    const docRef = doc(db, 'safeCounts', currentDateStr);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data()[session]) {
      const savedData = docSnap.data()[session];
      setValues(savedData.values);
      setActualAmount(savedData.actualAmount);
      setExpectedAmount(savedData.expectedAmount);
      setVariance(savedData.variance);
      setIsReadOnly(true);
      setAuthDisabled(true);
      setSaveDisabled(true);
    } else {
      setValues(denominations.map(() => ({ bags: 0, loose: 0, value: 0 })));
      setIsReadOnly(false);
      await calculateExpectedAmount(session);
      setActualAmount(0);
      setVariance(0);

      setAuthCashierId('');
      setAuthWitnessId('');
      setConfirmCashier(false);
      setConfirmManager(false);
      
      setAuthDisabled(false);
      setSaveDisabled(false);
    }
  };

  const handleTransferFloats = () => {
    const transferData = denominations
      .map((d, index) => ({ name: d.name, loose: values[index].loose, value: values[index].loose * d.value }))
      .filter(d => ['£5', '£10', '£20', '£50'].includes(d.name));

    setTransferValues(transferData);
    const total = transferData.reduce((sum, d) => sum + d.value, 0);
    setTransferTotal(total);
    setShowTransferTable(true);
  };

  const calculateExpectedAmount = async (session) => {
    const todayRef = doc(db, 'safeCounts', today);
    const todaySnap = await getDoc(todayRef);
    const todayData = todaySnap.exists() ? todaySnap.data() : {};

    const transferTotal = todayData.TransferFloats ? todayData.TransferFloats.total : 0;
    const changeReceive = todayData.change_receive ? todayData.change_receive.expectedAmount : 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yesterdayRef = doc(db, 'safeCounts', yesterdayStr);
    const yesterdaySnap = await getDoc(yesterdayRef);
    const yesterdayNightExpected = (yesterdaySnap.exists() && yesterdaySnap.data().night)
      ? yesterdaySnap.data().night.expectedAmount
      : 0;

    let expected = 0;

    if (session === 'morning') {
      expected = yesterdayNightExpected + changeReceive + transferTotal;
    } else if (session === 'changeover') {
      const morningExpected = todayData.morning ? todayData.morning.expectedAmount : 0;
      expected = morningExpected + changeReceive + transferTotal;
    } else if (session === 'night') {
      const changeoverExpected = todayData.changeover ? todayData.changeover.expectedAmount : 0;
      expected = changeoverExpected + changeReceive + transferTotal;
    }

    setExpectedAmount(expected);
  };

  const handleSaveTransferFloats = async () => {
    const docRef = doc(db, 'safeCounts', currentDateStr);
    await setDoc(docRef, {
      TransferFloats: {
        values: transferValues,
        total: transferTotal,
        cashier:authCashierId,
        manager:authWitnessId
      }
    }, { merge: true });

    alert('Transfer Floats saved!');
    setShowTransferTable(false);
  };

  const fetchSessionsForDate = async (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const docRef = doc(db, 'safeCounts', dateStr);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const savedData = docSnap.data();
      setSavedSessions({
        morning: !!savedData.morning,
        changeover: !!savedData.changeover,
        night: !!savedData.night,
      });

      if (dateStr !== today) {
        setIsReadOnly(true);
        setAuthDisabled(true);
        setSaveDisabled(true);
      } else {
        setIsReadOnly(false);
        setAuthDisabled(false);
        setSaveDisabled(false);
      }

    } else {
      setSavedSessions({ morning: false, changeover: false, night: false });
      setIsReadOnly(dateStr !== today);
      setAuthDisabled(dateStr !== today);
      setSaveDisabled(dateStr !== today);
    }
  };

  function SessionButtons({ sessions, currentSession, onSelect, disabledSessions, onTransferFloats }) {
    return (
      <div className="flex flex-wrap gap-4 mb-6">
        {sessions.map((session) => (
          <button
            key={session}
            onClick={() => onSelect(session)}
            disabled={disabledSessions.includes(session)}
            className={`px-5 py-3 rounded-lg font-medium text-sm sm:text-base transition-colors
              ${
                currentSession === session 
                  ? 'bg-blue-800 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }
              ${
                disabledSessions.includes(session)
                  ? 'disabled:bg-gray-300 disabled:cursor-not-allowed'
                  : ''
              }`}
          >
            {session.replace(/_/g, ' ').toUpperCase()}
          </button>
        ))}
        <button
          onClick={onTransferFloats}
          className="px-5 py-3 bg-purple-600 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-purple-700 transition-colors"
        >
          TRANSFER FLOATS
        </button>
      </div>
    );
  }

//   return (
//     <div className="container">
//       <h2>Safe Count</h2>
      

//       <SessionButtons
//         sessions={['morning', 'changeover', 'night', 'change_receive']}
//         currentSession={currentSession}
//         onSelect={handleSessionSelect}
//         disabledSessions={disabledSessions}
//         onTransferFloats={handleTransferFloats}
//       />

//       {currentSession && !showTransferTable && (
//         <>
//           <SafeCountTable
//             denominations={denominations}
//             values={values}
//             onChange={(index, type, value) => {
//               const updatedValues = [...values];
//               updatedValues[index][type] = parseFloat(value) || 0;
//               updatedValues[index].value = (updatedValues[index].bags * denominations[index].bagValue) + (updatedValues[index].loose * denominations[index].value);
//               setValues(updatedValues);
//               const total = updatedValues.reduce((sum, row) => sum + row.value, 0);
//               setActualAmount(total);
//               setVariance(total - expectedAmount);
//             }}
//             actualAmount={actualAmount}
//             onActualChange={e => {
//               const actual = parseFloat(e.target.value) || 0;
//               setActualAmount(actual);
//               setVariance(actual - expectedAmount);
//             }}
//             expectedAmount={expectedAmount}
//             variance={variance}
//             readOnly={isReadOnly}
//           />

//           <div className="space-y-4">
//             <div className="flex items-center space-x-2">

//             <label className="w-40">Enter Cashier ID:</label>
//             <input
//             value={authCashierId}
//             onChange={(e) => setAuthCashierId(e.target.value)}
//             disabled={authDisabled} 
//             className="border p-1 rounded w-40"/>

//            <label className="flex items-center space-x-1">
//             <input 
//             type="checkbox"
//             checked={confirmCashier} 
//             onChange={(e) => setConfirmCashier(e.target.checked)}
//             disabled={authDisabled} />
//             <span> Confirm</span>
//             </label>
//           </div>

//           <div className="flex items-center space-x-2">
//             <label className="w-40">Enter Witness ID:</label>
//             <input 
           
//             value={authWitnessId} 
//             onChange={(e) => setAuthWitnessId(e.target.value)}
//             className="border p-1 rounded w-40"
//             disabled={authDisabled} />
            
//              <label className="flex items-center space-x-1">
//             <input
//              type="checkbox" 
//              checked={confirmManager} 
//              onChange={(e) => setConfirmManager(e.target.checked)} 
//              disabled={authDisabled} /> 
//              <span>Confirm</span>
//              </label>
//           </div>

//           <button onClick={handleSave} disabled={saveDisabled}>Save Session</button>
//           </div>
//         </>
        
//       )}

//       {showTransferTable && (
//         <>
//           <h3>Transfer Floats</h3>
//           <table>
//             <thead>
//               <tr>
//                 <th>Denomination</th>
//                 <th>Loose</th>
//                 <th>Value</th>
//               </tr>
//             </thead>
//             <tbody>
//               {transferValues.map((row, idx) => (
//                 <tr key={idx}>
//                   <td>{row.name}</td>
//                   <td>
//                     <input
//                       type="number"
//                       value={row.loose}
//                       onChange={(e) => {
//                         const loose = parseFloat(e.target.value) || 0;
//                         const updated = [...transferValues];
//                         updated[idx].loose = loose;
//                         updated[idx].value = loose * denominations.find(d => d.name === row.name).value;
//                         setTransferValues(updated);
//                         const total = updated.reduce((sum, d) => sum + d.value, 0);
//                         setTransferTotal(total);
//                       }}
//                     />
//                   </td>
//                   <td>£{row.value.toFixed(2)}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           <p>Total: £{transferTotal.toFixed(2)}</p>

//           <button onClick={handleSaveTransferFloats}>Save Transfer Floats</button>
//         </>
//       )}
//     </div>
//   );
// }
return (
  <div className="container mx-auto p-6 max-w-5xl bg-white rounded-2xl shadow-lg mt-10 mb-10">
  <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-10">Safe Count</h2>

  <SessionButtons
    sessions={['morning', 'changeover', 'night', 'change_receive']}
    currentSession={currentSession}
    onSelect={handleSessionSelect}
    disabledSessions={disabledSessions}
    onTransferFloats={handleTransferFloats}
  />

  {currentSession && !showTransferTable && (
    <div className="mt-10 space-y-8">
      <SafeCountTable
        denominations={denominations}
        values={values}
        onChange={(index, type, value) => {
          const updatedValues = [...values];
          updatedValues[index][type] = parseFloat(value) || 0;
          updatedValues[index].value =
            (updatedValues[index].bags * denominations[index].bagValue) +
            (updatedValues[index].loose * denominations[index].value);
          setValues(updatedValues);
          const total = updatedValues.reduce((sum, row) => sum + row.value, 0);
          setActualAmount(total);
          setVariance(total - expectedAmount);
        }}
        actualAmount={actualAmount}
        onActualChange={e => {
          const actual = parseFloat(e.target.value) || 0;
          setActualAmount(actual);
          setVariance(actual - expectedAmount);
        }}
        expectedAmount={expectedAmount}
        variance={variance}
        readOnly={isReadOnly}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Cashier ID</span>
            <input
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500"
              value={authCashierId}
              onChange={(e) => setAuthCashierId(e.target.value)}
              disabled={authDisabled}
            />
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="h-5 w-5 text-gray-600 rounded border-gray-300 focus:ring-gray-500"
              checked={confirmCashier}
              onChange={(e) => setConfirmCashier(e.target.checked)}
              disabled={authDisabled}
            />
            <span className="text-sm text-gray-700">Confirm Cashier</span>
          </label>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Witness ID</span>
            <input
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500"
              value={authWitnessId}
              onChange={(e) => setAuthWitnessId(e.target.value)}
              disabled={authDisabled}
            />
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="h-5 w-5 text-gray-600 rounded border-gray-300 focus:ring-gray-500"
              checked={confirmManager}
              onChange={(e) => setConfirmManager(e.target.checked)}
              disabled={authDisabled}
            />
            <span className="text-sm text-gray-700">Confirm Manager</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className={`py-2 px-6 rounded-md font-semibold text-white text-base transition-all
            ${saveDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800 shadow-sm'}`}
          onClick={handleSave}
          disabled={saveDisabled}
        >
          Save Session
        </button>
      </div>
    </div>
  )}

  {showTransferTable && (
    <div className="mt-10 space-y-6">
      <h3 className="text-2xl font-bold text-gray-800">Transfer Floats</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Denomination</th>
              <th className="px-6 py-3 text-center text-sm font-semibold tracking-wide">Loose</th>
              <th className="px-6 py-3 text-right text-sm font-semibold tracking-wide">Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {transferValues.map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 text-sm text-gray-800">{row.name}</td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="number"
                    className="w-24 text-center px-3 py-1 border border-gray-300 rounded-md focus:ring-gray-400 focus:border-gray-400"
                    value={row.loose}
                    onChange={(e) => {
                      const loose = parseFloat(e.target.value) || 0;
                      const updated = [...transferValues];
                      updated[idx].loose = loose;
                      updated[idx].value = loose * denominations.find(d => d.name === row.name).value;
                      setTransferValues(updated);
                      const total = updated.reduce((sum, d) => sum + d.value, 0);
                      setTransferTotal(total);
                    }}
                  />
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-800">£{row.value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <span className="text-lg font-semibold text-gray-700">Total:</span>
        <span className="text-2xl font-bold text-gray-800">£{transferTotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-end">
        <button
          className="py-2 px-6 bg-gray-700 text-white rounded-md font-semibold text-base hover:bg-gray-800 shadow-sm transition-all"
          onClick={handleSaveTransferFloats}
        >
          Save Transfer Floats
        </button>
      </div>
    </div>
  )}
</div>

);


}
export default SafeCountPage;

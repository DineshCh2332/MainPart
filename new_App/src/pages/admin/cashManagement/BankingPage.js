import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, setDoc, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import BankingTable from './BankingTable';

import '../../../css/Banking.css';

function BankingPage() {
  
  const [isAuthorized, setIsAuthorized] = useState({ witness: false, shiftRunner: false });
  const [actualAmount, setActualAmount] = useState(0);
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [variance, setVariance] = useState(0);
  const [varianceReason, setVarianceReason] = useState('');
  const [showVarianceReason, setShowVarianceReason] = useState(false);
  const [authCashierId, setAuthCashierId] = useState('');
  const [authWitnessId, setAuthWitnessId] = useState('');
  const [confirmCashier, setConfirmCashier] = useState(false);
  const [confirmManager, setConfirmManager] = useState(false);
  const [authDisabled, setAuthDisabled] = useState(false);

  const denominations = useMemo(() => [
    { name: '£5', value: 5.00 },
    { name: '£10', value: 10.00 },
    { name: '£20', value: 20.00 },
    { name: '£50', value: 50.00 },
  ], []);

  const defaultValues = denominations.map(denom => ({
    denomination: denom.name,
    loose: 0,
    value: 0
  }));

  const [values, setValues] = useState(defaultValues);

  const fetchLatestExpectedAmount = useCallback(async () => {
    try {
      const q = query(collection(db, 'SafeFloats'), orderBy('timestamp', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0].data();
        const total = latestDoc.denominations.reduce((sum, item) => sum + (item.value || 0), 0);
        setExpectedAmount(total);
        setVariance(actualAmount - total);
      } else {
        setExpectedAmount(0);
        setVariance(actualAmount);
      }
    } catch (error) {
      console.error('Error fetching expected amount:', error);
    }
  }, [actualAmount]);

  useEffect(() => {
    fetchLatestExpectedAmount();
  }, [fetchLatestExpectedAmount]);

  useEffect(() => {
    if (confirmCashier && confirmManager) {
      setIsAuthorized({ witness: true, shiftRunner: true });
    } else {
      setIsAuthorized({ witness: false, shiftRunner: false });
    }
  }, [confirmCashier, confirmManager]);

  const updateValues = (index, type, newValue) => {
    const updatedValues = [...values];
    updatedValues[index][type] = parseFloat(newValue) || 0;
    updatedValues[index].value = updatedValues[index].loose * denominations[index].value;
    setValues(updatedValues);

    const totalActual = updatedValues.reduce((sum, row) => sum + row.value, 0);
    setActualAmount(totalActual);
    setVariance(totalActual - expectedAmount);
  };

  const handleSave = async () => {
    if (!confirmCashier || !confirmManager) {
      alert('Both cashier and manager must confirm.');
      return;
    }

    const cashierQuery = query(
      collection(db, 'users_01'),
      where('employeeID', '==', authCashierId.trim())
    );
    const cashierSnap = await getDocs(cashierQuery);
    if (cashierSnap.empty) {
      alert('Invalid Employee ID for cashier.');
      return;
    }

    const managerQuery = query(
      collection(db, 'users_01'),
      where('employeeID', '==', authWitnessId.trim()),
      where('role', 'in', ['manager', 'teamleader'])
    );
    const managerSnap = await getDocs(managerQuery);
    if (managerSnap.empty) {
      alert('Invalid witness ID or not a manager/Team Leader.');
      return;
    }

    if (variance !== 0) {
      if (!showVarianceReason) {
        setShowVarianceReason(true);
        return;
      }

      if (varianceReason.trim() === '') {
        alert('Please provide a reason for the variance.');
        return;
      }
    }

    const data = {
      expectedAmount,
      actualAmount,
      variance,
      varianceReason: variance !== 0 ? varianceReason : '',
      witness:authWitnessId ,
      shiftRunner:authCashierId ,
      values: values,
      timestamp: new Date().toISOString()
    };

    const docRef = doc(db, 'SafeDrop', new Date().toISOString());
    await setDoc(docRef, data);
    alert('Safe Drop data saved successfully!');

    setActualAmount(0);
    setVarianceReason('');
    setShowVarianceReason(false);
    setIsAuthorized({ witness: false, shiftRunner: false });
    setAuthCashierId('');
    setAuthWitnessId('');
    setConfirmCashier(false);
    setConfirmManager(false);
    const resetValues = denominations.map(denom => ({
      denomination: denom.name,
      loose: 0,
      value: 0
    }));
    setValues(resetValues);
    fetchLatestExpectedAmount();
  };

  return (
    <div className="banking-page">
     <div className="container">
      <div className="mb-4">
        <h2>  Safe Drop  </h2>
          
       
      <div className="mb-8"> {/* Added margin bottom for spacing */}
          <BankingTable
            denominations={denominations}
            values={values}
            onChange={updateValues}
            actualAmount={actualAmount}
            expectedAmount={expectedAmount}
            variance={variance}
            readOnly={false} // Assuming this table is editable
          />
        </div>

        
        
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Authorization</h3>
          <div className="flex flex-col space-y-4 md:flex-row md:space-x-8 md:space-y-0">
            {/* Cashier ID */}
            <div className="flex items-center space-x-2">
              <label className="w-40 text-gray-700 font-medium">Cashier ID:</label>
              <input
                value={authCashierId}
                onChange={(e) => setAuthCashierId(e.target.value)}
                disabled={authDisabled}
                className="border p-2 rounded-md w-40 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                placeholder="Enter Cashier ID"
              />
              <label className="flex items-center space-x-1 text-gray-700">
                <input
                  type="checkbox"
                  checked={confirmCashier}
                  onChange={(e) => setConfirmCashier(e.target.checked)}
                  disabled={authDisabled}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span>Confirm</span>
              </label>
            </div>
          </div>

            {/* Witness ID */}
            <div className="flex items-center space-x-2">
              <label className="w-40 text-gray-700 font-medium">Witness ID:</label>
              <input
                value={authWitnessId}
                onChange={(e) => setAuthWitnessId(e.target.value)}
                className="border p-2 rounded-md w-40 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                disabled={authDisabled}
                placeholder="Enter Witness ID"
              />
              <label className="flex items-center space-x-1 text-gray-700">
                <input
                  type="checkbox"
                  checked={confirmManager}
                  onChange={(e) => setConfirmManager(e.target.checked)}
                  disabled={authDisabled}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span>Confirm</span>
              </label>
            </div>
          </div>
        </div>

         {/* Variance Reason Input */}
        {showVarianceReason && variance !== 0 && (
          <div className="space-y-2 bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-gray-700">Reason for Variance:</label>
            <textarea
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 h-24"
              value={varianceReason}
              onChange={(e) => setVarianceReason(e.target.value)}
              placeholder="Explain the reason for the variance..."
            />
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            className={`py-2 px-8 rounded-md font-semibold text-white text-base transition-all shadow-lg
              ${(!isAuthorized.witness || !isAuthorized.shiftRunner) ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-700 '}
            `}
            onClick={handleSave}
            disabled={!isAuthorized.witness || !isAuthorized.shiftRunner}
          >
            Save
         
          </button>
        </div>
      </div>
    </div>
  );
}


export default BankingPage;

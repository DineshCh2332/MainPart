import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import BankingTable from './BankingTable';
import BankingAuthorizationForm from './BankingAuthorizationForm';
import '../../../css/Banking.css';

function BankingPage() {
  const [witnessName, setWitnessName] = useState('');
  const [shiftRunnerName, setShiftRunnerName] = useState('');
  const [isAuthorized, setIsAuthorized] = useState({ witness: false, shiftRunner: false });
  const [actualAmount, setActualAmount] = useState(0);
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [variance, setVariance] = useState(0);
  const [varianceReason, setVarianceReason] = useState('');
  const [showVarianceReason, setShowVarianceReason] = useState(false);

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

  // ✅ Fetch latest expected amount from SafeFloats
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

  // ✅ Update table values and actualAmount
  const updateValues = (index, type, newValue) => {
    const updatedValues = [...values];
    updatedValues[index][type] = parseFloat(newValue) || 0;
    updatedValues[index].value = updatedValues[index].loose * denominations[index].value;
    setValues(updatedValues);

    const totalActual = updatedValues.reduce((sum, row) => sum + row.value, 0);
    setActualAmount(totalActual);
    setVariance(totalActual - expectedAmount);
  };

  // ✅ Save SafeDrop data
  const handleSave = async () => {
    if (!isAuthorized.witness || !isAuthorized.shiftRunner) {
      alert('Both Witness and Shift Runner must authorize before saving.');
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
      witness: witnessName,
      shiftRunner: shiftRunnerName,
      values: values,
      timestamp: new Date().toISOString()
    };

    const docRef = doc(db, 'SafeDrop', new Date().toISOString());
    await setDoc(docRef, data);
    alert('Safe Drop data saved successfully!');

    // 🔄 Clear form after saving
    setActualAmount(0);
    setVarianceReason('');
    setShowVarianceReason(false);
    setIsAuthorized({ witness: false, shiftRunner: false });
    setWitnessName('');
    setShiftRunnerName('');
    const resetValues = denominations.map(denom => ({
      denomination: denom.name,
      loose: 0,
      value: 0
    }));
    setValues(resetValues);
    fetchLatestExpectedAmount(); // refresh expected
  };

  return (
    <div className="banking-page">
    <div className="container">
      <h2>Safe Drop</h2>

      <BankingTable
        denominations={denominations}
        values={values}
        onChange={updateValues}
        actualAmount={actualAmount}
        expectedAmount={expectedAmount}
        variance={variance}
      />

      <BankingAuthorizationForm
        witnessName={witnessName}
        setWitnessName={setWitnessName}
        shiftRunnerName={shiftRunnerName}
        setShiftRunnerName={setShiftRunnerName}
        isAuthorized={isAuthorized}
        setIsAuthorized={setIsAuthorized}
      />

      {showVarianceReason && variance !== 0 && (
        <div className="variance-reason">
          <label>Reason for Variance:</label>
          <textarea
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            placeholder="Explain the reason for the variance..."
          />
        </div>
      )}

      <div className="button-group">
        <button onClick={handleSave} disabled={!isAuthorized.witness || !isAuthorized.shiftRunner}>
          Save
        </button>
      </div>
    </div>
    </div>
  );
}

export default BankingPage;

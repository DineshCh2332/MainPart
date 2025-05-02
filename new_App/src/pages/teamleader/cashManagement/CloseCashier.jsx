import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import {
  collection,
  getDocs,
  setDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

// Denominations list for counting
const denominations = [
  { label: "1p", value: 0.01 },
  { label: "2p", value: 0.02 },
  { label: "5p", value: 0.05 },
  { label: "10p", value: 0.1 },
  { label: "20p", value: 0.2 },
  { label: "50p", value: 0.5 },
  { label: "£1", value: 1 },
  { label: "£2", value: 2 },
  { label: "£5", value: 5 },
  { label: "£10", value: 10 },
  { label: "£20", value: 20 },
  { label: "£50", value: 50 },
];

export default function CloseCashier() {
  const [counts, setCounts] = useState({});
  const [cashiers, setCashiers] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState("");
  const [expectedFloat, setExpectedFloat] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [reason, setReason] = useState("");
  const [auth, setAuth] = useState({ name: "", password: "" });
  const [authRequired, setAuthRequired] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [isClosed, setIsClosed] = useState(false); //  New state to track if float is closed

  // Fetch cashiers from Firestore
  useEffect(() => {
    const fetchCashiers = async () => {
      const userSnap = await getDocs(collection(db, "users"));
      setCashiers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchCashiers();
  }, []);

  // Fetch assigned float for selected cashier
  useEffect(() => {
    const fetchAssignedFloat = async () => {
      if (!selectedCashier) {
        setExpectedFloat(null);
        return;
      }

      const floatSnap = await getDocs(collection(db, "floats"));
      const assignedFloat = floatSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .find(
          (doc) =>
            doc.cashierId === selectedCashier &&
            doc.initialCount !== -1 
            );
            if (assignedFloat) {
              setExpectedFloat(Number(assignedFloat.initialCount));
              setIsClosed(assignedFloat.closed === true || assignedFloat.isOpen === false); // 👈 Add this line
            } else {
              setExpectedFloat(null);
              setIsClosed(false);
            }
          };
    fetchAssignedFloat();
  }, [selectedCashier]);

  // Handle change of count for a specific denomination
  const handleCountChange = (denomination, count) => {
    setCounts((prev) => ({ ...prev, [denomination]: Number(count) || 0 }));
  };

  // Calculate value for each denomination
  const calculateValue = (denomination) => {
    const count = counts[denomination] || 0;
    const denomValue = denominations.find((d) => d.label === denomination).value;
    return (count * denomValue).toFixed(2);
  };

  // Total value of all denominations
  const totalValue = denominations.reduce((acc, d) => {
    const count = counts[d.label] || 0;
    return acc + count * d.value;
  }, 0);

  // Variance between expected and counted total
  const variance = expectedFloat !== null ?totalValue-expectedFloat : 0;

  // Handle submit when "Continue" is clicked
  const handleSubmit = () => {
    if (!selectedCashier || expectedFloat === null) {
      alert("Please select a cashier with an assigned float");
      return;
    }

    // Check for variance and attempts
    if (Math.abs(variance) <=1) {
      setAuthRequired(true);
    } else if (attemptCount < 2) {
      setAttemptCount((prev) => prev + 1); // Correct async handling of attempts
      alert("There is a Variance. Please recheck the denominations.");
    } else {
      setAttemptCount(3);  // Lock attempts at 3
      setReason("");  // Reset reason field in case it's shown after 3rd attempt
      setShowReasonForm(true); // Show the reason form
      alert("Please provide a reason for the variance.");
    }
  };

  // Handle saving the reason after 3 failed attempts
  const handleSaveWithReason = () => {
    if (!reason) {
      alert("Please provide a reason for the variance.");
      return;
    }
    setAuthRequired(true);
  };

  // Handle authorization (password verification)
  const handleAuthorization = async () => {
    if (!auth.password) {
      alert("Please enter password");
      return;
    }
    try {
      // Check if there's a float where cashierId matches the entered password
      const floatSnap = await getDocs(collection(db, "floats"));
      const matchingFloat = floatSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .find(
          (doc) =>
            doc.cashierId === auth.password &&
            doc.cashierId === selectedCashier &&
            !doc.closed
        );

      if (!matchingFloat) {
        alert("Authorization failed: incorrect password.");
        return;
      }
      if (matchingFloat.isOpen === false) {
        alert("This float has already been closed.");
        return;
      }
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];
      const docId = `${selectedCashier}_${formattedDate}`;
      const data = {
        cashierId: selectedCashier,
        type: "cashier_close",
        date: formattedDate,
        timestamp: serverTimestamp(),
        expected: Number(expectedFloat),
        total: Number(totalValue.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        entries: denominations.map((d) => ({
          denomination: d.label,
          count: counts[d.label] || 0,
          value: Number(((counts[d.label] || 0) * d.value).toFixed(2)),
        })),
        reason: reason || null,
        authorizedBy: { id: auth.password },
      };

      // Save to floatClosures
      await setDoc(doc(db, "floatClosures", docId), data);

      // Now, store the denominations from £5 to £50 in the safeDrop collection
      const safeFloatsData = denominations
        .filter((d) => d.value >= 5) // Filter for denominations from £5 to £50
        .map((d) => ({
          denomination: d.label,
          count: counts[d.label] || 0,
          value: Number(((counts[d.label] || 0) * d.value).toFixed(2)),
          type: "safe_float", // Mark as a safe drop entry
        }));

      const safeFloatsDocId = `${selectedCashier}_${formattedDate}`;
      const safeFloatsDocRef = doc(db, "SafeFloats", safeFloatsDocId);

      await setDoc(safeFloatsDocRef, {
        denominations: safeFloatsData, // Store all denominations as an array in one document
        timestamp: serverTimestamp(),
        cashierId: selectedCashier,
      });

      //calculate total of SafeDrop denominations
      const safeFloatsTotal = safeFloatsData.reduce((sum,d)=>sum + d.value,0);

      //compute new float amoount (total counted -safeDrop Total)
      const leftOverAmount = Number((totalValue-safeFloatsTotal).toFixed(2));

      const sessionDocRef = doc(collection(db, "cashierSessions")); // or subcollection under floats
await setDoc(sessionDocRef, {
  floatId: matchingFloat.id,
  cashierId: selectedCashier,
  expected: Number(expectedFloat),
  total: Number(totalValue.toFixed(2)),
  variance: Number(variance.toFixed(2)),
  retainedAmount: leftOverAmount,
  denominations: denominations.map((d) => ({
    denomination: d.label,
    count: counts[d.label] || 0,
    value: Number(((counts[d.label] || 0) * d.value).toFixed(2)),
  })),
  reason: reason || null,
  authorizedBy: { id: auth.password },
  closedAt: serverTimestamp(),
  openedAt: matchingFloat.openedAt, // optional
});

await updateDoc(doc(db, "floats", matchingFloat.id), {
  closed: true,
  isOpen: false
});


      alert("Float closure and authorization successful.");
      setCounts({});
      setSelectedCashier("");
      setExpectedFloat(null);
      setAttemptCount(0);
      setReason("");
      setAuth({ name: "", password: "" });
      setAuthRequired(false);
      setShowReasonForm(false);
    } catch (err) {
      console.error("Authorization error:", err);
      alert("An error occurred during authorization.");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-white rounded shadow">
      <h2 className="text-2xl text-center font-bold mb-4">Close Cashier</h2>

      {/* Cashier selection */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Select Cashier:</label>
        <select
          className="border p-2 rounded w-full"
          value={selectedCashier}
          onChange={(e) => setSelectedCashier(e.target.value)}
        >
          <option value="">-- Select --</option>
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.email || c.id}
            </option>
          ))}
        </select>
      </div>

      {expectedFloat !== null && (
        <>
          <h3 className="font-bold mb-2">Count Register</h3>
          <table className="w-full border text-medium bg-gray-100">
            <thead>
              <tr className="bg-blue-500">
                <th className="border p-1">Denomination</th>
                <th className="border p-1">Loose</th>
                <th className="border p-1">Value</th>
              </tr>
            </thead>
            <tbody>
              {denominations.map((d) => (
                <tr key={d.label}>
                  <td className="border p-1">{d.label}</td>
                  <td className="border p-1">
                    <input
                      type="number"
                      className="w-full p-1 border rounded"
                      value={counts[d.label] || ""}
                      onChange={(e) =>
                        handleCountChange(d.label, e.target.value)
                      }
                      disabled={isClosed}
                    />
                  </td>
                  <td className="border p-1 text-right">
                    £{calculateValue(d.label)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan="2" className="text-right font-bold pr-2">
                  Total:
                </td>
                <td className="text-right font-bold">£{totalValue.toFixed(2)}</td>
              </tr>
              
            </tbody>
          </table>

          {/* Continue button */}
          <button
            onClick={handleSubmit}
            className={`mt-4 px-4 py-2 rounded text-white ${
              isClosed ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={isClosed}
          >
            Continue
          </button>

          {/* Reason Form Display */}
          {showReasonForm && (
            <div className="mt-6 p-4 border rounded bg-yellow-50 shadow">
              <h3 className="text-lg font-semibold mb-2">Variance Explanation Required</h3>

              <div className="mb-2">
                <label className="block text-sm font-medium">Expected Float:</label>
                <div className="text-gray-800 font-semibold">£{expectedFloat.toFixed(2)}</div>
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium">Counted Total:</label>
                <div className="text-gray-800 font-semibold">£{totalValue.toFixed(2)}</div>
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium">Variance:</label>
                <div className="text-red-600 font-semibold">£{variance.toFixed(2)}</div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium">Reason for Variance:</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
              </div>

              <button
                onClick={handleSaveWithReason}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Save Reason
              </button>
            </div>
          )}
         


          {/* Authorization form */}
          {authRequired && (
            <div className="mt-6 p-4 border rounded bg-blue-50 shadow">
              <h3 className="text-lg font-semibold mb-2">Authorization</h3>

              <div className="mb-3">
                <label className="block text-sm font-medium">Enter Cashier'Id:</label>
                <input
                  type="password"
                  value={auth.password}
                  onChange={(e) =>
                    setAuth({ ...auth, password: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
                
              </div>

              <button
                onClick={handleAuthorization}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Authorize and Close
              </button>
            </div>
          )}
           {isClosed && (
  <div className="mt-4 text-red-600 font-medium">
    This float is already closed. You cannot enter denominations.
  </div>
)}
        </>
      )}
    </div>
  );
}

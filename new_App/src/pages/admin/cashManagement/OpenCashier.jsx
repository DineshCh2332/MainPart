import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  query,
  where,
} from "firebase/firestore";

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

export default function OpenCashier() {
  const [counts, setCounts] = useState({});
  const [floatType, setFloatType] = useState("");
  const [expectedFloat, setExpectedFloat] = useState(0);
  const [retainedAmount, setRetainedAmount] = useState(0);
  const [cashiers, setCashiers] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState("");
  const [showAuthorization, setShowAuthorization] = useState(false);
  const [authCashierId, setAuthCashierId] = useState("");
  const [authWitnessId, setAuthWitnessId] = useState("");
  const [confirmCashier, setConfirmCashier] = useState(false);
  const [confirmWitness, setConfirmWitness] = useState(false);

  // ✅ Fetch cashiers from Firestore
  useEffect(() => {
    const fetchCashiers = async () => {
      const roleRef = doc(db, "roles", "cash01");
      const q = query(
        collection(db, "users_01"),
        where("roleId", "==", roleRef)
      );
      const snapshot = await getDocs(q);
      setCashiers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchCashiers();
  }, []);
  

  const handleCountChange = (denomination, count) => {
    setCounts((prev) => ({
      ...prev,
      [denomination]: Number(count),
    }));
  };

  const calculateValue = (denomination) => {
    const count = counts[denomination] || 0;
    const denomValue = denominations.find((d) => d.label === denomination).value;
    return (count * denomValue).toFixed(2);
  };

  const totalValue = denominations.reduce((acc, d) => {
    const count = counts[d.label] || 0;
    return acc + count * d.value;
  }, 0);

  const variance = totalValue - expectedFloat;

  const handleContinue = async () => {
    if (!floatType || !selectedCashier) {
      alert("Please select both float type and cashier.");
      return;
    }

    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    const floatDocId = `float${floatType}_${formattedDate}`;
    const floatRef = doc(db, "floats", floatDocId);
    const existingFloat = await getDoc(floatRef);

    if (existingFloat.exists()) {
      const floatData = existingFloat.data();
      const cashierSessionsRef = collection(
        db,
        "floats",
        floatDocId,
        "cashierSessions"
      );
      const sessionSnap = await getDocs(cashierSessionsRef);
      const activeSession = sessionSnap.docs.find((doc) => !doc.data().closedAt);

      if (activeSession) {
        alert(
          `Float ${floatType} is currently assigned.`
        );
        return;
      }

      const retained = floatData.RetainedAmount || 0;
      setExpectedFloat(retained);
      setRetainedAmount(retained);
    } else {
      setExpectedFloat(0);
      setRetainedAmount(0);
    }

    setShowAuthorization(true);
  };

  const handleSubmit = async () => {
    if (!confirmCashier || !confirmWitness) {
      alert("Both cashier and witness must confirm.");
      return;
    }
    const selectedCashierRef = doc(db, "users_01", selectedCashier);
    const selectedCashierSnap = await getDoc(selectedCashierRef);
    
    if (!selectedCashierSnap.exists()) {
      alert("Selected cashier not found.");
      return;
    }
    
    const selectedCashierData = selectedCashierSnap.data();
    const selectedCashierEmpId = selectedCashierData.employeeID?.trim();
    
    if (selectedCashierEmpId !== authCashierId.trim()) {
      alert("Cashier ID does not match the selected cashier.");
      return;
    }
    
    const manageRoleRef = doc(db, "roles", "manage01");

    const witnessQuery = query(
      collection(db, "users_01"),
      where("employeeID", "==", authWitnessId.trim()),
      where("roleId", "==", manageRoleRef)
    );
    
    const witnessSnap = await getDocs(witnessQuery);
    
    if (witnessSnap.empty) {
      alert("Invalid witness ID or not a manager.");
      return;
    }
    
  
    // Continue with float creation...
  

    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    const docId = `float${floatType}_${formattedDate}`;
    const floatRef = doc(db, "floats", docId);
    const existingFloat = await getDoc(floatRef);

    

    const data = {
      type: floatType,
      date: formattedDate,
      openedAt: serverTimestamp(),
      isOpen: true,
      cashierId: selectedCashier,
      entries: denominations.map((d) => ({
        denomination: d.label,
        count: counts[d.label] || 0,
        value: Number(((counts[d.label] || 0) * d.value).toFixed(2)),
      })),
      total: Number((totalValue + retainedAmount).toFixed(2)),
      initialCount: Number(totalValue.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      authorisedBy: {
        cashierEmployeeId: authCashierId,
        witnessEmployeeId: authWitnessId,
      },
    };
    if (existingFloat.exists() && existingFloat.data().isOpen) {
      alert(`Float ${floatType} is already assigned and still open.`);
      return;
    }

    try {
      await setDoc(floatRef, data);

      const cashierSessionsRef = collection(
        db,
        "floats",
        docId,
        "cashierSessions"
      );
      const newSessionRef = doc(
        cashierSessionsRef,
        `${selectedCashier}_${Date.now()}`
      );
      await setDoc(newSessionRef, {
        cashierId: selectedCashier,
        openedAt: serverTimestamp(),
        closedAt: null,
      });

      alert(`Float ${floatType} assigned to cashier successfully.`);

      // Reset form
      setCounts({});
      setFloatType("");
      setExpectedFloat(0);
      setSelectedCashier("");
      setShowAuthorization(false);
      setConfirmCashier(false);
      setConfirmWitness(false);
      setAuthCashierId("");
      setAuthWitnessId("");
    } catch (err) {
      console.error("Error saving float:", err);
      alert("Failed to save float.");
    }
  };

  return (
    <div className="p-4 border rounded shadow-md bg-white max-w-3xl mx-auto">
      <h2 className="text-2xl text-center font-bold mb-4">Open Cashier</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-medium mb-1">Select Float Type:</label>
          <select
            className="border p-2 rounded w-full"
            value={floatType}
            onChange={(e) => setFloatType(e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="A">Float A</option>
            <option value="B">Float B</option>
            <option value="C">Float C</option>
            <option value="D">Float D</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Select Cashier:</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
          >
            <option value="">-- Select --</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {floatType && (
        <>
          <h3 className="font-bold mb-4">Starting Float Count</h3>
          <table className="w-full border text-sm bg-gray-100">
            <thead>
              <tr className="bg-blue-600 text-white">
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
                    />
                  </td>
                  <td className="border p-1 text-right">
                    £{calculateValue(d.label)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan="2" className="font-bold text-right pr-2">
                  Total:
                </td>
                <td className="font-bold text-right">
                  £{(totalValue + retainedAmount).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {!showAuthorization && (
            <button
              onClick={handleContinue}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Continue
            </button>
          )}

          {showAuthorization && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-bold mb-2">Authorization</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-medium mb-1">
                    Cashier Employee ID:
                  </label>
                  <input
                    type="text"
                    className="border p-2 rounded w-full"
                    value={authCashierId}
                    onChange={(e) => setAuthCashierId(e.target.value)}
                  />
                  <div className="mt-2">
                    <input
                      type="checkbox"
                      checked={confirmCashier}
                      onChange={(e) => setConfirmCashier(e.target.checked)}
                    />{" "}
                    Cashier Confirm
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">
                    Witness Employee ID:
                  </label>
                  <input
                    type="text"
                    className="border p-2 rounded w-full"
                    value={authWitnessId}
                    onChange={(e) => setAuthWitnessId(e.target.value)}
                  />
                  <div className="mt-2">
                    <input
                      type="checkbox"
                      checked={confirmWitness}
                      onChange={(e) => setConfirmWitness(e.target.checked)}
                    />{" "}
                    Witness Confirm
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Submit Float
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

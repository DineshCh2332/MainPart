import React, { useEffect, useState } from "react";
import { db } from "../../../firebase/config";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  addDoc
} from "firebase/firestore";

import "../../../css/KOT.css";

const KOT = () => {
  const [kotData, setKotData] = useState([]);

  // Real-time data fetch
  useEffect(() => {
    const q = query(collection(db, "KOT"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const kots = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        kots.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to readable date
          date: data.date?.toDate().toLocaleString() || "No date"
        });
      });
      setKotData(kots);
    });

    return () => unsubscribe();
  }, []);

  // Add test data function
  const addTestKOT = async () => {
    try {
      await addDoc(collection(db, "KOT"), {
        id: `KOT-${Date.now()}`,
        amount: 100.50,
        cashPaid: 100.50,
        creditsUsed: 0,
        customerID: "test01",
        date: serverTimestamp(),
        earnedPoints: 10,
        items: [
          {
            id: "Item01",
            name: "Test Item",
            price: 50,
            quantity: 2
          }
        ]
      });
    } catch (error) {
      console.error("Error adding KOT:", error);
    }
  };

  return (
    <div className="kot-container">
      <h2>Kitchen Order Tickets</h2>
      
      <table className="kot-table">
        <thead>
          <tr>
            <th>KOT ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {kotData.length > 0 ? (
            kotData.map((kot) => (
              <tr key={kot.id}>
                <td>{kot.id}</td>
                <td>{kot.customerID}</td>
                <td>
                  {kot.items?.map(item => (
                    <div key={item.id}>
                      {item.name} (x{item.quantity})
                    </div>
                  ))}
                </td>
                <td>₹{
  (typeof kot.amount === 'number' ? kot.amount : 
   typeof kot.amount === 'string' ? parseFloat(kot.amount) : 0
  ).toFixed(2)
}</td>
                <td>{kot.date}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>
                No KOTs found. Click "Add Test KOT" to create sample data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KOT;
import React, { useEffect, useState } from "react";
import { db } from "../../../firebase/config";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
} from "firebase/firestore";

import "../../../css/KOT.css";

const KOT = () => {
  const [kotData, setKotData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const q = query(collection(db, "KOT"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const kots = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.date?.toDate();
        kots.push({
          id: doc.id,
          ...data,
          dateObj,
          date: dateObj?.toLocaleString() || "No date"
        });
      });
      setKotData(kots);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const filtered = kotData.filter(kot => {
        const kotDate = kot.dateObj?.toISOString().split("T")[0];
        return kotDate === selectedDate;
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(kotData);
    }
  }, [kotData, selectedDate]);

  return (
    <div className="kot-container">
      <h2>Kitchen Order Tickets</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Filter by Date:{" "}
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {selectedDate && (
            <button onClick={() => setSelectedDate("")}
            className="ml-4 px-3 py-1.5 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors duration-200 font-medium"
            >
              Clear Filter
              
            </button>
          )}
        </label>
      </div>

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
          {filteredData.length > 0 ? (
            filteredData.map((kot) => (
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
                No KOTs found for selected date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KOT;

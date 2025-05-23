import React, { useEffect, useState } from "react";
import { db } from "../../../firebase/config";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
} from "firebase/firestore";

const KOT = () => {
  const [kotData, setKotData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const today = new Date().toISOString().split("T")[0];
const [selectedDate, setSelectedDate] = useState(today);



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
   
  <div className="kot-container px-8 py-6 bg-gray-100 min-h-screen font-sans">
    <h2 className="text-3xl font-bold text-gray-800 mb-6">🍽️ Kitchen Order Tickets</h2>

    <div className="flex flex-wrap items-center gap-4 mb-6">
      <label className="text-gray-700 font-medium flex items-center">
        Filter by Date:
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="ml-3 px-4 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
      </label>

      {selectedDate && (
        <button
          onClick={() => setSelectedDate("")}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
        >
          Clear Filter
        </button>
      )}
    </div>

    <div className="overflow-x-auto bg-white shadow-md rounded-xl">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">KOT ID</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Items</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredData.length > 0 ? (
            filteredData.map((kot) => (
              <tr key={kot.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-800">{kot.id}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{kot.customerID || 'Walk-in'}</td>
                <td className="px-6 py-4 text-sm text-gray-700 space-y-1">
                  {kot.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="ml-2 font-medium text-gray-600">x{item.quantity}</span>
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-green-700">£{
                  (typeof kot.amount === 'number' ? kot.amount :
                  typeof kot.amount === 'string' ? parseFloat(kot.amount) : 0).toFixed(2)
                }</td>
                <td className="px-6 py-4 text-sm text-gray-600">{kot.date}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center px-6 py-6 text-gray-500">
                No KOTs found for selected date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);


  
};

export default KOT;

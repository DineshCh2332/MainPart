import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from '../../firebase/config';

const ViewDetails = () => {
  const [phone, setPhone] = useState("");
  const [runner, setRunner] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!phone) return;

    const q = query(collection(db, "users_01"), where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      setRunner(querySnapshot.docs[0].data());
      setNotFound(false);
    } else {
      setRunner(null);
      setNotFound(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Find Team Member</h2>
        <input
          type="text"
          placeholder="Enter Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border rounded-xl mb-4"
        />
        <button
          onClick={handleSearch}
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Search
        </button>

        {notFound && (
          <p className="text-red-500 mt-4 text-center">No matching team member found.</p>
        )}

        {runner && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl shadow-inner">
            <h3 className="text-lg font-bold mb-2">{runner.name || "N/A"}</h3>
            <p><strong>Email:</strong> {runner.email || "N/A"}</p>
            <p><strong>DOB:</strong> {runner.dob || "N/A"}</p>
            <p><strong>Address:</strong> {runner.address || "N/A"}</p>
            <p><strong>Number:</strong> {runner.number || "N/A"}</p>
            <p><strong>Emp ID:</strong> {runner.empid || "N/A"}</p>
            <p><strong>Cust ID:</strong> {runner.custid || "N/A"}</p>
            <p><strong>Role:</strong> {runner.role || "N/A"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDetails;

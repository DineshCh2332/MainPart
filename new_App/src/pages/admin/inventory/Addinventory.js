import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { collection, addDoc, serverTimestamp , query, where, getDocs  } from 'firebase/firestore';

const Addinventory = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemId: '',
    itemName: '',
    unitsPerInner: '',
    innerPerBox: '',
    totalStockOnHand: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const { itemId, itemName, unitsPerInner, innerPerBox, totalStockOnHand } = form;

  //  Check all fields are filled
  if (!itemId || !itemName || !unitsPerInner || !innerPerBox || !totalStockOnHand) {
    alert('All fields are required.');
    return;
  }

  //Normalize the entered itemId (lowercase, trimmed, remove leading zeros)
  const normalizedInputId = itemId.trim().toLowerCase().replace(/\s+/g, '');

  // Extract the numeric part from the end
  const match = normalizedInputId.match(/^item0*(\d+)$/);  // e.g., item07 -> 7
  if (!match) {
    alert('Invalid item ID format. Use format like "item07" or "item7".');
    return;
  }

  const inputNumeric = match[1]; // e.g., "7"

  try {
    const snapshot = await getDocs(collection(db, 'inventory'));

    let itemExists = false;

    snapshot.forEach((doc) => {
      const existingId = doc.data().itemId;
      if (!existingId) return;

      // Normalize existing item ID
      const normalizedExistingId = existingId.trim().toLowerCase().replace(/\s+/g, '');
      const existingMatch = normalizedExistingId.match(/^item0*(\d+)$/);
      if (existingMatch && existingMatch[1] === inputNumeric) {
        itemExists = true;
      }
    });

    //  Check if itemId (after normalization) already exists
    if (itemExists) {
      alert('This item ID already exists. Please try another one.');
      return;
    }

    //  Add new item to Firestore
    await addDoc(collection(db, 'inventory'), {
      itemId: normalizedInputId, // use normalized (e.g., item07 becomes item7)
      itemName: itemName.trim(),
      unitsPerInner: Number(unitsPerInner),
      innerPerBox: Number(innerPerBox),
      totalStockOnHand: Number(totalStockOnHand),
      lastUpdated: serverTimestamp(),
    });

    alert('Inventory added successfully!');
    setForm({
      itemId: '',
      itemName: '',
      unitsPerInner: '',
      innerPerBox: '',
      totalStockOnHand: '',
    });

    setTimeout(() => {
      navigate('/admin/inventory/inventoryrecords');
    }, 1500);
  } catch (err) {
    console.error('Error adding inventory:', err);
    alert('Failed to add inventory. Please try again.');
  }
};

  return (
    <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-gray-300 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center">Add New Inventory</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {['itemId', 'itemName', 'unitsPerInner', 'innerPerBox', 'totalStockOnHand'].map((field) => (
          <div key={field}>
            <label className="block font-semibold capitalize">{field}</label>
            <input
              type="text"
              name={field}
              value={form[field]}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder={`Enter ${field}`}
            />
          </div>
        ))}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold"
        >
          Add
        </button>
      </form>
    </div>
  );
};

export default Addinventory;

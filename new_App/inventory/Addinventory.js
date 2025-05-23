import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase/config';
import { collection, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';

const Addinventory = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemId: '',
    itemName: '',
    unitsPerInner: '',
    innerPerBox: '',
    boxes: '',
    inners: '',
    units: '',
  });
  const [stockOnHand, setStockOnHand] = useState(0);

  // Update stockOnHand whenever relevant fields change
  useEffect(() => {
    const boxesNum = Number(form.boxes) || 0;
    const innersNum = Number(form.inners) || 0;
    const unitsNum = Number(form.units) || 0;
    const innerPerBoxNum = Number(form.innerPerBox) || 0;
    const unitsPerInnerNum = Number(form.unitsPerInner) || 0;

    const totalStockOnHand =
      (boxesNum * innerPerBoxNum * unitsPerInnerNum) +
      (innersNum * unitsPerInnerNum) +
      unitsNum;

    setStockOnHand(totalStockOnHand);
  }, [form.boxes, form.inners, form.units, form.unitsPerInner, form.innerPerBox]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow only numeric input for specific fields
    const numericFields = ['unitsPerInner', 'innerPerBox', 'boxes', 'inners', 'units'];
    if (numericFields.includes(name) && !/^[0-9]*$/.test(value)) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { itemId, itemName, unitsPerInner, innerPerBox, boxes, inners, units } = form;

    // Check all fields are filled
    if (!itemId || !itemName || !unitsPerInner || !innerPerBox || boxes === '' || inners === '' || units === '') {
      alert('All fields are required.');
      return;
    }

    // Normalize the entered itemId (lowercase, trimmed, remove leading zeros)
    const normalizedInputId = itemId.trim().toLowerCase().replace(/\s+/g, '');
    const match = normalizedInputId.match(/^item0*(\d+)$/); // e.g., item07 -> 7
    if (!match) {
      alert('Invalid item ID format. Use format like "item07" or "item7".');
      return;
    }

    const inputNumeric = match[1]; // e.g., "7"
    const normalizedItemName = itemName.trim();
    const normalizedItemNameForCheck = itemName.trim().toLowerCase().replace(/\s+/g, '');

    try {
      // Check for duplicate itemId or itemName
      const snapshot = await getDocs(collection(db, 'inventory'));
      let itemIdExists = false;
      let itemNameExists = false;

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Check itemId
        if (data.itemId) {
          const normalizedExistingId = data.itemId.trim().toLowerCase().replace(/\s+/g, '');
          const existingMatch = normalizedExistingId.match(/^item0*(\d+)$/);
          if (existingMatch && existingMatch[1] === inputNumeric) {
            itemIdExists = true;
          }
        }
        // Check itemName (case-insensitive, no spaces)
        if (data.itemName) {
          const existingItemName = data.itemName.trim().toLowerCase().replace(/\s+/g, '');
          if (existingItemName === normalizedItemNameForCheck) {
            itemNameExists = true;
          }
        }
      });

      if (itemIdExists) {
        alert('This item ID already exists. Please try another one.');
        return;
      }
      if (itemNameExists) {
        alert('This item name (or a variation like "vada pav", "vadapav", "VadaPav") already exists. Please try another one.');
        return;
      }

      // Calculate totalStockOnHand
      const boxesNum = Number(boxes);
      const innersNum = Number(inners);
      const unitsNum = Number(units);
      const innerPerBoxNum = Number(innerPerBox);
      const unitsPerInnerNum = Number(unitsPerInner);

      const totalStockOnHand =
        boxesNum * innerPerBoxNum * unitsPerInnerNum +
        innersNum * unitsPerInnerNum +
        unitsNum;

      // Add new item to Firestore with itemId as document ID
      const itemDocRef = doc(db, 'inventory', normalizedInputId);
      await setDoc(itemDocRef, {
        itemId: normalizedInputId, // e.g., item7
        itemName: normalizedItemName,
        unitsPerInner: unitsPerInnerNum,
        innerPerBox: innerPerBoxNum,
        totalStockOnHand,
        lastUpdated: serverTimestamp(),
      });

      alert('Inventory added successfully!');
      setForm({
        itemId: '',
        itemName: '',
        unitsPerInner: '',
        innerPerBox: '',
        boxes: '',
        inners: '',
        units: '',
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
        {['itemId', 'itemName', 'unitsPerInner', 'innerPerBox', 'boxes', 'inners', 'units'].map((field) => (
          <div key={field}>
            <label className="block font-semibold capitalize">
              {field === 'inners' ? 'Inner' : field}
            </label>
            <input
              type="text"
              name={field}
              value={form[field]}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder={`Enter ${field === 'inners' ? 'Inner' : field}`}
            />
          </div>
        ))}

        {/* Display Stock On Hand */}
        <div className="mt-4">
          <label className="block font-semibold">Stock On Hand</label>
          <div className="w-full border px-3 py-2 rounded bg-gray-100">
            {stockOnHand}
          </div>
        </div>

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
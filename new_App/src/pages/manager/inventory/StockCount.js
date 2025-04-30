import React, { useState, useEffect } from 'react';
import { db } from "../../../firebase/config";
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import InventoryManagement from './InventoryManagement ';


const StockCount = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedCounts, setAppliedCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [masterCheck, setMasterCheck] = useState(false);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [pendingVarianceItems, setPendingVarianceItems] = useState([]);
  const [submittedItems, setSubmittedItems] = useState({});
  const [itemsToHighlight, setItemsToHighlight] = useState([]);
  const [variances, setVariances] = useState({});
  const [showRecountVariances, setShowRecountVariances] = useState([]);
  const [showStockCountLog, setShowStockCountLog] = useState(false);

  useEffect(() => {
    const fetchItemsData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'inventory'));
        const items = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              itemName: data.itemName || 'Unknown Item',
              unit: 'EA',
              boxes: '',
              innerPacks: '',
              units: '',
              innerPerBox: data.innerPerBox || 1,
              unitsPerInner: data.unitsPerInner || 1,
              totalStockOnHand: data.totalStockOnHand || 0,
            };
          })
        );
        setInventoryItems(items);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching items data:", error);
        setLoading(false);
      }
    };
    fetchItemsData();
  }, []);

  const calculateStock = (item) =>
    (item.boxes * item.innerPerBox * item.unitsPerInner) +
    (item.innerPacks * item.unitsPerInner) +
    item.units;

  const handleInputChange = (id, field, value) => {
    if (value !== '' && (isNaN(value) || Number(value) < 0)) return;

    const updatedItems = inventoryItems.map(item =>
      item.id === id ? { ...item, [field]: value === '' ? '' : Number(value) } : item
    );
    setInventoryItems(updatedItems);
    setShowRecountVariances(prev => prev.filter(itemId => itemId !== id));
  };

  const handleTickChange = (id) => {
    setAppliedCounts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMasterCheck = () => {
    const newState = !masterCheck;
    setMasterCheck(newState);
    const updated = inventoryItems.reduce((acc, item) => {
      const hasData = item.boxes !== '' || item.innerPacks !== '' || item.units !== '';
      acc[item.id] = newState && hasData;
      return acc;
    }, {});
    setAppliedCounts(updated);
  };

  const saveItems = async (items, override = false) => {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  
    try {
      // Use date as document ID
      const varianceLogRef = doc(db, 'inventoryLog', formattedDate);
  
      const totalVariance = items.reduce((sum, item) => {
        return sum + (calculateStock(item) - item.totalStockOnHand);
      }, 0);
  
      // Merge with existing data if updating same day's record
      await setDoc(varianceLogRef, {
        timestamp: currentDate.toISOString(),
        totalVariance: totalVariance,
        date: formattedDate,
        countType: override ? 'override' : 'initial',
        status: override ? 'adjusted' : 'pending'
      }, { merge: true }); // Added merge option to preserve existing data
  
      const batchWrites = [];
  
      items.forEach(item => {
        const totalUnits = calculateStock(item);
        const variance = totalUnits - item.totalStockOnHand;
  
        if (override) {
          const inventoryRef = doc(db, 'inventory', item.id);
          batchWrites.push(
            setDoc(inventoryRef, { totalStockOnHand: totalUnits }, { merge: true })
          );
        }
  
        // Use item ID as document ID in items subcollection
        const variantItemRef = doc(collection(varianceLogRef, 'items'), item.id);
        batchWrites.push(
          setDoc(variantItemRef, {
            itemId: item.id,
            itemName: item.itemName,
            boxesCount: item.boxes,
            innerCount: item.innerPacks,
            unitsCount: item.units,
            totalCounted: totalUnits,
            variance: variance,
            previousStock: item.totalStockOnHand,
            newStock: override ? totalUnits : item.totalStockOnHand,
            needsRecount: !override && variance !== 0,
            status: variance === 0 ? "completed" : "recorded_with_variance",
            timestamp: currentDate.toISOString(),
          }, { merge: true }) // Merge to update existing entries
        );
      });
  
      await Promise.all(batchWrites);
  
      // ... rest of the code remains the same ...

      const updatedItems = inventoryItems.map(invItem => {
        const item = items.find(i => i.id === invItem.id);
        return item ? { 
          ...invItem, 
          totalStockOnHand: override ? calculateStock(item) : invItem.totalStockOnHand 
        } : invItem;
      });

      setInventoryItems(updatedItems);

      const newSubmitted = items.reduce((acc, item) => {
        acc[item.id] = true;
        return acc;
      }, {});

      const newVariances = items.reduce((acc, item) => {
        acc[item.id] = calculateStock(item) - item.totalStockOnHand;
        return acc;
      }, {});

      setSubmittedItems(prev => ({ ...prev, ...newSubmitted }));
      setVariances(prev => ({ ...prev, ...newVariances }));
      setItemsToHighlight(prev => prev.filter(id => !newSubmitted[id]));
      setShowRecountVariances(prev => prev.filter(id => !newSubmitted[id]));

      alert(override 
        ? "Its Submited !...." 
        : "Stock counts saved with variance records!");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data. Please check the console.");
    }
  };

  const handleSaveAllApplied = async () => {
    const itemsToSave = inventoryItems.filter(item =>
      appliedCounts[item.id] && !submittedItems[item.id]
    );

    const noVarianceItems = [];
    const varianceItems = [];

    itemsToSave.forEach(item => {
      const totalUnits = calculateStock(item);
      if (totalUnits === item.totalStockOnHand) {
        noVarianceItems.push(item);
      } else {
        varianceItems.push(item);
      }
    });

    if (varianceItems.length > 0) {
      setPendingVarianceItems(varianceItems);
      setItemsToHighlight(varianceItems.map(item => item.id));
      setShowRecountVariances(varianceItems.map(item => item.id));
      setShowVarianceModal(true);
    }

    if (noVarianceItems.length > 0) {
      await saveItems(noVarianceItems);
    }
  };

  const handleSearch = (e) => setSearchQuery(e.target.value.toLowerCase());

  const filteredItems = inventoryItems.filter(item =>
    item.itemName.toLowerCase().includes(searchQuery)
  );

  if (loading) return <div className="p-4">Loading inventory data...</div>;

  if (showStockCountLog) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <button
          onClick={() => setShowStockCountLog(false)}
          className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 mb-4"
        >
          Back to Stock Count 
        </button>
        <InventoryManagement />
      </div>
    );
  }
  return (
    <div className="flex-1 p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-6">Inventory Management (Stock Count)</h1>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search items..."
          className="border rounded p-2 flex-1"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={masterCheck}
            onChange={handleMasterCheck}
            className="p-2"
          />
          <label>Select All</label>
        </div>

        <button
          onClick={handleSaveAllApplied}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Save Selected
        </button>
        <button
          onClick={() => setShowStockCountLog(true)}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
        >
          Stock Count Log
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full ">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Unit</th>
              <th className="p-3 text-left">Boxes</th>
              <th className="p-3 text-left">Inners</th>
              <th className="p-3 text-left">Units</th>
              <th className="p-3 text-left">Select</th>
              <th className="p-3 text-left">Variance</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isSubmitted = submittedItems[item.id];
              const hasHighlight = itemsToHighlight.includes(item.id);
              const currentVariance = calculateStock(item) - item.totalStockOnHand;

              return (
                <tr key={item.id} className={hasHighlight ? 'bg-yellow-50' : ''}>
                  <td className="p-3 font-medium">{item.itemName}</td>
                  <td className="p-3">{item.unit}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.boxes}
                      onChange={(e) => handleInputChange(item.id, 'boxes', e.target.value)}
                      className={`border rounded p-2 w-20 ${hasHighlight ? 'border-red-500' : ''}`}
                      disabled={isSubmitted}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.innerPacks}
                      onChange={(e) => handleInputChange(item.id, 'innerPacks', e.target.value)}
                      className={`border rounded p-2 w-20 ${hasHighlight ? 'border-red-500' : ''}`}
                      disabled={isSubmitted}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.units}
                      onChange={(e) => handleInputChange(item.id, 'units', e.target.value)}
                      className={`border rounded p-2 w-20 ${hasHighlight ? 'border-red-500' : ''}`}
                      disabled={isSubmitted}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={appliedCounts[item.id]}
                      onChange={() => handleTickChange(item.id)}
                      disabled={isSubmitted}
                    />
                  </td>
                  <td className="p-3 font-medium">
                    {(isSubmitted || showRecountVariances.includes(item.id)) && (
                      <span className={currentVariance !== 0 ? 'text-red-600' : 'text-green-600'}>
                        {currentVariance}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showVarianceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Inventory Adjustment Required</h3>
            <p className="mb-4">
            There is a variance in {pendingVarianceItems.length} item(s).</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowVarianceModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Recount
              </button>
              <button
                onClick={async () => {
                  await saveItems(pendingVarianceItems, true);
                  setShowVarianceModal(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockCount;
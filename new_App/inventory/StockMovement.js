import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import {
  collection,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

const InventoryAndWasteHistory = () => {
  const [groupedLogs, setGroupedLogs] = useState({});
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const [inventorySnapshot, wasteSnapshot] = await Promise.all([
          getDocs(collection(db, 'inventoryLog')),
          getDocs(collection(db, 'wasteLogs')),
        ]);

        const inventoryLogs = await Promise.all(
          inventorySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              type: 'inventory',
              timestamp: data.timestamp,
              date: new Date(data.timestamp).toDateString(),
              totalVariance: data.totalVariance || 0,
              status: data.status || 'pending',
              countType: data.countType || 'initial',
              items: null
            };
          })
        );

        const wasteLogs = await Promise.all(
          wasteSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              type: 'waste',
              timestamp: data.timestamp,
              date: new Date(data.timestamp).toDateString(),
              totalWaste: data.totalWaste || 0,
              wasteItems: null
            };
          })
        );

        // Group logs by date
        const grouped = {};
        [...inventoryLogs, ...wasteLogs].forEach(log => {
          // Apply single date filter
          const logDate = new Date(log.timestamp).toDateString();
          if (selectedDate && logDate !== new Date(selectedDate).toDateString()) return;

          if (!grouped[log.date]) {
            grouped[log.date] = {
              date: log.date,
              timestamp: log.timestamp,
              inventoryLogs: [],
              wasteLogs: []
            };
          }
          
          if (log.type === 'inventory') {
            grouped[log.date].inventoryLogs.push(log);
          } else {
            grouped[log.date].wasteLogs.push(log);
          }
        });

        // Sort dates in descending order
        const sortedDates = Object.values(grouped).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const sortedGrouped = {};
        sortedDates.forEach(dateGroup => {
          sortedGrouped[dateGroup.date] = dateGroup;
        });

        setGroupedLogs(sortedGrouped);
        setLoading(false);
      } catch (err) {
        console.error("Error loading logs:", err);
        setError('Failed to load logs');
        setLoading(false);
      }
    };

    fetchAllLogs();
  }, [selectedDate]);

  const handleDateExpand = async (date) => {
    const newSet = new Set(expandedDates);
    if (newSet.has(date)) {
      newSet.delete(date);
    } else {
      newSet.add(date);
      
      // Fetch details for all logs under this date if not already fetched
      const dateGroup = groupedLogs[date];
      
      // Fetch inventory logs details
      for (const log of dateGroup.inventoryLogs) {
        if (!log.items) {
          try {
            const itemsRef = collection(db, `inventoryLog/${log.id}/items`);
            const itemsSnapshot = await getDocs(itemsRef);
    
            const itemsData = await Promise.all(
              itemsSnapshot.docs.map(async (itemDoc) => {
                const itemData = itemDoc.data();
                const inventoryRef = doc(db, 'inventory', itemData.itemId);
                const inventorySnap = await getDoc(inventoryRef);
    
                return {
                  id: itemDoc.id,
                  itemId: itemData.itemId,
                  itemName: inventorySnap.exists() ? inventorySnap.data().itemName : 'Deleted Item',
                  boxes: itemData.boxesCount || 0,
                  inners: itemData.innerCount || 0,
                  units: itemData.unitsCount || 0,
                  totalCounted: itemData.totalCounted || 0,
                  variance: itemData.variance || 0,
                  status: itemData.status || 'recorded'
                };
              })
            );
    
            setGroupedLogs(prev => ({
              ...prev,
              [date]: {
                ...prev[date],
                inventoryLogs: prev[date].inventoryLogs.map(l => 
                  l.id === log.id ? { ...l, items: itemsData } : l
                )
              }
            }));
          } catch (err) {
            console.error("Error fetching inventory items:", err);
            setError('Failed to fetch inventory items');
          }
        }
      }
      
      // Fetch waste logs details
      for (const log of dateGroup.wasteLogs) {
        if (!log.wasteItems) {
          try {
            const wasteItemsRef = collection(db, `wasteLogs/${log.id}/wasteItems`);
            const itemsSnapshot = await getDocs(wasteItemsRef);
    
            const itemsData = itemsSnapshot.docs.map((itemDoc) => {
              const itemData = itemDoc.data();
              let cleanItemId = 'N/A';
              if (itemData.itemId) {
                const ref = typeof itemData.itemId === 'string' ? itemData.itemId : itemData.itemId.path;
                cleanItemId = ref.split('/')[1] || ref;
              }
    
              return {
                id: itemDoc.id,
                itemName: itemData.itemName || 'N/A',
                itemId: cleanItemId,
                boxesCount: itemData.boxesCount || 0,
                innerCount: itemData.innerCount || 0,
                unitsCount: itemData.unitsCount || 0,
                totalWaste: itemData.totalWaste || 0,
                reason: itemData.reason || 'N/A'
              };
            });
    
            setGroupedLogs(prev => ({
              ...prev,
              [date]: {
                ...prev[date],
                wasteLogs: prev[date].wasteLogs.map(l => 
                  l.id === log.id ? { ...l, wasteItems: itemsData } : l
                )
              }
            }));
          } catch (err) {
            console.error("Error fetching waste items:", err);
            setError('Failed to fetch waste items');
          }
        }
      }
    }
    setExpandedDates(newSet);
  };

  const formatDate = (timestamp) => {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(timestamp).toLocaleString(undefined, options);
  };

  const calculateDailyTotals = (dateGroup) => {
    const totalWaste = dateGroup.wasteLogs.reduce((sum, log) => sum + (log.totalWaste || 0), 0);
    const totalVariance = dateGroup.inventoryLogs.reduce((sum, log) => sum + (log.totalVariance || 0), 0);
    
    return {
      totalWaste,
      totalVariance,
      hasWaste: totalWaste !== 0,
      hasVariance: totalVariance !== 0
    };
  };

  const handleClearFilters = () => {
    setSelectedDate('');
  };

  if (loading) return <div className="p-6 text-gray-600">Loading logs...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventory & Waste History</h1>
        {/* Date Filter */}
        <div className="flex gap-4 items-center">
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"> </label>
            <button
              onClick={handleClearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.values(groupedLogs).length > 0 ? (
          Object.values(groupedLogs).map((dateGroup) => {
            const { totalWaste, totalVariance, hasWaste, hasVariance } = calculateDailyTotals(dateGroup);
            
            return (
              <div key={dateGroup.date} className="bg-white rounded-lg shadow">
                <div
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleDateExpand(dateGroup.date)}
                >
                  <div>
                    <h3 className="font-semibold">
                      {formatDate(dateGroup.timestamp)}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1 flex gap-4">
                      {hasWaste && (
                        <span className={`font-medium ${totalWaste !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Total Waste: {totalWaste}
                        </span>
                      )}
                      {hasVariance && (
                        <span className={`font-medium ${totalVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Total Variance: {totalVariance}
                        </span>
                      )}
                      {!hasWaste && !hasVariance && (
                        <span className="text-gray-500">No activity recorded</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xl">
                    {expandedDates.has(dateGroup.date) ? '▼' : '▶'}
                  </span>
                </div>

                {expandedDates.has(dateGroup.date) && (
                  <div className="border-t p-4 bg-gray-50 space-y-6">
                    {/* Waste Logs Section */}
                    {dateGroup.wasteLogs.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-4">Waste Logs</h4>
                        {dateGroup.wasteLogs.map(log => (
                          <div key={log.id} className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">
                              Waste logged at: {formatDate(log.timestamp)}
                              <span className="ml-4 font-medium">Total Waste: {log.totalWaste}</span>
                            </div>
                            {log.wasteItems?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full bg-white rounded shadow">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="p-3 text-left">Item Name</th>
                                      <th className="p-3 text-left">Boxes</th>
                                      <th className="p-3 text-left">Inner</th>
                                      <th className="p-3 text-left">Units</th>
                                      <th className="p-3 text-left">Total Waste</th>
                                      <th className="p-3 text-left">Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {log.wasteItems.map(item => (
                                      <tr key={item.id} className="border-t">
                                        <td className="p-3">
                                          <div className="font-medium">{item.itemName}</div>
                                          <div className="text-xs text-gray-500">ID: {item.itemId}</div>
                                        </td>
                                        <td className="p-3">{item.boxesCount}</td>
                                        <td className="p-3">{item.innerCount}</td>
                                        <td className="p-3">{item.unitsCount}</td>
                                        <td className="p-3">{item.totalWaste}</td>
                                        <td className="p-3">{item.reason}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-center">No waste items found.</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inventory Logs Section */}
                    {dateGroup.inventoryLogs.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-4">Inventory Counts</h4>
                        {dateGroup.inventoryLogs.map(log => (
                          <div key={log.id} className="mb-6">
                            <div className="text-sm text-gray-600 mb-2 flex gap-4">
                              <span>Counted at: {formatDate(log.timestamp)}</span>
                              <span>Type: {log.countType}</span>
                              <span>Status: {log.status}</span>
                              <span className={`font-medium ${log.totalVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                Total Variance: {log.totalVariance}
                              </span>
                            </div>
                            {log.items?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full bg-white rounded shadow">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="p-3 text-left">Item</th>
                                      <th className="p-3 text-left">Boxes</th>
                                      <th className="p-3 text-left">Inners</th>
                                      <th className="p-3 text-left">Units</th>
                                      <th className="p-3 text-left">Counted</th>
                                      <th className="p-3 text-left">Variance</th>
                                      <th className="p-3 text-left">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {log.items.map(item => (
                                      <tr key={item.id} className="border-t">
                                        <td className="p-3">
                                          <div className="font-medium">{item.itemName}</div>
                                          <div className="text-xs text-gray-500">ID: {item.itemId}</div>
                                        </td>
                                        <td className="p-3">{item.boxes}</td>
                                        <td className="p-3">{item.inners}</td>
                                        <td className="p-3">{item.units}</td>
                                        <td className="p-3">{item.totalCounted}</td>
                                        <td className={`p-3 font-medium ${item.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {item.variance > 0 ? '+' : ''}{item.variance}
                                        </td>
                                        <td className="p-3">
                                          <span className={`px-2 py-1 rounded text-sm ${
                                            item.status === 'completed'
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {item.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-center">No items found.</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-gray-500 text-center">No logs found for the selected date.</div>
        )}
      </div>
    </div>
  );
};

export default InventoryAndWasteHistory;
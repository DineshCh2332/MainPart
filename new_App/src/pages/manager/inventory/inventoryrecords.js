import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useNavigate } from 'react-router-dom';

const InventoryRecords = () => {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editedItem, setEditedItem] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'itemId', direction: 'asc' });
  const [stockPrompt, setStockPrompt] = useState({ boxes: '', inner: '', units: '' });
  const [showStockPrompt, setShowStockPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          itemId: doc.data().itemId || '',
        }));
        items.sort((a, b) => {
          const idA = parseInt(a.itemId.match(/^item0*(\d+)$/)[1]) || 0;
          const idB = parseInt(b.itemId.match(/^item0*(\d+)$/)[1]) || 0;
          return idA - idB;
        });
        setInventory(items);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
    };
    fetchInventory();
  }, []);

  const handleSort = (key) => {
    setSortConfig((prevConfig) => {
      const isAsc = prevConfig.key === key && prevConfig.direction === 'asc';
      const direction = isAsc ? 'desc' : 'asc';
      const sortedInventory = [...inventory].sort((a, b) => {
        let aValue = a[key] || '';
        let bValue = b[key] || '';
        if (key === 'itemId') {
          aValue = parseInt(aValue.match(/^item0*(\d+)$/)[1]) || 0;
          bValue = parseInt(bValue.match(/^item0*(\d+)$/)[1]) || 0;
        } else if (['unitsPerInner', 'innerPerBox', 'totalStockOnHand'].includes(key)) {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      });
      setInventory(sortedInventory);
      return { key, direction };
    });
  };

  const filteredInventory = inventory.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const isNumeric = (val) => /^[0-9\b]+$/.test(val) || val === '';

  const handleInputChange = (e, field) => {
    const value = e.target.value;
    if (['unitsPerInner', 'innerPerBox', 'totalStockOnHand'].includes(field) && !isNumeric(value)) return;
    setEditedItem({ ...editedItem, [field]: value });
  };

  const handleStockPromptChange = (e, field) => {
    const value = e.target.value;
    if (!isNumeric(value)) return;
    setStockPrompt({ ...stockPrompt, [field]: value });
  };

  const calculateTotalStock = () => {
    const { boxes, inner, units } = stockPrompt;
    const unitsPerInner = Number(editedItem.unitsPerInner) || 0;
    const innerPerBox = Number(editedItem.innerPerBox) || 0;
    const total = (Number(boxes) || 0) * innerPerBox * unitsPerInner +
                  (Number(inner) || 0) * unitsPerInner +
                  (Number(units) || 0);
    return total;
  };

  const handleStockPromptSubmit = () => {
    const totalStock = calculateTotalStock();
    setEditedItem({ ...editedItem, totalStockOnHand: totalStock.toString() });
    setShowStockPrompt(false);
    setStockPrompt({ boxes: '', inner: '', units: '' });
  };

  const handleSave = async (itemId) => {
    try {
      const oldItem = inventory.find(item => item.id === itemId);
      const duplicateItem = inventory.find(item =>
        item.id !== itemId && (
          (editedItem.itemId && item.itemId === editedItem.itemId) ||
          (editedItem.itemName && item.itemName.toLowerCase() === editedItem.itemName.toLowerCase())
        )
      );
      if (duplicateItem) {
        alert(duplicateItem.itemId === editedItem.itemId
          ? 'An item with this Item ID already exists.'
          : 'An item with this Item Name already exists.');
        return;
      }

      const changedFields = [];
      Object.entries(editedItem).forEach(([key, newValue]) => {
        const oldValue = oldItem[key] || '';
        if (String(oldValue) !== String(newValue)) {
          changedFields.push({ field: key, oldValue, newValue });
        }
      });

      const allowedFields = ['itemId', 'itemName', 'unitsPerInner', 'innerPerBox', 'totalStockOnHand'];
      const updatedData = {};
      allowedFields.forEach(field => {
        if (editedItem.hasOwnProperty(field)) {
          updatedData[field] = ['unitsPerInner', 'innerPerBox', 'totalStockOnHand'].includes(field)
            ? Number(editedItem[field]) || 0
            : editedItem[field];
        } else if (oldItem.hasOwnProperty(field)) {
          updatedData[field] = ['unitsPerInner', 'innerPerBox', 'totalStockOnHand'].includes(field)
            ? Number(oldItem[field]) || 0
            : oldItem[field];
        }
      });

      updatedData.lastUpdated = Timestamp.fromDate(new Date());
      updatedData.changedFields = changedFields.length > 0 ? changedFields : (oldItem.changedFields || []);

      const itemDocRef = doc(db, 'inventory', itemId);
      await updateDoc(itemDocRef, updatedData);

      setInventory(prev =>
        prev.map(item => item.id === itemId ? { ...item, ...updatedData } : item)
      );

      setEditingRowId(null);
      setEditedItem({});
      setShowStockPrompt(false);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item.');
    }
  };

  const handleDelete = async (itemId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this record?');
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      setInventory(prev => prev.filter(item => item.id !== itemId));
      alert('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item.');
    }
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 text-left pl-10">
          <button
            onClick={() => navigate('/admin/inventory/addinventory')}
            className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700 text-sm"
            style={{ height: '42px', width: '150px' }}
          >
            Add Inventory
          </button>
        </div>
        <h1 className="text-2xl font-semibold text-center flex-1">Inventory Records</h1>
        <div className="flex-1 flex justify-end pr-10">
          <input
            type="text"
            placeholder="Search..."
            className="border rounded text-sm px-6 py-2 ml-[50px]"
            style={{ height: '42px', width: '250px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {showStockPrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Enter Stock Details</h2>
            <div className="mb-4">
              <label className="block mb-1">Boxes</label>
              <input
                type="text"
                value={stockPrompt.boxes}
                onChange={(e) => handleStockPromptChange(e, 'boxes')}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Inner</label>
              <input
                type="text"
                value={stockPrompt.inner}
                onChange={(e) => handleStockPromptChange(e, 'inner')}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Units</label>
              <input
                type="text"
                value={stockPrompt.units}
                onChange={(e) => handleStockPromptChange(e, 'units')}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleStockPromptSubmit}
                className="bg-blue-600 text-white font-bold px-4 py-2 rounded hover:bg-blue-700 mr-2"
              >
                Submit
              </button>
              <button
                onClick={() => setShowStockPrompt(false)}
                className="bg-red-600 text-white font-bold px-4 py-2 rounded hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table-auto border-collapse w-full max-w-5xl mx-auto text-sm shadow rounded">
          <thead>
            <tr className="bg-gray-200 text-gray-800 text-left">
              <th className="border px-3 py-2 cursor-pointer" onClick={() => handleSort('itemId')}>
                Item Id{renderSortArrow('itemId')}
              </th>
              <th className="border px-3 py-2 cursor-pointer" onClick={() => handleSort('itemName')}>
                Item Name{renderSortArrow('itemName')}
              </th>
              <th className="border px-3 py-2 cursor-pointer" onClick={() => handleSort('unitsPerInner')}>
                Units Per Inner{renderSortArrow('unitsPerInner')}
              </th>
              <th className="border px-3 py-2 cursor-pointer" onClick={() => handleSort('innerPerBox')}>
                Inner Per Box{renderSortArrow('innerPerBox')}
              </th>
              <th className="border px-3 py-2 cursor-pointer" onClick={() => handleSort('totalStockOnHand')}>
                Total Stock{renderSortArrow('totalStockOnHand')}
              </th>
              <th className="border px-3 py-2">Last Updated</th>
              <th className="border px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border px-2 py-1 font-semibold text-gray-800">
                    {editingRowId === item.id ? (
                      <input
                        type="text"
                        value={editedItem.itemId || ''}
                        onChange={(e) => handleInputChange(e, 'itemId')}
                        className="border rounded px-2 py-1 font-semibold w-full"
                      />
                    ) : (
                      item.itemId || 'N/A'
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {editingRowId === item.id ? (
                      <input
                        type="text"
                        value={editedItem.itemName || ''}
                        onChange={(e) => handleInputChange(e, 'itemName')}
                        className="border rounded px-2 py-1 w-full"
                      />
                    ) : (
                      <span>{item.itemName || 'N/A'}</span>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {editingRowId === item.id ? (
                      <input
                        type="text"
                        value={editedItem.unitsPerInner || ''}
                        onChange={(e) => handleInputChange(e, 'unitsPerInner')}
                        className="border rounded px-2 py-1 w-full"
                      />
                    ) : (
                      <span>{item.unitsPerInner || 'N/A'}</span>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {editingRowId === item.id ? (
                      <input
                        type="text"
                        value={editedItem.innerPerBox || ''}
                        onChange={(e) => handleInputChange(e, 'innerPerBox')}
                        className="border rounded px-2 py-1 w-full"
                      />
                    ) : (
                      <span>{item.innerPerBox || 'N/A'}</span>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {editingRowId === item.id ? (
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editedItem.totalStockOnHand || ''}
                          onChange={(e) => handleInputChange(e, 'totalStockOnHand')}
                          className="border rounded px-2 py-1 w-full"
                          readOnly
                        />
                        <button
                          onClick={() => setShowStockPrompt(true)}
                          className="ml-2 bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                        >
                          Edit Stock
                        </button>
                      </div>
                    ) : (
                      <span>{item.totalStockOnHand || 'N/A'}</span>
                    )}
                  </td>
                  <td className="border px-2 py-1 font-semibold text-gray-800">
                    {item.lastUpdated
                      ? new Date(item.lastUpdated.seconds * 1000).toLocaleString()
                      : 'Not Updated yet'}
                  </td>
                  <td className="border px-2 py-1">
                    {editingRowId === item.id ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                          onClick={() => handleSave(item.id)}
                          className="bg-blue-600 text-white font-bold px-3 py-2 rounded hover:bg-blue-700"
                          style={{ height: '42px', width: '100px', marginRight: '5px' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingRowId(null);
                            setEditedItem({});
                            setShowStockPrompt(false);
                          }}
                          className="bg-red-600 text-white font-bold px-3 py-2 rounded hover:bg-red-700"
                          style={{ height: '42px', width: '100px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                          onClick={() => {
                            setEditingRowId(item.id);
                            setEditedItem({
                              itemId: item.itemId || '',
                              itemName: item.itemName || '',
                              unitsPerInner: item.unitsPerInner || '',
                              innerPerBox: item.innerPerBox || '',
                              totalStockOnHand: item.totalStockOnHand || '',
                            });
                          }}
                          className="bg-blue-600 text-white font-bold px-3 py-2 rounded hover:bg-blue-700"
                          style={{ height: '42px', width: '100px', marginRight: '5px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-600 text-white font-bold px-3 py-2 rounded hover:bg-red-700"
                          style={{ height: '42px', width: '100px' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryRecords;
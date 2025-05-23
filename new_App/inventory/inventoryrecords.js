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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        const items = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const itemId = data.itemId || '';
          items.push({ id: doc.id, itemId, ...data });
        });
        // Initial sort by itemId in ascending order
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

  // Handle sorting when a column header is clicked
  const handleSort = (key) => {
    setSortConfig((prevConfig) => {
      const isAsc = prevConfig.key === key && prevConfig.direction === 'asc';
      const direction = isAsc ? 'desc' : 'asc';

      const sortedInventory = [...inventory].sort((a, b) => {
        let aValue = a[key] || '';
        let bValue = b[key] || '';

        // Handle itemId specifically (extract numeric part)
        if (key === 'itemId') {
          aValue = parseInt(aValue.match(/^item0*(\d+)$/)[1]) || 0;
          bValue = parseInt(bValue.match(/^item0*(\d+)$/)[1]) || 0;
        }
        // Handle numeric fields
        else if (['unitsPerInner', 'innerPerBox', 'totalStockOnHand'].includes(key)) {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }
        // Handle string fields (itemName)
        else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
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

  const handleSave = async (itemId) => {
    try {
      const oldItem = inventory.find(item => item.id === itemId);

      // Validate for duplicate itemId or itemName
      const duplicateItem = inventory.find(item =>
        item.id !== itemId && (
          (editedItem.itemId && item.itemId === editedItem.itemId) ||
          (editedItem.itemName && item.itemName.toLowerCase() === editedItem.itemName.toLowerCase())
        )
      );
      if (duplicateItem) {
        if (duplicateItem.itemId === editedItem.itemId) {
          alert('An item with this Item ID already exists.');
        } else {
          alert('An item with this Item Name already exists.');
        }
        return;
      }

      // Build changedFields list
      const changedFields = [];
      Object.entries(editedItem).forEach(([key, newValue]) => {
        const oldValue = oldItem[key] || '';
        if (String(oldValue) !== String(newValue)) {
          changedFields.push({ field: key, oldValue, newValue });
        }
      });

      // Whitelist ONLY these fields for update (exclude 'id')
      const allowedFields = ['itemId', 'itemName', 'unitsPerInner', 'innerPerBox', 'totalStockOnHand'];

      // Build updatedData manually
      const updatedData = {};

      // Copy old values for allowed fields if not edited
      allowedFields.forEach(field => {
        if (editedItem.hasOwnProperty(field)) {
          updatedData[field] = editedItem[field];
        } else if (oldItem.hasOwnProperty(field)) {
          updatedData[field] = oldItem[field];
        }
      });

      // Set lastUpdated as Firestore Timestamp
      updatedData.lastUpdated = Timestamp.fromDate(new Date());
      updatedData.changedFields = changedFields.length > 0 ? changedFields : (oldItem.changedFields || []);

      // Firestore update
      const itemDocRef = doc(db, 'inventory', itemId);
      await updateDoc(itemDocRef, updatedData);

      // Update state (merge manually)
      setInventory(prev =>
        prev.map(item => item.id === itemId ? { ...item, ...updatedData } : item)
      );

      setEditingRowId(null);
      setEditedItem({});
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

  const handleInputChange = (e, field) => {
    const value = e.target.value;
    const numericFields = ['unitsPerInner', 'innerPerBox', 'totalStockOnHand'];

    if (numericFields.includes(field) && !isNumeric(value)) return;

    setEditedItem({ ...editedItem, [field]: value });
  };

  // Helper to render sort arrow
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
          <div className="mr-auto">
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
      </div>

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
                      <input
                        type="text"
                        value={editedItem.totalStockOnHand || ''}
                        onChange={(e) => handleInputChange(e, 'totalStockOnHand')}
                        className="border rounded px-2 py-1 w-full"
                      />
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
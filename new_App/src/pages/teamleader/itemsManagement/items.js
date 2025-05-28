import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

const ItemsManager = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sauceGroups, setSauceGroups] = useState([]);
  const [form, setForm] = useState({
    itemName: '',
    price: '',
    categoryId: '',
    sauceGroupId: '',
    sauceName: '',
    saucesArray: [],
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'items'), snapshot => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const snapshot = await getDocs(collection(db, 'category'));
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSauceGroups = async () => {
      const snapshot = await getDocs(collection(db, 'sauceGroups'));
      const sauces = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSauceGroups(sauces);
    };
    fetchSauceGroups();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!form.itemName.trim() || !form.price || !form.categoryId) {
      alert('Please fill in item name, price, and category.');
      return;
    }

    const itemData = {
      itemName: form.itemName.trim(),
      price: Number(form.price),
      categoryId: doc(db, 'category', form.categoryId),
      sauces: form.sauceGroupId ? doc(db, 'sauceGroups', form.sauceGroupId) : null,
      sauceName: form.sauceName || '',
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'items', editId), itemData);
        setEditId(null);
      } else {
        const snapshot = await getDocs(collection(db, 'items'));
        const newId = `item${snapshot.size + 1}`;
        await setDoc(doc(db, 'items', newId), itemData);
      }

      setForm({ itemName: '', price: '', categoryId: '', sauceGroupId: '', sauceName: '', saucesArray: [] });
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = item => {
    setForm({
      itemName: item.itemName || '',
      price: item.price || '',
      categoryId: item.categoryId?.id || '',
      sauceGroupId: item.sauces?.id || '',
      sauceName: item.sauceName || '',
      saucesArray: Array.isArray(item.sauces) ? item.sauces.map(s => s.id) : [],
    });
    setEditId(item.id);
  };

  const handleDelete = async id => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'items', id));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  // Toggle active status for an item
  const handleToggleActive = async (id, currentActive) => {
    try {
      await updateDoc(doc(db, 'items', id), { active: !currentActive });
      // No need to manually update state, onSnapshot will update the UI
    } catch (error) {
      alert('Failed to update active status.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Item Management</h1>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Item Name"
          value={form.itemName}
          onChange={e => setForm({ ...form, itemName: e.target.value })}
          className="flex-1 min-w-[150px] p-2 border rounded"
          required
        />
        <input
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
          className="flex-1 min-w-[100px] p-2 border rounded"
          required
        />
        <select
          value={form.categoryId}
          onChange={e => setForm({ ...form, categoryId: e.target.value })}
          className="flex-1 min-w-[150px] p-2 border rounded"
          required
        >
          <option value="">— Select Category —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name || cat.id}
            </option>
          ))}
        </select>

        <select
          value={form.sauceGroupId}
          onChange={e => setForm({ ...form, sauceGroupId: e.target.value })}
          className="flex-1 min-w-[150px] p-2 border rounded"
        >
          <option value="">— No Sauce Group —</option>
          {sauceGroups.map(sg => (
            <option key={sg.id} value={sg.id}>
              {sg.id}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Sauce Name"
          value={form.sauceName}
          onChange={e => setForm({ ...form, sauceName: e.target.value })}
          className="flex-1 min-w-[150px] p-2 border rounded"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {editId ? 'Update' : 'Add'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-2 px-4 border">ID</th>
              <th className="py-2 px-4 border">Name</th>
              <th className="py-2 px-4 border">Price</th>
              <th className="py-2 px-4 border">Category</th>
              <th className="py-2 px-4 border">Sauce Name</th>
              <th className="py-2 px-4 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No items found.
                </td>
              </tr>
            ) : (
              items.map(item => {
                const categoryName =
                  categories.find(cat => cat.id === item.categoryId?.id)?.name || item.categoryId?.id || '—';

                return (
                  <tr key={item.id} className="text-center text-lg">
                    <td className="py-2 px-4 border">{item.id}</td>
                    <td className="py-2 px-4 border">{item.itemName}</td>
                    <td className="py-2 px-4 border">{item.price}</td>
                    <td className="py-2 px-4 border">{categoryName}</td>
                    <td className="py-2 px-4 border">{item.sauceName || '—'}</td>
                    <td className="py-2 px-4 border">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-yellow-400 text-white px-3 py-1 rounded mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded mr-2"
                        >
                          Delete
                        </button>
                        <button
                          className={`w-28 ${
                            item.active === true
                              ? "bg-red-700 hover:bg-red-800"
                              : "bg-green-600 hover:bg-green-700"
                          } text-white px-3 py-1 rounded`}
                          style={{ minWidth: 112 }} // Ensures fixed width for both buttons
                          onClick={() => handleToggleActive(item.id, item.active)}
                        >
                          {item.active === true ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemsManager;

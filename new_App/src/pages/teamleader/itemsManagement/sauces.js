import React, { useEffect, useState } from 'react';
import { db } from '../../../firebase/config';
import { collection,onSnapshot, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const Sauces = () => {
  const [groups, setGroups] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [saucesInput, setSaucesInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingSauces, setEditingSauces] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term


  useEffect(()=>{
    const unsubscribe = onSnapshot(collection(db,"sauceGroups"),(snapshot)=>{
    const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        }));
        setGroups(data);
        });
        return () => unsubscribe(); // cleanup on unmount
    }, []);
      
  // Add new sauce group (doc ID = category name)
  const handleAddGroup = async () => {
    if (categoryName.trim() === '') {
      alert('Please enter a category name!');
      return;
    }
    if (saucesInput.trim() === '') {
      alert('Please enter at least one sauce!');
      return;
    }

    const saucesArray = saucesInput.split(',').map(s => s.trim());
    const docRef = doc(db, 'sauceGroups', categoryName); // use categoryName as document ID

    await setDoc(docRef, {
      sauces: saucesArray,
    });

    setGroups([...groups, { id: docRef.id, sauces: saucesArray }]);
    setCategoryName('');
    setSaucesInput('');
  };

  // Update sauces in an existing group
  const handleUpdateGroup = async (id) => {
    if (editingSauces.trim() === '') {
      alert('Please enter at least one sauce!');
      return;
    }

    const saucesArray = editingSauces.split(',').map(s => s.trim());
    const docRef = doc(db, 'sauceGroups', id);

    await updateDoc(docRef, {
      sauces: saucesArray,
    });

    setGroups(groups.map(g => g.id === id ? { ...g, sauces: saucesArray } : g));
    setEditingId(null);
    setEditingSauces('');
  };

  // Delete sauce group
  const handleDeleteGroup = async (id) => {
    await deleteDoc(doc(db, 'sauceGroups', id));
    setGroups(groups.filter(g => g.id !== id));
  };
 
   // --- Search Filter Logic ---
  const filteredGroups = groups.filter((group) =>
    group.id.toLowerCase().includes(searchTerm.toLowerCase()) || // Search by category name (document ID)
    group.sauces.some(sauce => sauce.toLowerCase().includes(searchTerm.toLowerCase())) // Search within sauces array
  );
  // --- End Search Filter Logic ---

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Sauce Group Management</h2>

      <div className="mb-4 flex gap-2">
        <input
          className="border p-2 rounded w-1/3"
          placeholder="Category Name"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
        <input
          className="border p-2 rounded w-1/2"
          placeholder="Sauces (comma separated)"
          value={saucesInput}
          onChange={(e) => setSaucesInput(e.target.value)}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleAddGroup}
        >
          Add
        </button>
      </div>

       {/* Search Input Field */}
      <div className="mb-4">
        <input
          className="border p-2 rounded w-full text-base"
          placeholder="Search categories or sauces..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="border px-2 py-2">Category</th>
            <th className="border px-2 py-2">Sauces</th>
            <th className="border px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Render filteredGroups instead of original groups */}
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
            <tr key={group.id} className="text-center hover:bg-gray-100 text-base">
              <td className="border px-2 py-1">
                {group.id} {/* show document ID as category */}
              </td>
              <td className="border px-2 py-1 break-all">
                {editingId === group.id ? (
                    <input
                    className="border p-1 rounded w-full"
                    value={editingSauces}
                    onChange={(e) => setEditingSauces(e.target.value)}
                    placeholder="Sauces (comma separated)"
                  />
                ) : (
                  group.sauces.join(', ')
                )}
              </td>
              <td className="border px-2 py-1">
                {editingId === group.id ? (
                    <div className="flex gap-1 justify-center">
                        <button
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-base rounded"
                        onClick={() => handleUpdateGroup(group.id)}
                         >
        Save
      </button>
      <button
        className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 text-base rounded"
        onClick={() => {
          setEditingId(null);
          setEditingSauces('');
        }}
      >
        Cancel
      </button>
    </div>
  ) : (
    <div className="flex gap-1 justify-center">
      <button
        className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 text-base rounded"
        onClick={() => {
          setEditingId(group.id);
          setEditingSauces(group.sauces.join(', '));
        }}
      >
        Edit
      </button>
      <button
        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-base rounded"
        onClick={() => handleDeleteGroup(group.id)}
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
              <td colSpan="3" className="text-center p-4 text-gray-500">
                No sauce groups found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Sauces;

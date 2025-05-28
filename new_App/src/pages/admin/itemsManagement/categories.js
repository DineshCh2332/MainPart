import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // NEW: State for the search term
  const [filteredCategories, setFilteredCategories] = useState([]); // NEW: State for filtered results

  const fetchCategories = async () => {
    const catRef = collection(db, "category");
    const snapshot = await getDocs(catRef);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Effect to filter categories whenever categories or searchTerm changes
  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const results = categories.filter((cat) =>
      cat.name.toLowerCase().includes(lowercasedSearchTerm)
    );
    setFilteredCategories(results);
  }, [categories, searchTerm]); // Depend on categories and searchTerm

  const handleAddCategory = async () => {
    if (newCategory.trim() === "") {
        alert("Please enter a category name!");
        return;
    }
       
        // Calculate new catXX id
        const newNumber = categories.length + 1;
        const newId = `cat${newNumber.toString().padStart(2, "0")}`;
      
        const docRef = await addDoc(collection(db, "category"), {
          id: newId,  // save generated id in Firestore too
          name: newCategory,
          active:true,
        });
      
        setCategories([...categories, { id: newId, name: newCategory, active: true }]);
        setNewCategory("");
      };
      

  const handleDeleteCategory = async (id) => {
    await deleteDoc(doc(db, "category", id));
    setCategories(categories.filter((cat) => cat.id !== id));
  };

  

 const handleUpdateCategory = async (catId) => {
  if (editingName.trim() === "") return;

  // Find the document where 'id' field == catId
  const catRef = collection(db, "category");
  const q = query(catRef, where("id", "==", catId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docToUpdate = snapshot.docs[0];
    const docRef = doc(db, "category", docToUpdate.id);

    await updateDoc(docRef, { name: editingName });

    setCategories(
      categories.map((cat) =>
        cat.id === catId ? { ...cat, name: editingName } : cat
      )
    );
    setEditingId(null);
    setEditingName("");
  } else {
    console.error(`Category with id ${catId} not found!`);
  }
};

  // Only keep this toggleActive inside the component!
  const toggleActive = async (catId, currentActive) => {
    const catRef = collection(db, "category");
    const q = query(catRef, where("id", "==", catId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docToUpdate = snapshot.docs[0];
      const docRef = doc(db, "category", docToUpdate.id);

      await updateDoc(docRef, { active: !currentActive });

      // Always fetch from Firestore after update
      fetchCategories();
    } else {
      console.error(`Category with id ${catId} not found!`);
    }
  };


  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Category Management</h2>

       {/* --- Search Input --- */}
      <div className="mb-4">
        <input
          className="border p-2 rounded w-full text-base"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {/* --- End Search Input --- */}
  
      <div className="mb-4 flex gap-2">
        <input
          className="border p-2 rounded w-full text-base"
          placeholder="New Category Name"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-base"
          onClick={handleAddCategory}
        >
          Add
        </button>
      </div>
  
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* --- Use filteredCategories for rendering --- */}
          {filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => (
              <tr key={cat.id} className="text-center hover:bg-gray-100 text-base">
                <td className="border px-2 py-1 break-all">{cat.id}</td>
                <td className="border px-2 py-1">
                  {editingId === cat.id ? (
                    <input
                      className="border p-1 rounded w-full text-base"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  ) : (
                    cat.name
                  )}
                </td>
                <td className="border px-2 py-1">
                  {editingId === cat.id ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-base rounded"
                        onClick={() => handleUpdateCategory(cat.id)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 text-base rounded"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
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
                          setEditingId(cat.id);
                          setEditingName(cat.name);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-base rounded"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        Delete
                      </button>
                      <button
                        className={`${
                          cat.active ? "bg-red-700 hover:bg-red-800" : "bg-green-600 hover:bg-green-700"
                        } text-white px-2 py-1 text-base rounded`}
                        onClick={() => toggleActive(cat.id, cat.active)}
                      >
                        {cat.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center p-4 text-gray-500">
                {searchTerm ? "No matching categories found." : "No categories found."}
                </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 

export default Categories;

import React, { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { Dialog, Transition } from '@headlessui/react';

const displayValue = (value) => value || 'N/A';

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [duplicateProfiles, setDuplicateProfiles] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPhoneChangeAlertOpen, setIsPhoneChangeAlertOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    document_number: '',
    role: 'customer',
    member_since: '',
    shareCode: '',
    bank_details: {
      account_number: '',
      bank_name: '',
      branch_name: '',
      ifsc_code: ''
    },
    customerID: '',
    employeeID: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const [usersSnapshot, customersSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'users_01'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'customers'), where('userId', '==', userId)))
        ]);

        const employees = usersSnapshot.docs.map(doc => ({
          ...doc.data(),
          idType: 'employee',
          originalRole: doc.data().role,
          phone: doc.id,
          originalCollection: 'users_01'
        }));

        const customers = customersSnapshot.docs.map(doc => ({
          ...doc.data(),
          idType: 'customer',
          role: 'customer',
          phone: doc.id,
          originalCollection: 'customers'
        }));

        const allProfiles = [...employees, ...customers];

        if (allProfiles.length > 1) {
          setDuplicateProfiles(allProfiles);
          return;
        }

        if (allProfiles.length === 0) {
          setError('User not found');
          return;
        }

        const profile = allProfiles[0];
        setUser(profile);
        setFormData(prev => ({
          ...prev,
          ...profile,
          bank_details: profile.bank_details || {},
          customerID: profile.customerID || '',
          employeeID: profile.employeeID || '',
          role: profile.originalCollection === 'customers' ? 'customer' : profile.role
        }));
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load user data');
      }
    };

    fetchUser();
  }, [userId]);

  // Track employee changes
  const trackEmployeeChanges = (originalData, newData) => {
    const changes = [];
    const fieldsToTrack = [
      'name', 'email', 'phone', 'address', 'dob', 'document_number',
      'member_since', 'shareCode', 'employeeID', 'role'
    ];

    fieldsToTrack.forEach(field => {
      const oldValue = originalData[field] ?? null;
      const newValue = newData[field] ?? null;

      if (oldValue !== newValue) {
        changes.push({
          field,
          oldValue,
          newValue,
          changedAt: new Date().toISOString(),
          changedBy: 'admin'
        });
      }
    });

    const bankFields = ['account_number', 'bank_name', 'branch_name', 'ifsc_code'];
    bankFields.forEach(field => {
      const originalValue = originalData.bank_details?.[field] || '';
      const newValue = newData.bank_details?.[field] || '';

      if (originalValue !== newValue) {
        changes.push({
          field: `bank_details.${field}`,
          oldValue: originalValue,
          newValue: newValue,
          changedAt: new Date().toISOString(),
          changedBy: 'admin'
        });
      }
    });

    return changes;
  };

  // Handle profile selection for duplicates
  const handleProfileSelection = (selectedProfile) => {
    setUser(selectedProfile);
    setDuplicateProfiles([]);
    setFormData(prev => ({
      ...prev,
      ...selectedProfile,
      bank_details: selectedProfile.bank_details || {},
      customerID: selectedProfile.customerID || '',
      employeeID: selectedProfile.employeeID || '',
      role: selectedProfile.originalCollection === 'customers' ? 'customer' : selectedProfile.role
    }));
  };

  // Open edit dialog
  const handleEdit = () => setIsEditOpen(true);

  // Handle phone change confirmation
  const handlePhoneChangeAlertConfirm = () => {
    setIsPhoneChangeAlertOpen(false);
    setIsEditOpen(false);
    // Pass only the old phone number to ChangePhoneNumber
    navigate('/admin/user/changephoneNumber', { state: { oldPhone: user.phone } });
  };

  // Save user data
  const handleSave = async () => {
    try {
      const requiredFields = {
        name: 'Name is required',
        email: 'Email is required',
        phone: 'Phone number is required',
        role: 'Role is required'
      };

      for (const [field, message] of Object.entries(requiredFields)) {
        if (!formData[field]) {
          setError(message);
          return;
        }
      }

      if (formData.role === 'customer' && !formData.customerID) {
        setError('Customer ID is required');
        return;
      }

      if (formData.role !== 'customer' && !formData.employeeID) {
        setError('Employee ID is required');
        return;
      }

      // Check if phone number has changed
      if (formData.phone !== user.phone) {
        setNewPhoneNumber(formData.phone);
        setIsPhoneChangeAlertOpen(true);
        return;
      }

      const [customerDoc, employeeDoc] = await Promise.all([
        getDoc(doc(db, 'customers', formData.phone)),
        getDoc(doc(db, 'users_01', formData.phone))
      ]);

      const updates = [];
      let employeeChanges = [];
      let isConvertingToCustomer = false;

      const commonData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        dob: formData.dob,
        document_number: formData.document_number,
        bank_details: formData.bank_details,
        member_since: formData.member_since || new Date().toISOString(),
        shareCode: formData.shareCode,
        updatedAt: new Date(),
        userId: formData.userId
      };

      // Handle Customer Updates/Creation
      if (customerDoc.exists()) {
        const existingCustomerData = customerDoc.data();
        const customerUpdate = {
          ...commonData,
          role: 'customer',
          customerID: formData.role === 'customer'
            ? formData.customerID
            : existingCustomerData.customerID
        };
        delete customerUpdate.employeeID;
        delete customerUpdate.changeField;

        updates.push(
          updateDoc(doc(db, 'customers', formData.phone), customerUpdate)
        );
      }

      // Handle Employee Updates/Creation
      if (employeeDoc.exists()) {
        const existingEmployeeData = employeeDoc.data();
        const employeeUpdate = {
          ...commonData,
          role: formData.role !== 'customer' ? formData.role : existingEmployeeData.role,
          employeeID: formData.role !== 'customer'
            ? formData.employeeID
            : existingEmployeeData.employeeID
        };

        // Always track changes for employee documents
        employeeChanges = trackEmployeeChanges(existingEmployeeData, employeeUpdate);
        if (employeeChanges.length > 0) {
          employeeUpdate.changeField = arrayUnion(...employeeChanges);
        }

        updates.push(
          updateDoc(doc(db, 'users_01', formData.phone), employeeUpdate)
        );
      }

      // Handle new document creation
      if (!customerDoc.exists() && formData.role === 'customer') {
        const customerData = {
          ...commonData,
          role: 'customer',
          customerID: formData.customerID
        };
        delete customerData.employeeID;
        delete customerData.changeField;

        updates.push(
          setDoc(doc(db, 'customers', formData.phone), customerData)
        );
      }

      if (!employeeDoc.exists() && formData.role !== 'customer') {
        const empQuery = query(collection(db, 'users_01'),
          where('employeeID', '==', formData.employeeID));
        const empSnapshot = await getDocs(empQuery);

        if (!empSnapshot.empty) {
          setError('Employee ID already exists');
          return;
        }

        const employeeData = {
          ...commonData,
          role: formData.role,
          employeeID: formData.employeeID,
          changeField: arrayUnion(...trackEmployeeChanges({}, formData))
        };

        updates.push(
          setDoc(doc(db, 'users_01', formData.phone), employeeData)
        );
      }

      // Handle role conversions
      if (formData.role === 'customer' && employeeDoc?.exists()) {
        updates.push(
          updateDoc(doc(db, 'users_01', formData.phone), {
            status: 'archived',
            archivedAt: new Date(),
            originalRole: employeeDoc.data().role
          })
        );
        isConvertingToCustomer = true;
      }

      if (formData.role !== 'customer' && customerDoc?.exists()) {
        updates.push(
          updateDoc(doc(db, 'customers', formData.phone), {
            status: 'converted-to-employee',
            convertedAt: new Date()
          })
        );
      }

      await Promise.all(updates);

      // Update local state with the latest changes
      setUser(prev => ({
        ...prev,
        ...formData,
        changeField: employeeDoc.exists()
          ? [...(prev.changeField || []), ...employeeChanges]
          : prev.changeField || [],
        originalRole: isConvertingToCustomer ? employeeDoc.data().role : prev.originalRole
      }));

      setSuccessMessage('User updated successfully!');
      setTimeout(() => navigate('/admin/users'), 1000);
    } catch (err) {
      console.error('Update error:', err);
      setError(`Failed to update user: ${err.message}`);
    }
  };

  // Display changes with awareness
  const ChangeAwareDisplay = ({ field, value, changes }) => {
    if (!changes || changes.length === 0) return <span>{displayValue(value)}</span>;

    const latestChange = changes
      .filter(c => c.field === field || c.field.startsWith(`${field}.`))
      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))[0];

    if (!latestChange) return <span>{displayValue(value)}</span>;

    return (
      <div className="flex items-center gap-2">
        <span>{displayValue(latestChange.newValue)}</span>
        <span className="text-green-600 text-sm font-medium">(new)</span>
      </div>
    );
  };

  // Render duplicate profiles
  if (duplicateProfiles.length > 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-red-600">Duplicate Profiles Found</h2>
          <p className="text-gray-600">Select which profile to view:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duplicateProfiles.map((profile, index) => (
              <button
                key={index}
                onClick={() => handleProfileSelection(profile)}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {profile.idType === 'customer' ? '👤 Customer' : '👨‍💼 Employee'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(profile.member_since).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Phone: {profile.phone}</p>
                  <p className="text-sm">
                    ID: {profile.idType === 'customer' ? profile.customerID : profile.employeeID}
                  </p>
                  <p className="text-sm">Role: <span className="capitalize">{profile.role}</span></p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!user) return <div className="p-4 text-center">Loading...</div>;

  // Main render
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
         <button
            onClick={() => navigate(-1)}
            className="ml-auto mr-2 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          >
            Go Back
          </button>
        <button
          onClick={handleEdit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Edit User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <p className="mt-1 font-mono">{displayValue(user.userId)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {user.idType === 'customer' ? 'Customer ID' : 'Employee ID'}
            </label>
            <p className="mt-1 font-mono">
              {displayValue(user.idType === 'customer' ? user.customerID : user.employeeID)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="name"
                value={user.name}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="email"
                value={user.email}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <p className="mt-1">{displayValue(user.phone)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 capitalize">{displayValue(user.role)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="address"
                value={user.address}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="dob"
                value={user.dob}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Document Number</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="document_number"
                value={user.document_number}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Since</label>
            <p className="mt-1">{displayValue(new Date(user.member_since).toLocaleDateString())}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Share Code</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="shareCode"
                value={user.shareCode}
                changes={user?.changeField || []}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.bank_name"
                value={user.bank_details?.bank_name}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.account_number"
                value={user.bank_details?.account_number}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Branch Name</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.branch_name"
                value={user.bank_details?.branch_name}
                changes={user?.changeField || []}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
            <div className="mt-1">
              <ChangeAwareDisplay
                field="bank_details.ifsc_code"
                value={user.bank_details?.ifsc_code}
                changes={user?.changeField || []}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Transition appear show={isEditOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsEditOpen(false)}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">Edit User</Dialog.Title>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name*</label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email*</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone*</label>
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Role*</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="customer">Customer</option>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="teamleader">Team Leader</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {formData.role === 'customer' ? (
                      <div>
                        <label className="block text-sm font-medium mb-1">Customer ID*</label>
                        <input
                          value={formData.customerID}
                          onChange={(e) => setFormData({ ...formData, customerID: e.target.value })}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-1">Employee ID*</label>
                        <input
                          value={formData.employeeID}
                          onChange={(e) => setFormData({ ...formData, employeeID: e.target.value })}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Document Number</label>
                      <input
                        value={formData.document_number}
                        onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Share Code</label>
                      <input
                        value={formData.shareCode}
                        onChange={(e) => setFormData({ ...formData, shareCode: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bank Name</label>
                      <input
                        value={formData.bank_details.bank_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: { ...formData.bank_details, bank_name: e.target.value }
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Number</label>
                      <input
                        value={formData.bank_details.account_number}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: { ...formData.bank_details, account_number: e.target.value }
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Branch Name</label>
                      <input
                        value={formData.bank_details.branch_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: { ...formData.bank_details, branch_name: e.target.value }
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IFSC Code</label>
                      <input
                        value={formData.bank_details.ifsc_code}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_details: { ...formData.bank_details, ifsc_code: e.target.value }
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setIsEditOpen(false)}
                      className="px-4 py-2 border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Phone Change Alert Dialog */}
      <Transition appear show={isPhoneChangeAlertOpen} as={Fragment}>
        <Dialog as="div" className="relative z-20" onClose={() => setIsPhoneChangeAlertOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-bold mb-4">Phone Number Change Detected</Dialog.Title>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      You have changed the phone number from {user?.phone} to {newPhoneNumber}. 
                      Do you want to proceed with the phone number change?
                    </p>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setIsPhoneChangeAlertOpen(false)}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePhoneChangeAlertConfirm}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default UserDetails;
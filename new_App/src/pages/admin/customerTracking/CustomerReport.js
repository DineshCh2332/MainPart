import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import "../../../css/CustomerReport.css";

const CustomerReport = () => {
  // State declarations
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerKOTs, setCustomerKOTs] = useState([]);
  const [customerReports, setCustomerReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Currency formatting helper
  const formatCurrency = (value) => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Fetch all customers on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'customers'));
        const querySnapshot = await getDocs(q);
        
        const customersData = [];
        querySnapshot.forEach((doc) => {
          customersData.push({ customerID: doc.id, ...doc.data() });
        });
        
        setCustomers(customersData);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch customer data when selected
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!selectedCustomer) return;

      try {
        setLoading(true);
        
        // 1. Fetch KOTs for this customer
        const kotsQuery = query(
          collection(db, 'KOT'),
          where('customerID', '==', selectedCustomer.customerID)
        );
        const kotsSnapshot = await getDocs(kotsQuery);
        
        const kotsData = [];
        kotsSnapshot.forEach((doc) => {
          kotsData.push({ id: doc.id, ...doc.data() });
        });
        setCustomerKOTs(kotsData);

        // 2. Fetch reports related to these KOTs
        if (kotsData.length > 0) {
          // Create array of KOT paths like "/KOT/050525081"
          const kotPaths = kotsData.map(kot => `/KOT/${kot.id}`);
          
          const reportsQuery = query(
            collection(db, 'Reports'),
            where('kot_id', 'in', kotPaths) // Now searching for full paths
          );
          
          const reportsSnapshot = await getDocs(reportsQuery);
          const reportsData = reportsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          
          setCustomerReports(reportsData);
        } else {
          setCustomerReports([]);
        }
      } catch (err) {
        console.error('Error fetching customer data:', err);
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [selectedCustomer]);

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.customerID === customerId);
    setSelectedCustomer(customer || null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="customer-report-container">
      <h1 className="text-2xl font-bold mb-6">Customer Report System</h1>
      
      <div className="customer-select-container">
        <div className="flex items-center gap-4 mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Customer:
          </label>
          {selectedCustomer && (
            <div className="bg-blue-50 px-3 py-1 rounded-full text-sm font-medium text-blue-800">
              Selected: {selectedCustomer.name}
            </div>
          )}
        </div>
        <select
          onChange={(e) => handleCustomerSelect(e.target.value)}
          className="customer-select"
          disabled={loading}
          value={selectedCustomer?.customerID || ""}
        >
          <option value="">-- Select a customer --</option>
          {customers.map(customer => (
            <option key={customer.customerID} value={customer.customerID}>
              {customer.name} ({customer.customerID})
            </option>
          ))}
        </select>
      </div>

      {selectedCustomer && (
        <div className="space-y-8">
          {/* Customer Details Section */}
          <div className="report-section">
            <h2 className="section-title">Customer Details</h2>
            <div className="customer-details-grid">
              <div className="detail-item">
                <p className="detail-label">Name</p>
                <p className="detail-value">{selectedCustomer.name}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Phone</p>
                <p className="detail-value">{selectedCustomer.phone}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Email</p>
                <p className="detail-value">{selectedCustomer.email || 'N/A'}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Customer ID</p>
                <p className="detail-value">{selectedCustomer.customerID}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Credit Points</p>
                <p className="detail-value">{selectedCustomer.earnedPoints || 0}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Member Since</p>
                <p className="detail-value">{selectedCustomer.member_since || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* KOT Transactions Section */}
         {/* KOT Transactions Section */}
<div className="report-section">
  <h2 className="section-title">KOT Transactions</h2>
  {customerKOTs.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>KOT ID</th>
            <th>Date/Time</th>
            <th>Total Amount</th>
            <th>Cash Paid</th>
            <th>Credits Used</th>
            <th>Items</th>
            <th>Quantity</th>
            <th>Item Price</th>
            <th>Item Total</th>
          </tr>
        </thead>
        <tbody>
          {customerKOTs.flatMap((kot) => 
            kot.items?.map((item, index) => (
              <tr key={`${kot.id}-${index}`}>
                {index === 0 && (
                  <>
                    <td rowSpan={kot.items?.length || 1}>{kot.id}</td>
                    <td rowSpan={kot.items?.length || 1}>
                      {kot.date?.toDate ? kot.date.toDate().toLocaleString() : kot.date}
                    </td>
                    <td rowSpan={kot.items?.length || 1}>${formatCurrency(kot.amount)}</td>
                    <td rowSpan={kot.items?.length || 1}>${formatCurrency(kot.cashPaid)}</td>
                    <td rowSpan={kot.items?.length || 1}>${formatCurrency(kot.creditsUsed)}</td>
                  </>
                )}
                <td>{item.name || item.id}</td>
                <td>{item.quantity || 0}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency((item.price || 0) * (item.quantity || 0))}</td>
              </tr>
            )) || [(
              <tr key={kot.id}>
                <td>{kot.id}</td>
                <td>{kot.date?.toDate ? kot.date.toDate().toLocaleString() : kot.date}</td>
                <td>${formatCurrency(kot.amount)}</td>
                <td>${formatCurrency(kot.cashPaid)}</td>
                <td>${formatCurrency(kot.creditsUsed)}</td>
                <td colSpan="4">No items found</td>
              </tr>
            )]
          )}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty-state">
      No KOT transactions found for this customer.
    </div>
  )}
</div>

          {/* Reports Section */}
{/* Reports Section */}
<div className="report-section">
  <h2 className="section-title">Related Reports</h2>
  {customerReports.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Linked KOT</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          {customerReports.map((report, reportIndex) => {
            // Create absolutely unique keys for every element
            const reportKeyBase = report.id || `report-${reportIndex}`;
            
            return (
              <tr key={`${reportKeyBase}-row`}>
                <td>{report.id}</td>
                <td>
                  {report.TransactionDate?.toDate?.().toLocaleString() || 'N/A'}
                </td>
                <td>${formatCurrency(report.Amount || 0)}</td>
                <td>
                  {report.kot_id ? report.kot_id.split('/').pop() : 'N/A'}
                </td>
                <td>
                  {report.item_id ? (
                    <ul className="list-disc pl-5">
                      {Object.entries(report.item_id).map(([key, item], itemIndex) => {
                        const itemKey = `${reportKeyBase}-item-${key}-${itemIndex}`;
                        return (
                          <li key={itemKey}>
                            {item.id}: {item.quantity} × ${formatCurrency(item.price || 0)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    'No items data'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty-state">
      {customerKOTs.length > 0 
        ? "No reports found for these KOTs" 
        : "No KOTs found to search for reports"}
    </div>
  )}
</div>
        </div>
      )}
    </div>
  );
};

export default CustomerReport;
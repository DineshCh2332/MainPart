import React, { useEffect, useState } from "react";
import { db } from "../../../firebase/config";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  getDoc
} from "firebase/firestore";
import "../../../css/Reports.css";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="error-fallback">Something went wrong with this report.</div>;
    }
    return this.props.children;
  }
}

const Reports = () => {
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "Reports"), orderBy("TransactionDate", "desc"));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const reports = [];
        
        for (const doc of querySnapshot.docs) {
          try {
            const data = doc.data();
            
            // Safely process items
            const processedItems = [];
            const items = Array.isArray(data?.item_id) ? data.item_id : [];
            
            for (const item of items) {
              try {
                let kotId = "N/A";
                
                // Handle all possible kot_id formats
                if (item?.kot_id) {
                  if (typeof item.kot_id === "object" && item.kot_id.path) {
                    const kotDoc = await getDoc(item.kot_id);
                    kotId = kotDoc.exists() ? kotDoc.id : "N/A";
                  } else if (typeof item.kot_id === "string") {
                    kotId = item.kot_id.split("/KOT/").pop() || item.kot_id;
                  }
                }

                processedItems.push({
                  id: String(item?.id || "N/A"),
                  quantity: Number(item?.quantity) || 0,
                  kotId: String(kotId)
                });
              } catch (itemError) {
                console.error("Error processing item:", itemError);
                processedItems.push({
                  id: "ERROR",
                  quantity: 0,
                  kotId: "ERROR"
                });
              }
            }

            reports.push({
              id: doc.id,
              Amount: Number(data?.Amount) || 0,
              TransactionDate: data?.TransactionDate?.toDate?.()?.toLocaleString() || 
                            String(data?.TransactionDate || "No date"),
              items: processedItems
            });
          } catch (docError) {
            console.error("Error processing document:", docError);
          }
        }
        
        setReportsData(reports);
        setError(null);
      } catch (mainError) {
        console.error("Main error:", mainError);
        setError("Failed to load reports");
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      setError("Real-time connection failed");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="loading">Loading reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="reports-container">
      <h2>Reports</h2>
      
      <table className="reports-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Amount (₹)</th>
            <th>Transaction Date</th>
            <th>Linked KOT</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          {reportsData.length > 0 ? (
            reportsData.map((report) => (
              <ErrorBoundary key={report.id}>
                <tr>
                  <td>{report.id}</td>
                  <td>₹{report.Amount.toFixed(2)}</td>
                  <td>{report.TransactionDate}</td>
                  <td>
                    {report.items.map((item, idx) => (
                      <div key={`${report.id}-kot-${idx}`}>
                        {item.kotId}
                      </div>
                    ))}
                  </td>
                  <td>
                    {report.items.map((item, idx) => (
                      <div key={`${report.id}-item-${idx}`}>
                        {item.id} (x{item.quantity})
                      </div>
                    ))}
                  </td>
                </tr>
              </ErrorBoundary>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>
                No reports found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Reports;
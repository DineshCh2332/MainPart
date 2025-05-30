import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from "../../../firebase/config";
import dayjs from 'dayjs';

const MoneyMovementPage = () => {
  const [movements, setMovements] = useState([]);
  const [range, setRange] = useState({
    from: dayjs().startOf('day'),
    to: dayjs().endOf('day'),
  });

  const fetchMovements = async () => {
    const q = query(
      collection(db, 'moneyMovement'),
      where('timestamp', '>=', Timestamp.fromDate(range.from.toDate())),
      where('timestamp', '<=', Timestamp.fromDate(range.to.toDate())),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setMovements(data);
  };

  useEffect(() => {
    fetchMovements();
  }, [range]);

  const totalIn = movements.filter(m => m.direction === 'in').reduce((sum, m) => sum + m.amount, 0);
  const totalOut = movements.filter(m => m.direction === 'out').reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Money Movement Report</h1>

      <div className="flex gap-4 items-center">
        <label>From:</label>
        <input
          type="date"
          value={range.from.format('YYYY-MM-DD')}
          onChange={e =>
            setRange(r => ({
              ...r,
              from: dayjs(e.target.value).startOf('day'),
            }))
          }
          className="border px-2 py-1 rounded"
        />
        <label>To:</label>
        <input
          type="date"
          value={range.to.format('YYYY-MM-DD')}
          onChange={e =>
            setRange(r => ({
              ...r,
              to: dayjs(e.target.value).endOf('day'),
            }))
          }
          className="border px-2 py-1 rounded"
        />
      </div>

      <div className="overflow-auto border rounded shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100 text-sm text-left">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Amount (£)</th>
              <th className="px-4 py-2">Direction</th>
              <th className="px-4 py-2">Session</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} className="border-t hover:bg-gray-50 text-sm">
                <td className="px-4 py-2">{dayjs(m.timestamp.toDate()).format('YYYY-MM-DD HH:mm')}</td>
                <td className="px-4 py-2 capitalize">{m.type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2">{m.amount?.toFixed(2) ?? '0.00'}</td>
                <td className={`px-4 py-2 ${m.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                  {m.direction.toUpperCase()}
                </td>
                <td className="px-4 py-2">{m.session ?? '—'}</td>
                <td className="px-4 py-2">{m.userId}</td>
                <td className="px-4 py-2">{m.note}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold text-sm">
              <td className="px-4 py-2" colSpan="2">Totals:</td>
              <td className="px-4 py-2 text-green-700">{totalIn.toFixed(2)} IN</td>
              <td className="px-4 py-2 text-red-700">{totalOut.toFixed(2)} OUT</td>
              <td colSpan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MoneyMovementPage;

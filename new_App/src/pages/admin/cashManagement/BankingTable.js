import React from 'react';

function BankingTable({ denominations, values, onChange, actualAmount, onActualChange, expectedAmount, variance, readOnly }) {
  return (
    // The immediate parent div will handle rounded corners and shadow
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-purple-100 text-purple-800"> {/* Light purple header */}
         <tr>
          <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Denomination</th>
            <th className="px-6 py-3 text-center text-sm font-semibold tracking-wide">Loose</th>
            <th className="px-6 py-3 text-right text-sm font-semibold tracking-wide">Value</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {denominations.map((denom, index) => (
            <tr key={index} className="hover:bg-purple-50 transition"> {/* Alternating row background (hover) */}
              <td className="px-6 py-4 text-sm text-gray-800">{denom.name}</td>
              <td className="px-6 py-4 text-center">
                <input
                  type="number"
                  className="w-24 text-center px-3 py-1 border border-gray-300 rounded-md focus:ring-purple-400 focus:border-purple-400"
                  value={values[index]?.loose}
                  onChange={(e) => onChange(index, 'loose', e.target.value)}
                  disabled={readOnly}
                />
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-800">£{values[index]?.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end space-x-6 mt-6 p-4"> {/* Added padding to totals container */}
        <div className="text-gray-700">
          <p className="text-sm"><strong>Expected Amount:</strong> <span className="font-semibold">£{(expectedAmount ?? 0).toFixed(2)}</span></p>
        </div>
        <div className="text-gray-700">
          <p className="text-sm"><strong>Actual Total:</strong> <span className="font-semibold">£{actualAmount.toFixed(2)}</span></p>
        </div>
        <div className="text-gray-700">
          <p className="text-sm"><strong>Variance:</strong> <span className="font-semibold">£{variance.toFixed(2)}</span></p>
        </div>
      </div>
    </div>
  );
}

export default BankingTable;
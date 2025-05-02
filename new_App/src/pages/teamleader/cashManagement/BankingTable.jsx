import React from 'react';

function BankingTable({ denominations, values, onChange, actualAmount, onActualChange, expectedAmount, variance, readOnly }) {
  return (
    <div>
      <table className="banking-table">
        <thead>
          <tr>
            <th>Denomination</th>
            <th>Loose</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {denominations.map((denom, index) => (
            <tr key={index}>
              <td>{denom.name}</td>
              <td>
                <input
                  type="number"
                  value={values[index]?.loose}
                  onChange={(e) => onChange(index, 'loose', e.target.value)}
                  disabled={readOnly}
                />
              </td>
              <td>{values[index]?.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div>
        <p><strong>Expected Amount:</strong> £{(expectedAmount ?? 0).toFixed(2)}</p>
        </div>
        <div>
        <p><strong>Actual Total: </strong>£{actualAmount.toFixed(2)}</p>
        </div>
        <div>
          <strong>Variance:</strong> £{variance.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

export default BankingTable;

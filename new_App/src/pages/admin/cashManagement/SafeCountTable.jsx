import React from 'react';

function SafeCountTable({ denominations, values, onChange, actualAmount, onActualChange, expectedAmount, variance, readOnly }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Denomination</th>
          <th>Bags</th>
          <th>Loose Notes</th>
          <th>Value (£)</th>
        </tr>
      </thead>
      <tbody>
        {denominations.map((denom, index) => (
          <tr key={denom.name}>
            <td>{denom.name}</td>
            <td>
              <input
                type="number"
                min="0"
                value={values[index]?.bags ?? 0}
                onChange={(e) => onChange(index, 'bags', e.target.value)}
                disabled={readOnly}
              />
            </td>
            <td>
              <input
                type="number"
                min="0"
                value={values[index]?.loose ?? 0}
                onChange={(e) => onChange(index, 'loose', e.target.value)}
                disabled={readOnly}
              />
            </td>
            <td>{(values[index]?.value ?? 0).toFixed(2)}</td>
          </tr>
        ))}

        <tr>
          <td colSpan="3"><strong>Expected Amount (£)</strong></td>
          <td><strong>{expectedAmount.toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td colSpan="3"><strong>Actual Amount (£)</strong></td>
          <td>
            <input
              type="number"
              min="0"
              value={actualAmount}
              onChange={onActualChange}
              disabled={readOnly}
            />
          </td>
        </tr>
        <tr>
          <td colSpan="3"><strong>Variance (£)</strong></td>
          <td><strong>{variance.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>
  );
}

export default SafeCountTable;

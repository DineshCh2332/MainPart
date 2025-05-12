// TransferFloats.js
import React from 'react';

const TransferFloats = ({ values, setValues, setShowTransferFloats }) => {
  const handleChange = (index, event) => {
    const updatedValues = [...values];
    updatedValues[index].bags = parseInt(event.target.value) || 0;
    updatedValues[index].value = updatedValues[index].bags * values[index].bagValue;
    setValues(updatedValues);
  };

  const handleSubmit = () => {
    // Handle float transfer (e.g., update the state or submit to Firebase)
    alert('Floats transferred!');
    setShowTransferFloats(false); // Optionally hide the table after transfer
  };

  return (
    <div>
      <h3>Transfer Floats</h3>
      <table>
        <thead>
          <tr>
            <th>Denomination</th>
            <th>Bags</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {values.map((denomination, index) => (
            <tr key={index}>
              <td>{denomination.name}</td>
              <td>
                <input
                  type="number"
                  value={denomination.bags}
                  onChange={(event) => handleChange(index, event)}
                />
              </td>
              <td>{denomination.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSubmit}>Transfer Floats</button>
      <button onClick={handleCancelTransferFloats}>Back to Safe Count</button>
    </div>
  );
};

export default TransferFloats;

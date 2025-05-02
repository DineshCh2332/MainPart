import React from 'react';

function BankingAuthorizationForm({
  witnessName, setWitnessName,
  shiftRunnerName, setShiftRunnerName,
  isAuthorized, setIsAuthorized,
}) {
  const handleWitnessAuth = (e) => {
    setIsAuthorized({ ...isAuthorized, witness: e.target.checked });
  };

  const handleShiftRunnerAuth = (e) => {
    setIsAuthorized({ ...isAuthorized, shiftRunner: e.target.checked });
  };

  const handleWitnessNameChange = (e) => {
    setWitnessName(e.target.value);
  };

  const handleShiftRunnerNameChange = (e) => {
    setShiftRunnerName(e.target.value);
  };

  return (
    <div className="banking-authorization-form">
      <h3>Authorization</h3>
      <div>
        <label>
          Employee ID:
          <input
            type="text"
            value={witnessName}
            onChange={handleWitnessNameChange}
            placeholder="Enter Employee's ID"
          />
        </label>
        <label>
          Employee Authorized:
          <input
            type="checkbox"
            checked={isAuthorized.witness}
            onChange={handleWitnessAuth}
          />
        </label>
      </div>
      <div>
        <label>
          Manager's ID:
          <input
            type="text"
            value={shiftRunnerName}
            onChange={handleShiftRunnerNameChange}
            placeholder="Enter Manager's ID"
          />
        </label>
        <label>
          Manager Authorized:
          <input
            type="checkbox"
            checked={isAuthorized.shiftRunner}
            onChange={handleShiftRunnerAuth}
          />
        </label>
      </div>
    </div>
  );
}

export default BankingAuthorizationForm;

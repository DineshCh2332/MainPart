import React from 'react';

function AuthorizationForm({ cashierName, setCashierName, managerName, setManagerName, isAuthorized, setIsAuthorized, disabled }) {
  return (
    <div className="authorization-form">
      <input type="text" placeholder="Cashier Name" value={cashierName} onChange={e => setCashierName(e.target.value)} disabled={disabled} />
      <input type="text" placeholder="Manager Name" value={managerName} onChange={e => setManagerName(e.target.value)} disabled={disabled} />
      <label>
        <input type="checkbox" checked={isAuthorized.cashier} onChange={e => setIsAuthorized(prev => ({ ...prev, cashier: e.target.checked }))} disabled={disabled} />
        Cashier Authorization
      </label>
      <label>
        <input type="checkbox" checked={isAuthorized.manager} onChange={e => setIsAuthorized(prev => ({ ...prev, manager: e.target.checked }))} disabled={disabled} />
        Manager Authorization
      </label>
    </div>
  );
}

export default AuthorizationForm;

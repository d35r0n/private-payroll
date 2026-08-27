import React, { useState } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { PRESET_WALLETS } from '../hooks/useWallet';
import { PlusCircle, CheckCircle, AlertTriangle } from 'lucide-react';

type CreateRoundProps = {
  currentAddress: string;
  onCreated?: () => void;
};

export const CreateRound: React.FC<CreateRoundProps> = ({
  currentAddress,
  onCreated,
}) => {
  const { createRound, payrollState, loading, error, clearError } = usePayroll();

  const [budget, setBudget] = useState<string>('10000');
  const [recipients, setRecipients] = useState<string[]>([
    PRESET_WALLETS[1].address,
    PRESET_WALLETS[2].address,
    PRESET_WALLETS[3].address,
    PRESET_WALLETS[4].address,
  ]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRecipientChange = (index: number, val: string) => {
    const next = [...recipients];
    next[index] = val;
    setRecipients(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg(null);

    const budgetVal = BigInt(budget.replace(/,/g, ''));
    if (budgetVal <= 0n) {
      alert('Please enter a positive budget amount.');
      return;
    }

    try {
      await createRound(budgetVal, currentAddress, recipients);
      setSuccessMsg(`Round initialized successfully with ${budgetVal.toLocaleString()} DUST budget!`);
      if (onCreated) onCreated();
    } catch (err: any) {
      // handled by usePayroll
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Create Payout Round</span>
        <span className="badge badge-info">Step 1 of 3 (Employer)</span>
      </div>

      {payrollState && (
        <div className="callout callout-warning" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Active Round Detected:</strong> A payout round is already active on-chain (Budget: {payrollState.budget.toLocaleString()} DUST, Status: {payrollState.status}). Creating a new round will reinitialize the session.
          </div>
        </div>
      )}

      {error && (
        <div className="callout" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: '#fca5a5', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="callout callout-success" style={{ marginBottom: '20px' }}>
          <CheckCircle size={18} />
          <div>{successMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Total Public Budget (DUST)</label>
          <input
            type="number"
            className="form-input"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 10000"
            required
            min="1"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            The total public budget funded by the employer. The sum of all 4 individual allocations must match this exactly.
          </span>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '12px', fontWeight: 600, fontSize: '0.9rem' }}>
          Recipient Public Addresses (4 Slots)
        </div>

        <div className="grid-2">
          {recipients.map((addr, idx) => (
            <div key={idx} className="form-group">
              <label className="form-label">
                Recipient {idx + 1} ({PRESET_WALLETS[idx + 1]?.name || `Slot ${idx + 1}`})
              </label>
              <input
                type="text"
                className="form-input"
                value={addr}
                onChange={(e) => handleRecipientChange(idx, e.target.value)}
                placeholder="midnight1_..."
                required
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            <PlusCircle size={16} />
            {loading ? 'Initializing On-Chain Round...' : 'Initialize Payout Round'}
          </button>
        </div>
      </form>
    </div>
  );
};

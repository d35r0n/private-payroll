import React, { useState, useEffect, useMemo } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import {
  generateSalt,
  bytesToHex,
  hexToBytes,
  pureCircuits,
  payrollService,
} from '../contractService';
import { PRESET_WALLETS } from '../hooks/useWallet';
import { Lock, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

type AssignAmountsProps = {
  currentAddress: string;
  onAllAssigned?: () => void;
};

export const AssignAmounts: React.FC<AssignAmountsProps> = ({
  currentAddress,
  onAllAssigned,
}) => {
  const { payrollState, assignAmount, loading, error, clearError } = usePayroll();

  // Local private inputs
  const [amounts, setAmounts] = useState<string[]>(['2500', '3500', '1800', '2200']);
  const [salts, setSalts] = useState<string[]>(() => [
    bytesToHex(generateSalt()),
    bytesToHex(generateSalt()),
    bytesToHex(generateSalt()),
    bytesToHex(generateSalt()),
  ]);

  const [assignedStatus, setAssignedStatus] = useState<boolean[]>([false, false, false, false]);
  const [activeStepMsg, setActiveStepMsg] = useState<string | null>(null);

  // Restore stored allocations on load
  useEffect(() => {
    const stored = payrollService.getStoredEmployerAllocations();
    const newAmounts = [...amounts];
    const newSalts = [...salts];
    const newStatus = [false, false, false, false];

    for (let i = 0; i < 4; i++) {
      if (stored[i]) {
        newAmounts[i] = stored[i].amount.toString();
        newSalts[i] = stored[i].saltHex;
        newStatus[i] = true;
      }
    }
    setAmounts(newAmounts);
    setSalts(newSalts);
    setAssignedStatus(newStatus);
  }, [payrollState]);

  // Client-side running total calculation for employer self-check (never transmitted)
  const runningTotal = useMemo(() => {
    return amounts.reduce((acc, curr) => {
      const val = BigInt(curr || '0');
      return acc + val;
    }, 0n);
  }, [amounts]);

  const budget = payrollState?.budget ?? 0n;
  const isSumMatching = runningTotal === budget;

  const handleAmountChange = (index: number, val: string) => {
    const next = [...amounts];
    next[index] = val;
    setAmounts(next);
    // Invalidate assignment status on change
    const nextStatus = [...assignedStatus];
    nextStatus[index] = false;
    setAssignedStatus(nextStatus);
  };

  const handleRegenerateSalt = (index: number) => {
    const next = [...salts];
    next[index] = bytesToHex(generateSalt());
    setSalts(next);
    const nextStatus = [...assignedStatus];
    nextStatus[index] = false;
    setAssignedStatus(nextStatus);
  };

  const handleAssignSingle = async (index: number) => {
    if (!payrollState) return;
    clearError();
    setActiveStepMsg(null);

    const amt = BigInt(amounts[index] || '0');
    const saltBytes = hexToBytes(salts[index]);

    try {
      await assignAmount(index, amt, saltBytes, currentAddress);
      const nextStatus = [...assignedStatus];
      nextStatus[index] = true;
      setAssignedStatus(nextStatus);
      setActiveStepMsg(`Recipient ${index + 1} commitment submitted successfully!`);
    } catch (err) {
      // handled
    }
  };

  const handleAssignAll = async () => {
    if (!payrollState) return;
    clearError();
    setActiveStepMsg(null);

    try {
      for (let i = 0; i < 4; i++) {
        const amt = BigInt(amounts[i] || '0');
        const saltBytes = hexToBytes(salts[i]);
        await assignAmount(i, amt, saltBytes, currentAddress);
      }
      setAssignedStatus([true, true, true, true]);
      setActiveStepMsg('All 4 recipient commitments successfully submitted on-chain!');
      if (onAllAssigned) onAllAssigned();
    } catch (err) {
      // handled
    }
  };

  if (!payrollState) {
    return (
      <div className="card">
        <div className="card-title">Assign Private Amounts</div>
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>Please create a payout round first before assigning amounts.</div>
        </div>
      </div>
    );
  }

  const isEmployer = payrollState.employer === currentAddress;

  if (!isEmployer) {
    return (
      <div className="card">
        <div className="card-title">Assign Private Amounts</div>
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>
            <strong>Access Restricted:</strong> Current wallet is not the employer of this round.
            <br />
            Employer: <span className="mono">{payrollState.employer}</span>
            <br />
            Current: <span className="mono">{currentAddress}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>Assign Private Amounts</span>
        <span className="badge badge-info">Step 2 of 3 (Employer)</span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
        Enter allocation amounts for each recipient. Each amount is blinded with a cryptographically secure client-side salt to generate a <strong>ZK commitment</strong>. The amounts remain private and are never broadcast on-chain.
      </p>

      {error && (
        <div className="callout" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: '#fca5a5', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {activeStepMsg && (
        <div className="callout callout-success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={18} />
          <div>{activeStepMsg}</div>
        </div>
      )}

      {/* Running Total Card - Local employer self check */}
      <div
        style={{
          background: isSumMatching ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${isSumMatching ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Client-Side Employer Running Total (Private Self-Check)
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>
            {runningTotal.toLocaleString()} / {budget.toLocaleString()} DUST
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {isSumMatching ? (
            <span className="badge badge-success">Sum Exactly Matches Budget</span>
          ) : (
            <span className="badge badge-warning">
              {runningTotal < budget
                ? `Short by ${(budget - runningTotal).toLocaleString()} DUST`
                : `Over by ${(runningTotal - budget).toLocaleString()} DUST`}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {payrollState.recipients.map((recip, idx) => {
          const saltBytes = hexToBytes(salts[idx]);
          const amt = BigInt(amounts[idx] || '0');
          const commitBytes = pureCircuits.computeCommitment(amt, saltBytes);
          const commitHex = bytesToHex(commitBytes);
          const isSlotAssigned = assignedStatus[idx] || recip.is_assigned;

          return (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Recipient {idx + 1}: <span className="mono" style={{ color: 'var(--text-muted)' }}>{recip.address}</span>
                </div>
                {isSlotAssigned ? (
                  <span className="badge badge-success">Assigned On-Chain</span>
                ) : (
                  <span className="badge badge-warning">Pending Submission</span>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Private Amount (DUST)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={amounts[idx]}
                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                    disabled={loading || payrollState.status === 'Finalized'}
                    placeholder="e.g. 2500"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Private Salt (32 bytes)</span>
                    <button
                      type="button"
                      onClick={() => handleRegenerateSalt(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={12} /> Regenerate
                    </button>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={salts[idx]}
                    readOnly
                    style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Public Commitment Hash:</strong> <span className="mono">{commitHex}</span>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleAssignSingle(idx)}
                  disabled={loading || isSlotAssigned || payrollState.status === 'Finalized'}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <Send size={14} />
                  {isSlotAssigned ? 'Re-Assign Commitment' : `Submit Slot ${idx + 1} Commitment`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          * Notice: Individual amounts and salts are saved in local private state for generating the ZK sum proof.
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAssignAll}
          disabled={loading || !isSumMatching || payrollState.status === 'Finalized'}
        >
          <Lock size={16} />
          {loading ? 'Submitting Commitments...' : 'Submit All 4 Commitments'}
        </button>
      </div>
    </div>
  );
};

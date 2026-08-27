import React, { useState, useEffect } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { payrollService, pureCircuits, hexToBytes, bytesToHex } from '../contractService';
import { Lock, CheckCircle2, AlertCircle, Key, DollarSign } from 'lucide-react';

type ClaimAmountProps = {
  currentAddress: string;
};

export const ClaimAmount: React.FC<ClaimAmountProps> = ({ currentAddress }) => {
  const { payrollState, claimAmount, loading, error, clearError } = usePayroll();

  const [claimAmountInput, setClaimAmountInput] = useState<string>('');
  const [claimSaltInput, setClaimSaltInput] = useState<string>('');
  const [successClaimedAmount, setSuccessClaimedAmount] = useState<bigint | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Find if current wallet is one of the 4 recipients
  const recipientIndex = payrollState?.recipients.findIndex(
    (r) => r.address === currentAddress,
  );

  const matchedRecipient =
    recipientIndex !== undefined && recipientIndex !== -1
      ? payrollState?.recipients[recipientIndex]
      : null;

  // Auto-fill demo credentials if employer stored them locally (for convenient testing across tabs/accounts)
  useEffect(() => {
    if (recipientIndex !== undefined && recipientIndex !== -1) {
      const stored = payrollService.getStoredEmployerAllocations();
      if (stored[recipientIndex]) {
        setClaimAmountInput(stored[recipientIndex].amount.toString());
        setClaimSaltInput(stored[recipientIndex].saltHex);
      }
    }
  }, [recipientIndex]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollState || recipientIndex === undefined || recipientIndex === -1) return;

    clearError();
    setSuccessMsg(null);

    const amt = BigInt(claimAmountInput.trim() || '0');
    const saltHex = claimSaltInput.trim();

    try {
      await claimAmount(recipientIndex, amt, saltHex, currentAddress);
      setSuccessClaimedAmount(amt);
      setSuccessMsg('Claim processed and authenticated successfully on-chain!');
    } catch (err: any) {
      // handled
    }
  };

  if (!payrollState) {
    return (
      <div className="card">
        <div className="card-title">Recipient Payout Claim</div>
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>No active payout round found.</div>
        </div>
      </div>
    );
  }

  if (recipientIndex === undefined || recipientIndex === -1) {
    return (
      <div className="card">
        <div className="card-title">Recipient Payout Claim</div>
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>
            <strong>Wallet Not Listed as Recipient:</strong> Current wallet (<span className="mono">{currentAddress}</span>) is not among the 4 assigned recipient addresses for this round.
            <br />
            Please switch to one of the recipient accounts using the wallet selector in the top bar.
          </div>
        </div>
      </div>
    );
  }

  const isFinalized = payrollState.status === 'Finalized';
  const isClaimed = matchedRecipient?.claimed || successClaimedAmount !== null;

  return (
    <div className="card">
      <div className="card-title">
        <span>Recipient Payout Claim</span>
        <span className="badge badge-info">Recipient Slot {recipientIndex + 1}</span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
        Claim your private allocation using your off-chain credentials (amount and secret salt). The contract runs the <strong>claim_amount</strong> ZK circuit to authenticate your claim without revealing your amount to observers.
      </p>

      {error && (
        <div className="callout" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: '#fca5a5', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="callout callout-success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={18} />
          <div>{successMsg}</div>
        </div>
      )}

      {!isFinalized && (
        <div className="callout callout-warning" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <div>
            <strong>Round in Progress:</strong> The employer is still assigning allocations and has not finalized the round. Claims will become active once finalization is complete.
          </div>
        </div>
      )}

      {isClaimed ? (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
            Payout Successfully Claimed!
          </h3>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '16px 0' }}>
            {successClaimedAmount !== null ? successClaimedAmount.toLocaleString() : (claimAmountInput ? BigInt(claimAmountInput).toLocaleString() : '---')} DUST
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto' }}>
            Your private allocation has been authenticated against your on-chain commitment hash. Observers see only that your slot has been marked as claimed (true), with zero amount visibility.
          </p>
        </div>
      ) : (
        <form onSubmit={handleClaim}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Your On-Chain Commitment Hash:
            </div>
            <div className="code-box">
              {matchedRecipient?.commitment_hash || 'Pending employer assignment...'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Private Allocation Amount (DUST)</label>
            <input
              type="number"
              className="form-input"
              value={claimAmountInput}
              onChange={(e) => setClaimAmountInput(e.target.value)}
              placeholder="e.g. 2500"
              required
              disabled={loading || !isFinalized}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Private Salt (32-byte hex string)</label>
            <input
              type="text"
              className="form-input"
              value={claimSaltInput}
              onChange={(e) => setClaimSaltInput(e.target.value)}
              placeholder="64 hex characters"
              required
              disabled={loading || !isFinalized}
            />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !isFinalized || !matchedRecipient?.is_assigned}
            >
              <DollarSign size={16} />
              {loading ? 'Submitting ZK Claim Proof...' : 'Submit Private Claim'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

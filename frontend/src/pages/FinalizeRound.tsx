import React, { useState } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { payrollService } from '../contractService';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

type FinalizeRoundProps = {
  currentAddress: string;
  onFinalized?: () => void;
};

export const FinalizeRound: React.FC<FinalizeRoundProps> = ({
  currentAddress,
  onFinalized,
}) => {
  const { payrollState, finalizeRound, loading, error, clearError } = usePayroll();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!payrollState) {
    return (
      <div className="card">
        <div className="card-title">Finalize Payout Round</div>
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>Please create a payout round first.</div>
        </div>
      </div>
    );
  }

  const isEmployer = payrollState.employer === currentAddress;
  const isAllAssigned = payrollState.assigned_count === 4;
  const isFinalized = payrollState.status === 'Finalized';

  const handleFinalize = async () => {
    clearError();
    setSuccessMsg(null);

    try {
      await finalizeRound(currentAddress);
      setSuccessMsg('ZK Sum Proof verified successfully! Round is now Finalized.');
      if (onFinalized) onFinalized();
    } catch (err: any) {
      // handled
    }
  };

  const storedAllocations = payrollService.getStoredEmployerAllocations();

  return (
    <div className="card">
      <div className="card-title">
        <span>Finalize Payout Round</span>
        <span className="badge badge-info">Step 3 of 3 (Employer)</span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
        Finalization triggers the <strong>prove_total</strong> ZK circuit. It proves that the 4 private amounts match the stored commitments and their sum exactly equals the public budget (<strong>{payrollState.budget.toLocaleString()} DUST</strong>), without disclosing any individual amount on-chain.
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

      {isFinalized ? (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <ShieldCheck size={48} color="#34d399" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#34d399', marginBottom: '8px' }}>
            Round Successfully Finalized
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '600px', margin: '0 auto' }}>
            The ZK Sum Proof has verified that all 4 allocations sum precisely to the public budget. Recipients may now privately query and claim their payouts.
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.9rem' }}>
              Finalization Checklist:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEmployer ? (
                  <CheckCircle2 size={16} color="#34d399" />
                ) : (
                  <AlertCircle size={16} color="#ef4444" />
                )}
                <span>Authenticated as Employer ({payrollState.employer.slice(0, 20)}...)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAllAssigned ? (
                  <CheckCircle2 size={16} color="#34d399" />
                ) : (
                  <AlertCircle size={16} color="#f59e0b" />
                )}
                <span>All 4 Recipient Commitments Assigned ({payrollState.assigned_count}/4)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {Object.keys(storedAllocations).length === 4 ? (
                  <CheckCircle2 size={16} color="#34d399" />
                ) : (
                  <AlertCircle size={16} color="#f59e0b" />
                )}
                <span>Private Witness Amounts & Salts Ready for ZK Proof Generation</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFinalize}
              disabled={loading || !isEmployer || !isAllAssigned}
            >
              <Sparkles size={16} />
              {loading ? 'Generating ZK Sum Proof...' : 'Generate ZK Proof & Finalize Round'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

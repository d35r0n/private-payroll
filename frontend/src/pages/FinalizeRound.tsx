import React, { useState } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { payrollService, matchAddress } from '../contractService';
import { NETWORK_CONFIG } from '../config';
import {
  ShieldCheck, Sparkles, CheckCircle2, AlertCircle, ExternalLink, Loader,
} from 'lucide-react';

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

type FinalizeRoundProps = {
  currentAddress: string;
  wallet?:        ConnectedAPI | null;
  isRealLace:     boolean;
  onFinalized?:   () => void;
};

export const FinalizeRound: React.FC<FinalizeRoundProps> = ({
  currentAddress,
  wallet,
  isRealLace,
  onFinalized,
}) => {
  const { payrollState, finalizeRound, loading, error, clearError } = usePayroll(wallet);
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

  const isEmployer   = matchAddress(payrollState.employer, currentAddress);
  const isAllAssigned = payrollState.assigned_count === 4;
  const isFinalized   = payrollState.status === 'Finalized';

  const handleFinalize = async () => {
    clearError();
    setSuccessMsg(null);

    try {
      await finalizeRound();
      setSuccessMsg('ZK Sum Proof generated and verified on-chain! Round is now Finalized.');
      if (onFinalized) onFinalized();
    } catch (err: any) {
      // handled by usePayroll
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
        Finalization submits the <strong>finalize_round</strong> circuit. The proof server
        generates a ZK proof that the 4 private amounts match stored commitments and sum
        exactly to the public budget (<strong>{payrollState.budget.toLocaleString()} DUST</strong>),
        without disclosing any individual amount on-chain.
      </p>

      {error && (
        <div className="callout" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: '#fca5a5', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="callout callout-info" style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <div>
            <strong>Generating ZK proof…</strong> The proof server is computing the sum proof.
            This may take 10–30 seconds. Please keep this tab open and await wallet confirmation.
          </div>
        </div>
      )}

      {successMsg && (
        <div className="callout callout-success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={18} />
          <div>
            <div>{successMsg}</div>
            {payrollState?.contractAddress && (
              <a
                href={`${NETWORK_CONFIG.explorerBaseUrl}/contracts/${payrollState.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#818cf8', fontSize: '0.85rem' }}
              >
                <ExternalLink size={14} />
                View on Midnight Explorer
              </a>
            )}
          </div>
        </div>
      )}

      {isFinalized ? (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
          <ShieldCheck size={48} color="#34d399" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#34d399', marginBottom: '8px' }}>
            Round Successfully Finalized
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '600px', margin: '0 auto' }}>
            The ZK Sum Proof has been verified on-chain. Recipients may now privately
            claim their payouts using their secret amount and salt.
          </p>
          {payrollState?.contractAddress && (
            <a
              href={`${NETWORK_CONFIG.explorerBaseUrl}/contracts/${payrollState.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: '#818cf8', fontSize: '0.85rem' }}
            >
              <ExternalLink size={14} />
              View Contract on Midnight Explorer
            </a>
          )}
        </div>
      ) : (
        <div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.9rem' }}>
              Finalization Checklist:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isRealLace
                  ? <CheckCircle2 size={16} color="#34d399" />
                  : <AlertCircle size={16} color="#ef4444" />}
                <span>{isRealLace ? 'Midnight Wallet (Lace / 1AM) connected' : 'Midnight Wallet (Lace / 1AM) required for on-chain submission'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEmployer
                  ? <CheckCircle2 size={16} color="#34d399" />
                  : <AlertCircle size={16} color="#ef4444" />}
                <span>Authenticated as Employer ({payrollState.employer.slice(0, 20)}...)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAllAssigned
                  ? <CheckCircle2 size={16} color="#34d399" />
                  : <AlertCircle size={16} color="#f59e0b" />}
                <span>All 4 Recipient Commitments Assigned ({payrollState.assigned_count}/4)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {Object.keys(storedAllocations).length === 4
                  ? <CheckCircle2 size={16} color="#34d399" />
                  : <AlertCircle size={16} color="#f59e0b" />}
                <span>Private Witness Amounts & Salts Ready for ZK Proof Generation</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFinalize}
              disabled={loading || !isEmployer || !isAllAssigned || !isRealLace}
            >
              <Sparkles size={16} />
              {loading ? 'Generating ZK Proof & Waiting for Lace…' : 'Generate ZK Proof & Finalize Round'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

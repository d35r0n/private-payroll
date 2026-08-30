import React, { useState } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { NETWORK_CONFIG } from '../config';
import { ShieldCheck, Search, AlertCircle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

type AuditPageProps = {
  wallet?: ConnectedAPI | null;
};

export const AuditPage: React.FC<AuditPageProps> = ({ wallet }) => {
  const { payrollState, verifyTotal, loading, error } = usePayroll(wallet);
  const [verificationResult, setVerificationResult] = useState<{
    performed: boolean;
    valid:     boolean;
    budget:    bigint;
  } | null>(null);

  const handleVerify = async () => {
    try {
      const res = await verifyTotal();
      setVerificationResult({ performed: true, valid: res.valid, budget: res.budget });
    } catch {
      // handled by usePayroll
    }
  };

  if (!payrollState) {
    return (
      <div className="card">
        <div className="card-title">Public Audit & Verification</div>
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>No active payroll round found on-chain to audit.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>Public Audit & Verification</span>
        <span className="badge badge-info">Auditor / Observer View</span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
        This page reads the live on-chain ledger state. Calling{' '}
        <strong>verify_total()</strong> reads the <code>sum_proof.valid</code> flag set
        by the ZK finalize circuit — confirming the sum of all disbursed allocations exactly
        matches the funded budget without exposing any individual split.
      </p>

      {/* Contract explorer link */}
      {payrollState.contractAddress && (
        <div style={{ marginBottom: '20px' }}>
          <a
            href={`https://explorer.1am.xyz/contract/${payrollState.contractAddress}?network=preprod`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
            Contract: <span className="mono">{payrollState.contractAddress.slice(0, 20)}…</span>
            — View on 1AM Preprod Explorer
          </a>
        </div>
      )}

      {error && (
        <div className="callout" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: '#fca5a5', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Public Funded Budget
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
            {payrollState.budget.toLocaleString()} DUST
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Funded by Employer ({payrollState.employer.slice(0, 18)}...)
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Round Lifecycle Status
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '6px' }}>
            {payrollState.status === 'Finalized' ? (
              <span style={{ color: '#34d399' }}>Finalized</span>
            ) : (
              <span style={{ color: '#fbbf24' }}>Assigning</span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {payrollState.assigned_count} of 4 recipient commitments published
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px' }}>
          Public Recipient Registry (Zero Amount Exposure):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payrollState.recipients.map((recip, idx) => (
            <div
              key={idx}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Recipient {idx + 1}:{' '}
                  <span className="mono" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    {recip.address}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Commitment:{' '}
                  <span className="mono">
                    {recip.commitment_hash
                      ? `${recip.commitment_hash.slice(0, 24)}…`
                      : 'Pending'}
                  </span>
                </div>
              </div>
              <div>
                {recip.claimed ? (
                  <span className="badge badge-success">Disbursed & Claimed</span>
                ) : recip.is_assigned ? (
                  <span className="badge badge-warning">Committed / Unclaimed</span>
                ) : (
                  <span className="badge badge-info">Unassigned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {verificationResult && (
        <div
          style={{
            background: verificationResult.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${verificationResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {verificationResult.valid ? (
            <CheckCircle2 size={36} color="#34d399" />
          ) : (
            <XCircle size={36} color="#ef4444" />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: verificationResult.valid ? '#34d399' : '#f87171' }}>
              {verificationResult.valid
                ? 'ZK Total Sum Audit: VERIFIED (True)'
                : 'ZK Total Sum Audit: UNVERIFIED (False)'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {verificationResult.valid
                ? `Cryptographic proof confirms 100% of the ${verificationResult.budget.toLocaleString()} DUST budget is allocated across the 4 recipients with zero mathematical discrepancy.`
                : 'The round has not been finalized with a valid ZK sum proof yet.'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleVerify}
          disabled={loading}
        >
          <Search size={16} />
          {loading ? 'Reading On-Chain State…' : 'Verify Total Disbursed'}
        </button>
      </div>
    </div>
  );
};

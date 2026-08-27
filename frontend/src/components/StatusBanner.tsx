import React from 'react';
import type { PublicPayrollState } from '../contractService';
import { CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

type StatusBannerProps = {
  payrollState: PublicPayrollState | null;
};

export const StatusBanner: React.FC<StatusBannerProps> = ({ payrollState }) => {
  if (!payrollState) {
    return (
      <div className="status-banner">
        <div className="status-group">
          <span className="badge badge-warning">No Active Round</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Please deploy or initialize a new payroll round as Employer.
          </span>
        </div>
      </div>
    );
  }

  const isFinalized = payrollState.status === 'Finalized';

  return (
    <div className="status-banner">
      <div className="status-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className={`badge ${
              isFinalized ? 'badge-success' : 'badge-info'
            }`}
          >
            {isFinalized ? (
              <>
                <ShieldCheck size={14} /> Finalized
              </>
            ) : (
              <>
                <Clock size={14} /> Assigning Phase ({payrollState.assigned_count}/4)
              </>
            )}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Public Budget:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {payrollState.budget.toLocaleString()} DUST
            </strong>
          </span>
        </div>
      </div>

      <div className="recipient-pill-list">
        {payrollState.recipients.map((r, i) => (
          <div key={i} className="recipient-pill">
            <span
              className={`dot ${
                r.claimed
                  ? 'dot-green'
                  : r.is_assigned
                  ? 'dot-amber'
                  : 'dot-gray'
              }`}
            />
            <span>Recip {i + 1}:</span>
            <span style={{ color: r.claimed ? '#34d399' : 'var(--text-muted)' }}>
              {r.claimed ? 'Claimed' : r.is_assigned ? 'Assigned' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

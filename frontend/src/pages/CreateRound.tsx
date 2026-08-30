import React, { useState } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { PRESET_WALLETS } from '../hooks/useWallet';
import { NETWORK_CONFIG } from '../config';
import {
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Rocket,
  Loader,
} from 'lucide-react';

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

type CreateRoundProps = {
  currentAddress: string;
  wallet?:        ConnectedAPI | null;
  isRealLace:     boolean;
  onCreated?:     () => void;
};

export const CreateRound: React.FC<CreateRoundProps> = ({
  currentAddress,
  wallet,
  isRealLace,
  onCreated,
}) => {
  const {
    createRound,
    deployContract,
    setContractAddress,
    payrollState,
    contractAddress,
    loading,
    error,
    clearError,
  } = usePayroll(wallet);

  const [budget, setBudget]         = useState<string>('10000');
  const [manualAddr, setManualAddr] = useState<string>('');
  const [attaching, setAttaching]   = useState<boolean>(false);
  const [recipients, setRecipients] = useState<string[]>([
    PRESET_WALLETS[1].address,
    PRESET_WALLETS[2].address,
    PRESET_WALLETS[3].address,
    PRESET_WALLETS[4].address,
  ]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deploying, setDeploying]   = useState<boolean>(false);

  const activeContract = contractAddress || payrollState?.contractAddress;

  const handleRecipientChange = (index: number, val: string) => {
    const next = [...recipients];
    next[index] = val;
    setRecipients(next);
  };

  const handleDeploy = async () => {
    if (!isRealLace) {
      alert('Connect Midnight Wallet (Lace / 1AM) to deploy to Preprod.');
      return;
    }
    clearError();
    setSuccessMsg(null);
    setDeploying(true);

    try {
      const budgetVal = BigInt(budget.replace(/,/g, '')) || 10000n;
      const res = await deployContract(budgetVal, recipients);
      setSuccessMsg(`Contract successfully deployed to Preprod at ${res.contractAddress.slice(0, 16)}…!`);
    } catch (err: any) {
      // handled by usePayroll
    } finally {
      setDeploying(false);
    }
  };

  const handleAttachManual = async () => {
    if (!manualAddr.trim()) return;
    clearError();
    setSuccessMsg(null);
    setAttaching(true);
    try {
      await setContractAddress(manualAddr.trim());
      setSuccessMsg(`Successfully attached to contract: ${manualAddr.trim().slice(0, 16)}…`);
      setManualAddr('');
    } catch (err: any) {
      // handled by usePayroll
    } finally {
      setAttaching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg(null);

    if (!isRealLace) {
      alert('Connect Midnight Wallet (Lace / 1AM) to submit on-chain transactions. Simulated personas are read-only.');
      return;
    }

    const budgetVal = BigInt(budget.replace(/,/g, ''));
    if (budgetVal <= 0n) {
      alert('Please enter a positive budget amount.');
      return;
    }

    if (payrollState?.status === 'Assigning') {
      setSuccessMsg(
        `Round is already active and initialized on-chain with ${payrollState.budget.toLocaleString()} DUST. Proceeding to Assign Splits…`,
      );
      if (onCreated) onCreated();
      return;
    }

    try {
      // If no contract deployed yet, deploy first then initialize round
      if (!activeContract) {
        setDeploying(true);
        const dep = await deployContract(budgetVal, recipients);
        setSuccessMsg(`Contract deployed at ${dep.contractAddress.slice(0, 16)}…! Initializing round…`);
      }
      await createRound(budgetVal, recipients);
      setSuccessMsg(`Round initialized on-chain with ${budgetVal.toLocaleString()} DUST budget!`);
      if (onCreated) onCreated();
    } catch (err: any) {
      // handled by usePayroll
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Create Payout Round</span>
        <span className="badge badge-info">Step 1 of 3 (Employer)</span>
      </div>

      {/* Lace required warning for simulated personas */}
      {!isRealLace && (
        <div className="callout callout-warning" style={{ marginBottom: '16px' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Read-only mode:</strong> Connect Midnight Wallet (Lace / 1AM) to submit on-chain transactions.
            Simulated personas can view existing round state but cannot create or modify rounds.
          </div>
        </div>
      )}

      {/* First-time deployment card if no contract is connected */}
      {!activeContract && isRealLace && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#a5b4fc', fontSize: '0.95rem' }}>
                🚀 First-Time Setup: Deploy Contract to Preprod
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                No contract address configured. Click to deploy a new Private Payroll instance
                to Midnight Preprod with your connected wallet.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDeploy}
              disabled={loading || deploying || !isRealLace}
              style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
            >
              {deploying ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Deploying…
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  Deploy to Preprod
                </>
              )}
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Or attach deployed address:</span>
            <input
              type="text"
              placeholder="e.g. 20200fd648b686e91d6b67032f360b5791d3e13285ce65e76f4f725a31c72e1c"
              value={manualAddr}
              onChange={(e) => setManualAddr(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAttachManual}
              disabled={!manualAddr.trim() || attaching}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {attaching ? 'Attaching…' : 'Attach'}
            </button>
          </div>
        </div>
      )}

      {/* Active Contract Info */}
      {activeContract && (
        <div style={{ marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Connected Contract:</span>
          <a
            href={`https://explorer.1am.xyz/contract/${activeContract}?network=preprod`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <span className="mono">{activeContract.slice(0, 20)}…</span>
            <ExternalLink size={13} />
          </a>
        </div>
      )}

      {payrollState && payrollState.budget > 0n && (
        <div
          className="callout callout-success"
          style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <CheckCircle size={20} />
            <div>
              <strong>Active Round Ready on Preprod:</strong> Funded with{' '}
              <strong>{payrollState.budget.toLocaleString()} DUST</strong> (Status:{' '}
              <span className="badge badge-warning">{payrollState.status}</span>).
              <div>The round is initialized and ready for private split allocations.</div>
            </div>
          </div>
          {onCreated && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCreated}
              style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
            >
              Proceed to Assign Splits ➔
            </button>
          )}
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
          <div>
            <div>{successMsg}</div>
            {activeContract && (
              <a
                href={`${NETWORK_CONFIG.explorerBaseUrl}/contracts/${activeContract}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#818cf8', fontSize: '0.85rem' }}
              >
                <ExternalLink size={14} />
                View Contract on Midnight Explorer
              </a>
            )}
          </div>
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
            The total public budget funded by the employer. The sum of all 4 individual
            allocations must match this exactly.
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
                placeholder="mn_addr_preprod1..."
                required
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || deploying || !isRealLace}
          >
            <PlusCircle size={16} />
            {loading || deploying ? 'Submitting On-Chain Transaction...' : 'Initialize Payout Round'}
          </button>
        </div>
      </form>
    </div>
  );
};

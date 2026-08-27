import React, { useState } from 'react';
import { useWallet, PRESET_WALLETS } from './hooks/useWallet';
import { usePayroll } from './hooks/usePayroll';
import { StatusBanner } from './components/StatusBanner';
import { CreateRound } from './pages/CreateRound';
import { AssignAmounts } from './pages/AssignAmounts';
import { FinalizeRound } from './pages/FinalizeRound';
import { ClaimAmount } from './pages/ClaimAmount';
import { AuditPage } from './pages/AuditPage';
import {
  Wallet,
  Coins,
  Shield,
  Send,
  Lock,
  Sparkles,
  Search,
  RotateCcw,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Radio,
  ExternalLink,
  Users,
} from 'lucide-react';

type Tab = 'create' | 'assign' | 'finalize' | 'claim' | 'audit';

export const App: React.FC = () => {
  const {
    walletState,
    address,
    hasLaceExtension,
    isRealLace,
    error: walletError,
    connectLace,
    connectPersona,
    disconnect,
    generateNewAccount,
    clearError,
  } = useWallet();

  const { payrollState, resetDemo } = usePayroll();
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [selectedPersona, setSelectedPersona] = useState<string>(PRESET_WALLETS[0].address);
  const [showPersonaPicker, setShowPersonaPicker] = useState<boolean>(false);

  const isConnected = walletState === 'connected' && !!address;
  const currentPersona = PRESET_WALLETS.find((w) => w.address === address);

  const handleConfirmPersona = () => {
    connectPersona(selectedPersona);
    setShowPersonaPicker(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-icon">
            <Coins size={20} />
          </div>
          <div className="title-area">
            <h1>Midnight Private Payroll & Splits</h1>
            <p>ZK Zero-Leakage Salary & Revenue Distribution</p>
          </div>
        </div>

        <div className="wallet-bar">
          {isConnected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="badge"
                  style={{
                    background: isRealLace ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                    color: isRealLace ? '#34d399' : '#c084fc',
                    border: `1px solid ${isRealLace ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                  }}
                >
                  <Radio size={12} /> {isRealLace ? 'Lace Preprod' : 'Simulated Persona'}
                </span>

                <select
                  className="account-selector"
                  value={PRESET_WALLETS.some((p) => p.address === address) ? address ?? '' : 'custom'}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      generateNewAccount();
                    } else if (e.target.value !== 'custom') {
                      connectPersona(e.target.value);
                    }
                  }}
                >
                  <optgroup label="Switch Persona">
                    {PRESET_WALLETS.map((pw) => (
                      <option key={pw.address} value={pw.address}>
                        {pw.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Actions">
                    <option value="new">🎲 Generate Random Identity</option>
                    {!PRESET_WALLETS.some((p) => p.address === address) && (
                      <option value="custom">👤 Current ({address?.slice(0, 12)}...)</option>
                    )}
                  </optgroup>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={disconnect}
                title="Disconnect Current Wallet"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <LogOut size={14} /> Disconnect
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => connectLace()}
                disabled={walletState === 'connecting'}
              >
                <Wallet size={16} />
                {walletState === 'connecting' ? 'Awaiting Lace Approval...' : 'Connect Lace Wallet'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPersonaPicker(true)}
              >
                <Users size={16} /> Select Demo Persona
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetDemo}
            title="Reset simulation demo state"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <RotateCcw size={14} /> Reset Demo
          </button>
        </div>
      </header>

      {/* Wallet Error Alert */}
      {walletError && (
        <div className="callout" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: '#fca5a5', marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <div style={{ flex: 1 }}>{walletError}</div>
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Persona Confirmation Modal */}
      {showPersonaPicker && !isConnected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--bg-secondary)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="card-title">
              <span>Choose Your Testing Persona</span>
              <button
                onClick={() => setShowPersonaPicker(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Select which role you want to authenticate as. You can switch between personas anytime using the header dropdown to simulate employer and recipient actions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {PRESET_WALLETS.map((pw) => (
                <label
                  key={pw.address}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${selectedPersona === pw.address ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: selectedPersona === pw.address ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="radio"
                      name="persona"
                      checked={selectedPersona === pw.address}
                      onChange={() => setSelectedPersona(pw.address)}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pw.name}</div>
                      <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {pw.address}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-info">{pw.role}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPersonaPicker(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmPersona}
              >
                Confirm & Connect Persona
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnected Welcome Screen */}
      {!isConnected && !showPersonaPicker && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: '24px' }}>
          <Wallet size={48} color="#818cf8" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
            Welcome to Midnight Private Payroll
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '580px', margin: '0 auto 24px' }}>
            To begin creating payroll rounds, assigning encrypted commitments, and executing ZK sum proofs, connect your wallet below:
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => connectLace()}
              disabled={walletState === 'connecting'}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Wallet size={18} />
              {hasLaceExtension
                ? (walletState === 'connecting' ? 'Opening Lace Extension...' : 'Connect Midnight Lace Wallet')
                : 'Connect Lace Wallet (Extension Required)'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPersonaPicker(true)}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Users size={18} /> Connect with Simulated Persona
            </button>
          </div>

          {!hasLaceExtension && (
            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ℹ️ Midnight Lace Wallet extension was not detected in this browser. You can test the complete ZK circuit flow using <strong>Simulated Personas</strong>.
            </div>
          )}
        </div>
      )}

      {/* Global Status Banner */}
      <StatusBanner payrollState={payrollState} />

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <Coins size={16} /> 1. Create Round
        </button>

        <button
          className={`nav-tab ${activeTab === 'assign' ? 'active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          <Send size={16} /> 2. Assign Amounts
        </button>

        <button
          className={`nav-tab ${activeTab === 'finalize' ? 'active' : ''}`}
          onClick={() => setActiveTab('finalize')}
        >
          <Sparkles size={16} /> 3. Finalize Round
        </button>

        <button
          className={`nav-tab ${activeTab === 'claim' ? 'active' : ''}`}
          onClick={() => setActiveTab('claim')}
        >
          <Lock size={16} /> 4. Claim Payout
        </button>

        <button
          className={`nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Search size={16} /> 5. Audit & Verify
        </button>
      </nav>

      {/* Main Content Area */}
      <main>
        {activeTab === 'create' && (
          <CreateRound
            currentAddress={address || ''}
            onCreated={() => setActiveTab('assign')}
          />
        )}

        {activeTab === 'assign' && (
          <AssignAmounts
            currentAddress={address || ''}
            onAllAssigned={() => setActiveTab('finalize')}
          />
        )}

        {activeTab === 'finalize' && (
          <FinalizeRound
            currentAddress={address || ''}
            onFinalized={() => setActiveTab('claim')}
          />
        )}

        {activeTab === 'claim' && (
          <ClaimAmount currentAddress={address || ''} />
        )}

        {activeTab === 'audit' && <AuditPage />}
      </main>

      {/* Footer / Privacy Guarantee Info */}
      <footer style={{ marginTop: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <p>
          Powered by <strong>Midnight Network</strong> & <strong>Compact ZK Smart Contracts</strong>.
          Provable sum invariant (sum of amounts = budget) with zero individual payout leakage.
        </p>
      </footer>
    </div>
  );
};

export default App;

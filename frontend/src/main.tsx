import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NETWORK_CONFIG } from './config';
import App from './App';
import './App.css';

// Initialize Midnight global Network ID before any operations
try {
  setNetworkId(NETWORK_CONFIG.networkId);
} catch {
  // Already initialized
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Uncaught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '40px auto', background: '#1e293b', color: '#f8fafc', borderRadius: '12px', border: '1px solid #ef4444' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Application Error</h2>
          <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <pre style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: '#fca5a5' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

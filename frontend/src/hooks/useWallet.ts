import { useState, useEffect, useCallback } from 'react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

const NETWORK_ID = (import.meta as any).env?.VITE_NETWORK_ID ?? 'preprod';
const TAB_WALLET_KEY = 'midnight_payroll_active_wallet_address';
const SIMULATED_MODE_KEY = 'midnight_payroll_simulated_mode';

export type WalletState =
  | 'detecting'
  | 'disconnected'
  | 'connecting'
  | 'connected';

export type UseWalletReturn = {
  walletState: WalletState;
  wallet: ConnectedAPI | null;
  address: string | null;
  hasLaceExtension: boolean;
  isRealLace: boolean;
  error: string | null;
  connectLace: () => Promise<boolean>;
  connectPersona: (personaAddress: string) => void;
  disconnect: () => void;
  generateNewAccount: (prefix?: string) => string;
  clearError: () => void;
};

export const PRESET_WALLETS = [
  { name: 'Employer (1AM Wallet)', address: 'mn_addr_preprod1cwxnda70vl2cr96pgadmqjsxnffjt3h7eyc32gmx8wjkvshmg79qegx6kr', role: 'Employer' },
  { name: 'Recipient 1 (Alice)', address: 'mn_addr_preprod1alice_9f4e2b810d7a6c3e1a2b3c4d5e6f7a8b9c0d1e2f', role: 'Recipient' },
  { name: 'Recipient 2 (Bob)', address: 'mn_addr_preprod1bob_5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f', role: 'Recipient' },
  { name: 'Recipient 3 (Charlie)', address: 'mn_addr_preprod1charlie_9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b', role: 'Recipient' },
  { name: 'Recipient 4 (Dave)', address: 'mn_addr_preprod1dave_3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', role: 'Recipient' },
  { name: 'Auditor / Observer', address: 'mn_addr_preprod1auditor_7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d', role: 'Auditor' },
];

function generateRandomAddress(prefix = 'user'): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `midnight1_${prefix}_${hex}`;
}

function findWallet(): InitialAPI | undefined {
  const midnight = (window as any).midnight;
  if (!midnight) return undefined;
  return Object.values(midnight).find(
    (w): w is InitialAPI =>
      !!w && typeof w === 'object' && 'apiVersion' in w,
  );
}

function extractErrorMessage(e: any): string {
  if (!e) return '';
  if (e.message && e.message !== '') return e.message;
  const failure = e?.cause?.failure;
  if (failure?.message) return failure.message;
  if (failure?.cause?.message) return failure.cause.message;
  if (e?.cause?.message) return e.cause.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function friendlyError(e: any): string {
  const msg = extractErrorMessage(e);
  if (msg.includes('User rejected') || msg.includes('cancelled') || msg.includes('declined')) {
    return 'Connection request was declined in the Lace Wallet popup.';
  }
  if (msg.includes('not authorized')) return 'Wallet authorization was rejected by the user.';
  if (msg.includes('Network ID')) return 'Network mismatch. Please switch your Lace Wallet to the Midnight Preprod network.';
  if (msg.includes('insufficient') || msg.includes('DUST'))
    return 'Insufficient funds in wallet. Request testnet tokens from the Midnight Preprod faucet.';
  if (msg.includes('Failed to fetch') || msg.includes('Failed Proof Server'))
    return 'Cannot reach proof server. Check your network connection.';
  return msg || 'Unexpected wallet error occurred.';
}

export function useWallet(): UseWalletReturn {
  const [walletState, setWalletState] = useState<WalletState>('disconnected');
  const [walletAPI, setWalletAPI] = useState<InitialAPI | undefined>();
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [hasLaceExtension, setHasLaceExtension] = useState<boolean>(false);
  const [isRealLace, setIsRealLace] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for Lace extension on mount without auto-connecting
  useEffect(() => {
    const detect = () => {
      const found = findWallet();
      if (found) {
        setWalletAPI(found);
        setHasLaceExtension(true);
      } else {
        setHasLaceExtension(false);
      }
    };

    detect();
    const timer = setTimeout(detect, 500);
    return () => clearTimeout(timer);
  }, []);

  const connectLace = useCallback(async (): Promise<boolean> => {
    setError(null);
    const api = walletAPI || findWallet();

    if (!api) {
      setError(
        'Midnight Lace Wallet extension was not detected in this browser. To use a real wallet, install the Lace extension or choose a Simulated Persona.',
      );
      setWalletState('disconnected');
      return false;
    }

    setWalletState('connecting');
    try {
      // Calls Lace extension -> Lace will open an authorization popup asking the user to confirm!
      const c = await api.connect(NETWORK_ID);
      setWallet(c);
      const { unshieldedAddress } = await c.getUnshieldedAddress();
      setAddress(unshieldedAddress);
      setIsRealLace(true);
      sessionStorage.setItem(TAB_WALLET_KEY, unshieldedAddress);
      sessionStorage.removeItem(SIMULATED_MODE_KEY);
      setWalletState('connected');
      return true;
    } catch (e) {
      setError(friendlyError(e));
      setWalletState('disconnected');
      return false;
    }
  }, [walletAPI]);

  const connectPersona = useCallback((personaAddress: string) => {
    setError(null);
    setAddress(personaAddress);
    setIsRealLace(false);
    sessionStorage.setItem(TAB_WALLET_KEY, personaAddress);
    sessionStorage.setItem(SIMULATED_MODE_KEY, 'true');
    setWalletState('connected');
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress(null);
    sessionStorage.removeItem(TAB_WALLET_KEY);
    sessionStorage.removeItem(SIMULATED_MODE_KEY);
    setIsRealLace(false);
    setWalletState('disconnected');
    setError(null);
  }, []);

  const generateNewAccount = useCallback((prefix = 'user') => {
    const newAddr = generateRandomAddress(prefix);
    setAddress(newAddr);
    sessionStorage.setItem(TAB_WALLET_KEY, newAddr);
    sessionStorage.setItem(SIMULATED_MODE_KEY, 'true');
    setIsRealLace(false);
    setWalletState('connected');
    return newAddr;
  }, []);

  return {
    walletState,
    wallet,
    address,
    hasLaceExtension,
    isRealLace,
    error,
    connectLace,
    connectPersona,
    disconnect,
    generateNewAccount,
    clearError: () => setError(null),
  };
}

import { useState, useEffect, useCallback } from 'react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

const NETWORK_ID = (import.meta as any).env?.VITE_NETWORK_ID ?? 'preprod';
const TAB_WALLET_KEY = 'midnight_payroll_active_wallet_address';
const SIMULATED_MODE_KEY = 'midnight_payroll_simulated_mode';
const WALLET_NAME_KEY = 'midnight_payroll_connected_wallet_name';

export type DetectedWallet = {
  id: string;
  name: string;
  icon?: string;
  rdns?: string;
  apiVersion?: string;
};

export type WalletState =
  | 'detecting'
  | 'disconnected'
  | 'connecting'
  | 'connected';

export type UseWalletReturn = {
  walletState: WalletState;
  wallet: ConnectedAPI | null;
  address: string | null;
  walletName: string | null;
  hasLaceExtension: boolean;
  hasOneAmExtension: boolean;
  detectedWallets: DetectedWallet[];
  isRealLace: boolean; // kept as boolean for real wallet (Lace or 1AM)
  isRealWallet: boolean;
  error: string | null;
  connectLace: () => Promise<boolean>;
  connectOneAm: () => Promise<boolean>;
  connectWallet: (walletKeyOrId: string) => Promise<boolean>;
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

/** Get all wallets registered under window.midnight */
function getInstalledWallets(): Record<string, InitialAPI> {
  const midnight = (window as any).midnight;
  if (!midnight || typeof midnight !== 'object') return {};
  const result: Record<string, InitialAPI> = {};
  for (const [key, val] of Object.entries(midnight)) {
    if (val && typeof val === 'object' && 'apiVersion' in (val as any)) {
      result[key] = val as InitialAPI;
    }
  }
  return result;
}

/** Find Lace wallet specifically */
function findLaceWallet(): { id: string; api: InitialAPI } | undefined {
  const wallets = getInstalledWallets();
  for (const [key, api] of Object.entries(wallets)) {
    const name = (api.name || '').toLowerCase();
    const rdns = (api.rdns || '').toLowerCase();
    const id = key.toLowerCase();
    if (name.includes('lace') || rdns.includes('lace') || id.includes('lace')) {
      return { id: key, api };
    }
  }
  // If only 1 wallet and not explicitly 1AM, assume default wallet
  const entries = Object.entries(wallets);
  if (entries.length === 1 && !entries[0][1].name?.toLowerCase().includes('1am')) {
    return { id: entries[0][0], api: entries[0][1] };
  }
  return undefined;
}

/** Find 1AM wallet specifically */
function findOneAmWallet(): { id: string; api: InitialAPI } | undefined {
  const wallets = getInstalledWallets();
  for (const [key, api] of Object.entries(wallets)) {
    const name = (api.name || '').toLowerCase();
    const rdns = (api.rdns || '').toLowerCase();
    const id = key.toLowerCase();
    if (
      name.includes('1am') ||
      name.includes('oneam') ||
      rdns.includes('1am') ||
      rdns.includes('oneam') ||
      id.includes('1am') ||
      id.includes('oneam')
    ) {
      return { id: key, api };
    }
  }
  return undefined;
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

export function friendlyError(e: any, walletName = 'Wallet'): string {
  const msg = extractErrorMessage(e);
  if (msg.includes('User rejected') || msg.includes('cancelled') || msg.includes('declined')) {
    return `Connection request was declined in the ${walletName} popup.`;
  }
  if (msg.includes('not authorized')) return `${walletName} authorization was rejected by the user.`;
  if (msg.includes('Network ID')) return `Network mismatch. Please switch your ${walletName} to the Midnight Preprod network.`;
  if (msg.includes('insufficient') || msg.includes('DUST'))
    return 'Insufficient funds in wallet. Request testnet tokens from the Midnight Preprod faucet.';
  if (msg.includes('Failed to fetch') || msg.includes('Failed Proof Server'))
    return 'Cannot reach proof server. Check your network connection.';
  return msg || `Unexpected ${walletName} error occurred.`;
}

export function useWallet(): UseWalletReturn {
  const [walletState, setWalletState] = useState<WalletState>('disconnected');
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [hasLaceExtension, setHasLaceExtension] = useState<boolean>(false);
  const [hasOneAmExtension, setHasOneAmExtension] = useState<boolean>(false);
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [isRealWallet, setIsRealWallet] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for installed wallet extensions on mount
  useEffect(() => {
    const detect = () => {
      const wallets = getInstalledWallets();
      const detected: DetectedWallet[] = Object.entries(wallets).map(([id, api]) => ({
        id,
        name: api.name || id,
        icon: api.icon,
        rdns: api.rdns,
        apiVersion: api.apiVersion,
      }));
      setDetectedWallets(detected);
      setHasLaceExtension(!!findLaceWallet());
      setHasOneAmExtension(!!findOneAmWallet());
    };

    detect();
    const timer1 = setTimeout(detect, 500);
    const timer2 = setTimeout(detect, 1500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const connectWalletByApi = async (api: InitialAPI, name: string): Promise<boolean> => {
    setError(null);
    setWalletState('connecting');
    try {
      const c = await api.connect(NETWORK_ID);
      setWallet(c);
      const { unshieldedAddress } = await c.getUnshieldedAddress();
      setAddress(unshieldedAddress);
      setIsRealWallet(true);
      setWalletName(name);
      sessionStorage.setItem(TAB_WALLET_KEY, unshieldedAddress);
      sessionStorage.setItem(WALLET_NAME_KEY, name);
      sessionStorage.removeItem(SIMULATED_MODE_KEY);
      setWalletState('connected');
      return true;
    } catch (e) {
      setError(friendlyError(e, name));
      setWalletState('disconnected');
      return false;
    }
  };

  const connectLace = useCallback(async (): Promise<boolean> => {
    const found = findLaceWallet();
    if (!found) {
      setError(
        'Midnight Lace Wallet extension was not detected. Please install the Lace extension or choose another wallet.',
      );
      setWalletState('disconnected');
      return false;
    }
    return connectWalletByApi(found.api, found.api.name || 'Lace Wallet');
  }, []);

  const connectOneAm = useCallback(async (): Promise<boolean> => {
    const found = findOneAmWallet();
    if (!found) {
      setError(
        '1AM Wallet extension was not detected. Please install the 1AM Wallet extension or choose Lace Wallet.',
      );
      setWalletState('disconnected');
      return false;
    }
    return connectWalletByApi(found.api, found.api.name || '1AM Wallet');
  }, []);

  const connectWallet = useCallback(async (walletKeyOrId: string): Promise<boolean> => {
    const wallets = getInstalledWallets();
    const api = wallets[walletKeyOrId];
    if (!api) {
      setError(`Wallet "${walletKeyOrId}" was not found.`);
      return false;
    }
    return connectWalletByApi(api, api.name || walletKeyOrId);
  }, []);

  const connectPersona = useCallback((personaAddress: string) => {
    setError(null);
    setAddress(personaAddress);
    setIsRealWallet(false);
    setWalletName('Simulated Persona');
    sessionStorage.setItem(TAB_WALLET_KEY, personaAddress);
    sessionStorage.setItem(SIMULATED_MODE_KEY, 'true');
    sessionStorage.setItem(WALLET_NAME_KEY, 'Simulated Persona');
    setWalletState('connected');
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress(null);
    setWalletName(null);
    sessionStorage.removeItem(TAB_WALLET_KEY);
    sessionStorage.removeItem(SIMULATED_MODE_KEY);
    sessionStorage.removeItem(WALLET_NAME_KEY);
    setIsRealWallet(false);
    setWalletState('disconnected');
    setError(null);
  }, []);

  const generateNewAccount = useCallback((prefix = 'user') => {
    const newAddr = generateRandomAddress(prefix);
    setAddress(newAddr);
    setWalletName('Simulated Persona');
    sessionStorage.setItem(TAB_WALLET_KEY, newAddr);
    sessionStorage.setItem(SIMULATED_MODE_KEY, 'true');
    sessionStorage.setItem(WALLET_NAME_KEY, 'Simulated Persona');
    setIsRealWallet(false);
    setWalletState('connected');
    return newAddr;
  }, []);

  return {
    walletState,
    wallet,
    address,
    walletName,
    hasLaceExtension,
    hasOneAmExtension,
    detectedWallets,
    isRealLace: isRealWallet, // keep isRealLace alias for backwards compatibility
    isRealWallet,
    error,
    connectLace,
    connectOneAm,
    connectWallet,
    connectPersona,
    disconnect,
    generateNewAccount,
    clearError: () => setError(null),
  };
}

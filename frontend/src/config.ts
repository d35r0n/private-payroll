/**
 * Midnight network environment configuration.
 * All values are read from Vite environment variables with Preprod defaults.
 * Set VITE_CONTRACT_ADDRESS after running: npm run deploy:preprod
 */
function resolveZkBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_ZK_CONFIG_BASE_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

export const NETWORK_CONFIG = {
  networkId:       (import.meta as any).env?.VITE_NETWORK_ID       ?? 'preprod',
  indexerUrl:      (import.meta as any).env?.VITE_INDEXER_URL      ?? 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl:    (import.meta as any).env?.VITE_INDEXER_WS_URL   ?? 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  proofServerUrl:  (import.meta as any).env?.VITE_PROOF_SERVER_URL ?? 'https://proof-server.preprod.midnight.network',
  get zkConfigBaseUrl() {
    return resolveZkBaseUrl();
  },
  /** Permanent deployed contract on Preprod */
  contractAddress:
    (import.meta as any).env?.VITE_CONTRACT_ADDRESS ||
    '20200fd648b686e91d6b67032f360b5791d3e13285ce65e76f4f725a31c72e1c',
  explorerBaseUrl: 'https://explorer.1am.xyz',
};

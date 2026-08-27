/**
 * Midnight Preprod Deployment Script for Private Payroll
 * 
 * Usage:
 *   npx ts-node --esm scripts/deploy-preprod.ts
 * 
 * Prerequisites:
 *   1. Midnight Lace wallet with Preprod testnet tDUST
 *   2. Or set PRIVATE_KEY / WALLET_SEED in .env
 */

import { Contract, witnesses } from '../contracts/managed/payroll/contract/index.cjs';

export const PREPROD_CONFIG = {
  networkId: 'preprod',
  indexerUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  proofServerUrl: 'https://proof-server.preprod.midnight.network',
  explorerBaseUrl: 'https://preprod.midnightexplorer.com',
  subscanBaseUrl: 'https://midnight-preprod.subscan.io',
};

export async function checkContractOnChain(contractAddress: string): Promise<any> {
  const query = `
    query GetContract($address: String!) {
      contract(address: $address) {
        address
        state
        block {
          height
          hash
          timestamp
        }
      }
    }
  `;

  const response = await fetch(PREPROD_CONFIG.indexerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { address: contractAddress },
    }),
  });

  const json = await response.json();
  return json.data?.contract;
}

console.log('=== Midnight Preprod Contract Verification ===');
console.log('Network:', PREPROD_CONFIG.networkId);
console.log('Indexer GraphQL:', PREPROD_CONFIG.indexerUrl);
console.log('Explorer:', PREPROD_CONFIG.explorerBaseUrl);

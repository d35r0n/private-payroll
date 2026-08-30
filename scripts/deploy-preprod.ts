/**
 * Midnight Preprod Deployment Script for Private Payroll
 *
 * Deploys the payroll contract once to Preprod, prints the contract address
 * and an explorer link, and writes VITE_CONTRACT_ADDRESS to frontend/.env.local.
 *
 * Usage:
 *   MIDNIGHT_SEED_PHRASE="word1 word2 ..." npx ts-node --esm scripts/deploy-preprod.ts
 *
 * Prerequisites:
 *   1. Midnight Lace wallet (or seed phrase) funded with Preprod tDUST
 *   2. Node 20+
 *   3. Contract artifacts compiled: npm run compile
 */

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider }   from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider }     from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import {
  Contract,
  createWitnesses,
  stringToBytes32,
  type PayrollPrivateState,
} from '../contracts/src/index.js';
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Network config ─────────────────────────────────────────────────────────

export const PREPROD_CONFIG = {
  networkId:       'preprod',
  indexerUrl:      'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl:    'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  proofServerUrl:  'https://proof-server.preprod.midnight.network',
  explorerBaseUrl: 'https://preprod.midnightexplorer.com',
  zkConfigBaseDir: path.resolve(__dirname, '../contracts/managed/payroll'),
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function buildProviders(seedPhrase: string) {
  /**
   * NOTE: A full server-side wallet provider requires @midnight-ntwrk/wallet-sdk
   * or a compatible key-management library that is outside this project's scope.
   *
   * For the Preprod deploy:
   *   Option A (recommended): Use the Lace CLI / wallet-sdk to sign.
   *   Option B: Import your own wallet provider built from the seed phrase.
   *
   * The stubs below show the structure; replace buildServerWalletProvider with
   * your actual implementation.
   */
  const zkConfigProvider = new FetchZkConfigProvider(
    PREPROD_CONFIG.zkConfigBaseDir,
    // Node fetch polyfill (available in Node 18+)
    globalThis.fetch ?? (await import('node-fetch' as string)).default as any,
  );

  const proofProvider = httpClientProofProvider(
    PREPROD_CONFIG.proofServerUrl,
    zkConfigProvider,
  );

  const publicDataProvider = indexerPublicDataProvider(
    PREPROD_CONFIG.indexerUrl,
    PREPROD_CONFIG.indexerWsUrl,
  );

  // !! Replace with a real server-side wallet provider !!
  const walletProvider = await buildServerWalletProvider(seedPhrase);

  return { walletProvider, proofProvider, publicDataProvider, zkConfigProvider };
}

/**
 * Placeholder — replace with your actual server-side wallet implementation.
 * The wallet provider must implement:
 *   - balanceTx(tx, ttl?) → FinalizedTransaction
 *   - getCoinPublicKey()  → CoinPublicKey
 *   - getEncryptionPublicKey() → EncPublicKey
 */
async function buildServerWalletProvider(_seedPhrase: string): Promise<any> {
  throw new Error(
    'buildServerWalletProvider is not implemented.\n' +
    'Supply a wallet provider from @midnight-ntwrk/wallet-sdk or equivalent.\n' +
    'See: https://docs.midnight.network/develop/tutorial/deploy',
  );
}

// ── Deploy ─────────────────────────────────────────────────────────────────

async function deploy() {
  const seedPhrase = process.env.MIDNIGHT_SEED_PHRASE;
  if (!seedPhrase) {
    console.error('ERROR: Set MIDNIGHT_SEED_PHRASE in your environment before running.');
    process.exit(1);
  }

  console.log('=== Midnight Preprod Contract Deployment ===');
  console.log('Network    :', PREPROD_CONFIG.networkId);
  console.log('Indexer    :', PREPROD_CONFIG.indexerUrl);
  console.log('Proof Srv  :', PREPROD_CONFIG.proofServerUrl);
  console.log('');

  const providers = await buildProviders(seedPhrase);

  const witnesses  = createWitnesses();
  const contract   = new Contract(witnesses);

  // The constructor takes a dummy budget=0 and placeholder employer/recipients;
  // the actual round is started by calling create_round() in the frontend.
  // Use the deployer's address as placeholder employer.
  const deployerAddr = new Uint8Array(32); // placeholder — fill from wallet
  const placeholder  = new Uint8Array(32);

  const initialPrivateState: PayrollPrivateState = {
    callerAddress: deployerAddr,
  };

  console.log('Deploying contract (this may take 30–60 s)…');

  const deployed = await deployContract(providers, {
    compiledContract: contract,
    privateStateId:   'payroll-employer',
    initialPrivateState,
    args: [10000n, deployerAddr, placeholder, placeholder, placeholder, placeholder],
  });

  const contractAddress = deployed.deployTxData.public.contractAddress as string;
  const txId            = deployed.deployTxData.public.txId as string;

  console.log('');
  console.log('✅  Deployed successfully!');
  console.log('Contract Address :', contractAddress);
  console.log('Transaction ID   :', txId);
  console.log('Explorer Link    :',
    `${PREPROD_CONFIG.explorerBaseUrl}/contracts/${contractAddress}`);

  // Persist address to frontend .env.local
  const envLocalPath = path.resolve(__dirname, '../frontend/.env.local');
  const envLine      = `\nVITE_CONTRACT_ADDRESS=${contractAddress}\n`;
  fs.appendFileSync(envLocalPath, envLine, 'utf8');
  console.log('');
  console.log(`Saved VITE_CONTRACT_ADDRESS to ${envLocalPath}`);
  console.log('Restart "npm run dev" to pick up the new address.');
}

deploy().catch((err) => {
  console.error('Deployment failed:', err.message ?? err);
  process.exit(1);
});

// ── Utility: verify an existing contract ──────────────────────────────────

export async function checkContractOnChain(contractAddress: string): Promise<any> {
  const query = `
    query GetContract($address: String!) {
      contract(address: $address) {
        address
        state
        block { height hash timestamp }
      }
    }
  `;
  const response = await fetch(PREPROD_CONFIG.indexerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address: contractAddress } }),
  });
  const json = await response.json();
  return json.data?.contract;
}

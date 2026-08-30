/**
 * Midnight Private Payroll — Contract Service (Real On-Chain)
 *
 * Replaces the localStorage simulation with real Midnight.js calls:
 *   - Provider stack built from the Lace ConnectedAPI
 *   - Every workflow step submits a signed transaction to Preprod
 *   - Live public state streamed from the indexer
 *   - Private witness state persisted locally via LocalPrivateStateProvider
 */

import './polyfills';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  deployContract,
  createCircuitCallTxInterface,
  type CircuitCallTxInterface,
} from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider }   from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { PayrollZKConfigProvider }   from './zkConfigProvider';
import { toHex, fromHex }            from '@midnight-ntwrk/midnight-js-utils';
import {
  Transaction,
  SignatureEnabled,
  Proof,
  Binding,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightProviders,
  WalletProvider,
  MidnightProvider,
  PublicDataProvider,
  ProofProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { CompiledContract } from '@midnight-ntwrk/compact-js';

import {
  Contract,
  createWitnesses,
  pureCircuits,
  stringToBytes32,
  bytes32ToString,
  generateSalt,
  ledger,
  type PayrollPrivateState,
} from 'private-payroll-contract';
import { LocalPrivateStateProvider } from './in-memory-private-state-provider';
import { NETWORK_CONFIG }            from './config';

// ─── Public shape the UI consumes ─────────────────────────────────────────────

export type PublicRecipientInfo = {
  index:           number;
  address:         string;
  commitment_hash: string;
  is_assigned:     boolean;
  claimed:         boolean;
};

export type PublicPayrollState = {
  budget:          bigint;
  employer:        string;
  status:          'Uninitialized' | 'Assigning' | 'Finalized';
  assigned_count:  number;
  recipients:      PublicRecipientInfo[];
  sum_valid:       boolean;
  contractAddress: string;
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type PayrollContract  = Contract<PayrollPrivateState>;
type PayrollProviders = MidnightProviders<string, string, PayrollPrivateState>;

// Private state ID used as the key inside LocalPrivateStateProvider
const PRIVATE_STATE_ID = 'payroll-employer';

// localStorage key that persists the deployed contract address across page loads
const CONTRACT_ADDR_KEY = 'midnight_payroll_contract_address_v2';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const trimmed = hex.trim();
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(trimmed.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Map numeric ledger status to the string representation the UI expects. */
function mapStatus(status: bigint): PublicPayrollState['status'] {
  if (status === 0n) return 'Uninitialized';
  if (status === 1n) return 'Assigning';
  return 'Finalized';
}

/** Check if two addresses match (handles 32-byte truncated Compact on-chain addresses). */
export function matchAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return true;
  if (s1.length >= 16 && s2.length >= 16) {
    return s1.startsWith(s2) || s2.startsWith(s1);
  }
  return false;
}

// Initialize network ID on module load
try {
  setNetworkId(NETWORK_CONFIG.networkId);
} catch {
  // Already initialized
}

// ─── Service class ────────────────────────────────────────────────────────────

class MidnightContractService {
  private providers:        PayrollProviders | null    = null;
  private psProvider:       LocalPrivateStateProvider | null = null;
  private compiledContract: any                        = null;
  private callTx:           CircuitCallTxInterface<PayrollContract> | null = null;
  private contractAddress:  string | null             = null;
  private currentState:     PublicPayrollState | null = null;
  private listeners:        Set<(s: PublicPayrollState | null) => void> = new Set();
  private walletApi:        ConnectedAPI | null       = null;

  // ── Subscription ────────────────────────────────────────────────────────────

  public subscribe(cb: (s: PublicPayrollState | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentState);
    return () => this.listeners.delete(cb);
  }

  public getPublicState(): PublicPayrollState | null {
    return this.currentState;
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.currentState));
  }

  public isInitialized(): boolean {
    return !!(this.providers && this.compiledContract);
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Called once the Lace or 1AM wallet is connected.
   * Wires up the full provider stack and subscribes to the on-chain ledger.
   */
  public async init(walletApi: ConnectedAPI): Promise<void> {
    this.walletApi = walletApi;

    let indexerUrl: string      = NETWORK_CONFIG.indexerUrl;
    let indexerWsUrl: string    = NETWORK_CONFIG.indexerWsUrl;
    let proofServerUrl: string  = NETWORK_CONFIG.proofServerUrl;

    try {
      const config = await walletApi.getConfiguration?.();
      if (config?.networkId) {
        try {
          setNetworkId(config.networkId);
        } catch { /* already set */ }
      } else {
        try {
          setNetworkId(NETWORK_CONFIG.networkId);
        } catch { /* already set */ }
      }
      if (config?.indexerUri)    indexerUrl   = config.indexerUri;
      if (config?.indexerWsUri)  indexerWsUrl = config.indexerWsUri;
      if (config?.proverServerUri) proofServerUrl = config.proverServerUri;
    } catch (e) {
      console.warn('Could not read wallet configuration:', e);
      try {
        setNetworkId(NETWORK_CONFIG.networkId);
      } catch { /* already set */ }
    }

    let zkBaseUrl = NETWORK_CONFIG.zkConfigBaseUrl;
    if (!zkBaseUrl.startsWith('http://') && !zkBaseUrl.startsWith('https://')) {
      zkBaseUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'http://localhost:5173';
    }

    const zkConfigProvider = new PayrollZKConfigProvider(zkBaseUrl);

    const proofProvider: ProofProvider = httpClientProofProvider(
      proofServerUrl,
      zkConfigProvider,
    );

    const publicDataProvider: PublicDataProvider = indexerPublicDataProvider(
      indexerUrl,
      indexerWsUrl,
      typeof window !== 'undefined' ? (window as any).WebSocket : undefined,
    );

    // Retrieve addresses from wallet safely
    let shieldedCoinPublicKey = '';
    let shieldedEncryptionPublicKey = '';
    try {
      const shielded = await walletApi.getShieldedAddresses?.();
      if (shielded) {
        shieldedCoinPublicKey = shielded.shieldedCoinPublicKey;
        shieldedEncryptionPublicKey = shielded.shieldedEncryptionPublicKey;
      }
    } catch (e) {
      console.warn('Could not get shielded addresses:', e);
    }

    let unshieldedAddress = '';
    try {
      const unshielded = await walletApi.getUnshieldedAddress?.();
      unshieldedAddress = unshielded?.unshieldedAddress || '';
    } catch (e) {
      console.warn('Could not get unshielded address:', e);
    }

    if (!shieldedCoinPublicKey && unshieldedAddress) {
      shieldedCoinPublicKey = unshieldedAddress;
    }

    this.psProvider = new LocalPrivateStateProvider(unshieldedAddress);

    // Adapter for wallet balancing
    const walletProvider: WalletProvider = {
      getCoinPublicKey(): any {
        return shieldedCoinPublicKey;
      },
      getEncryptionPublicKey(): any {
        return shieldedEncryptionPublicKey;
      },
      async balanceTx(unboundTx: any, _ttl?: Date): Promise<any> {
        const rawTx = toHex(unboundTx.serialize());
        const balanced = await walletApi.balanceUnsealedTransaction(rawTx);
        const txHex =
          typeof balanced === 'string'
            ? balanced
            : balanced?.tx
              ? (typeof balanced.tx === 'string' ? balanced.tx : toHex(balanced.tx))
              : toHex(balanced as any);
        const txBytes = typeof txHex === 'string' ? fromHex(txHex) : txHex;

        return (Transaction as any).deserialize(
          'signature',
          'proof',
          'binding',
          txBytes,
        );
      },
    };

    // Adapter for transaction submission
    const midnightProvider: MidnightProvider = {
      async submitTx(tx: any): Promise<string> {
        const rawTx = toHex(tx.serialize());
        const res: any = await (walletApi as any).submitTransaction(rawTx);
        if (typeof res === 'string') return res;
        if (res && typeof res.txId === 'string') return res.txId;
        if (res && typeof res.tx === 'string') return res.tx;
        // The indexer's watchForTxData looks transactions up by `identifier`,
        // not by transaction hash, so identifiers() must be preferred here.
        const identifiers: string[] | undefined = tx.identifiers?.();
        if (identifiers && identifiers.length > 0) return identifiers[0];
        return tx.transactionHash?.() ?? toHex(new Uint8Array());
      },
    };

    // Build the full Midnight provider bundle
    this.providers = {
      walletProvider,
      midnightProvider,
      proofProvider,
      publicDataProvider,
      zkConfigProvider,
      privateStateProvider: this.psProvider as any,
    };

    // Build compiled contract instance using @midnight-ntwrk/compact-js
    const witnesses = createWitnesses();
    this.compiledContract = (CompiledContract.make('payroll', Contract) as any).pipe(
      (CompiledContract.withWitnesses as any)(witnesses),
    );

    // Restore saved address from env or localStorage
    const savedAddr =
      localStorage.getItem(CONTRACT_ADDR_KEY) || NETWORK_CONFIG.contractAddress;

    if (savedAddr) {
      await this.attachToContract(savedAddr);
    }
  }

  /**
   * Connect to an already-deployed contract at the given address.
   * Sets up the call-tx interface and reads the current ledger state.
   */
  private async attachToContract(address: string): Promise<void> {
    if (!this.providers || !this.compiledContract) return;

    this.contractAddress = address;
    localStorage.setItem(CONTRACT_ADDR_KEY, address);

    this.psProvider?.setContractAddress(address);

    // Build the circuit call-tx interface
    this.callTx = createCircuitCallTxInterface(
      this.providers as any,
      this.compiledContract,
      address as any,
      PRIVATE_STATE_ID,
    );

    // Read current ledger state
    await this.refreshState();
  }

  /**
   * Fetches the current on-chain ledger state and maps it to PublicPayrollState.
   */
  private async refreshState(): Promise<void> {
    if (!this.providers || !this.contractAddress) return;

    try {
      const contractState = await this.providers.publicDataProvider.queryContractState(
        this.contractAddress as any,
      );

      if (!contractState) {
        this.currentState = null;
        this.notify();
        return;
      }

      // Decode ledger state bytes
      const decoded = ledger((contractState as any).data ?? contractState);

      this.currentState = this.mapLedger(decoded, this.contractAddress);
      this.notify();
    } catch (err) {
      console.warn('Failed to refresh ledger state:', err);
    }
  }

  /** Map on-chain ledger fields to the PublicPayrollState the UI consumes. */
  private mapLedger(decoded: any, address: string): PublicPayrollState {
    const recipients: PublicRecipientInfo[] = [];
    for (let i = 0; i < 4; i++) {
      if (decoded.commitments.member(BigInt(i))) {
        const c = decoded.commitments.lookup(BigInt(i));
        recipients.push({
          index:           i,
          address:         bytes32ToString(c.recipient_id as Uint8Array),
          commitment_hash: bytesToHex(c.commitment_hash as Uint8Array),
          is_assigned:     c.is_assigned as boolean,
          claimed:         c.claimed as boolean,
        });
      } else {
        recipients.push({
          index: i, address: '', commitment_hash: '', is_assigned: false, claimed: false,
        });
      }
    }

    return {
      budget:          decoded.round.budget as bigint,
      employer:        bytes32ToString(decoded.round.employer as Uint8Array),
      status:          mapStatus(decoded.round.status as bigint),
      assigned_count:  Number(decoded.round.assigned_count as bigint),
      recipients,
      sum_valid:       decoded.sum_proof.valid as boolean,
      contractAddress: address,
    };
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  private ensureReady(): void {
    if (!this.providers || !this.contractAddress || !this.callTx) {
      throw new Error(
        'Wallet not connected or contract address not set.\n' +
        'Please connect Midnight Lace Wallet. If this is the first run, ' +
        'deploy the contract via "npm run deploy:preprod" and set VITE_CONTRACT_ADDRESS.',
      );
    }
  }

  private async getCallerBytes(): Promise<Uint8Array> {
    if (this.walletApi) {
      const { unshieldedAddress } = await this.walletApi.getUnshieldedAddress();
      return stringToBytes32(unshieldedAddress);
    }
    return new Uint8Array(32);
  }

  // ── Step 1: Create Round ──────────────────────────────────────────────────

  /**
   * Calls the create_round circuit on the long-lived deployed contract.
   * Submits a real transaction via the Lace wallet.
   */
  public async createRound(
    budget:     bigint,
    recipients: string[],
  ): Promise<PublicPayrollState> {
    this.ensureReady();
    if (recipients.length !== 4) throw new Error('Exactly 4 recipient addresses are required.');
    if (budget <= 0n)            throw new Error('Budget must be greater than zero.');

    const callerBytes = await this.getCallerBytes();

    // Store caller address in private state for the witness
    const currentPS = (await this.psProvider!.get(PRIVATE_STATE_ID)) ?? {};
    await this.psProvider!.set(PRIVATE_STATE_ID, {
      ...currentPS,
      callerAddress: callerBytes,
    });

    await this.callTx!.create_round(
      budget,
      stringToBytes32(recipients[0]),
      stringToBytes32(recipients[1]),
      stringToBytes32(recipients[2]),
      stringToBytes32(recipients[3]),
    );

    await this.refreshState();
    return this.currentState!;
  }

  // ── Step 2: Assign Amount ─────────────────────────────────────────────────

  /**
   * Submits a commitment hash for one recipient slot via the assign_amount circuit.
   * Persists the private amount+salt locally so finalize_round can access them.
   */
  public async assignAmount(
    index:  number,
    amount: bigint,
    salt:   Uint8Array,
  ): Promise<void> {
    this.ensureReady();

    const callerBytes  = await this.getCallerBytes();
    const commitment   = pureCircuits.computeCommitment(amount, salt);

    // Persist private allocation for later use in finalize_round witness
    const currentPS = (await this.psProvider!.get(PRIVATE_STATE_ID)) ?? {};
    await this.psProvider!.set(PRIVATE_STATE_ID, {
      ...currentPS,
      callerAddress: callerBytes,
      employerAllocations: {
        ...currentPS.employerAllocations,
        [index]: { amount, salt },
      },
    });

    await this.callTx!.assign_amount(BigInt(index), commitment);
    await this.refreshState();
  }

  // ── Step 3: Finalize Round ────────────────────────────────────────────────

  /**
   * Calls finalize_round. The contract ZK-proves sum(amounts) == budget.
   * Private amounts/salts are read from LocalPrivateStateProvider by the witness.
   */
  public async finalizeRound(): Promise<void> {
    this.ensureReady();

    const callerBytes = await this.getCallerBytes();
    const currentPS   = (await this.psProvider!.get(PRIVATE_STATE_ID)) ?? {};

    // Make sure the caller address is fresh in the private state
    await this.psProvider!.set(PRIVATE_STATE_ID, {
      ...currentPS,
      callerAddress: callerBytes,
    });

    await this.callTx!.finalize_round();
    await this.refreshState();
  }

  // ── Step 4: Claim Amount ──────────────────────────────────────────────────

  /**
   * Calls claim_amount as the recipient.
   * The contract authenticates the private amount+salt against the stored commitment.
   */
  public async claimAmount(
    index:  number,
    amount: bigint,
    salt:   Uint8Array,
  ): Promise<void> {
    this.ensureReady();

    const callerBytes = await this.getCallerBytes();

    // Set recipient private state for the witness
    await this.psProvider!.set(PRIVATE_STATE_ID, {
      callerAddress:   callerBytes,
      recipientIndex:  index,
      recipientAmount: amount,
      recipientSalt:   salt,
    });

    await this.callTx!.claim_amount(BigInt(index));
    await this.refreshState();
  }

  // ── Audit: Verify Total ───────────────────────────────────────────────────

  /**
   * Returns the on-chain sum_proof.valid flag without a new transaction.
   * Reads directly from the latest refreshed state.
   */
  public async verifyTotal(): Promise<{ valid: boolean; budget: bigint }> {
    if (!this.currentState) {
      if (this.contractAddress && this.providers) await this.refreshState();
      if (!this.currentState) throw new Error('No active payroll round found on-chain.');
    }
    return {
      valid:  this.currentState.sum_valid,
      budget: this.currentState.budget,
    };
  }

  // ── Deploy (used by deploy script & first-time setup) ─────────────────────

  /**
   * Deploys the contract for the first time. Used only by deploy-preprod.ts.
   * Returns the contract address and deploy transaction data.
   */
  public async deploy(
    budget:     bigint,
    employer:   Uint8Array,
    recipients: Uint8Array[],
  ): Promise<{ contractAddress: string; txId: string }> {
    if (!this.providers || !this.compiledContract) {
      throw new Error('Call init() before deploy().');
    }

    const deployed = await deployContract(this.providers as any, {
      compiledContract: this.compiledContract,
      privateStateId:   PRIVATE_STATE_ID,
      initialPrivateState: { callerAddress: employer },
      args: [budget, employer, recipients[0], recipients[1], recipients[2], recipients[3]],
    });

    const address = deployed.deployTxData.public.contractAddress as string;
    const txId    = deployed.deployTxData.public.txId as string;

    await this.attachToContract(address);
    return { contractAddress: address, txId };
  }

  /**
   * One-click deployment from the browser using the connected Lace or 1AM wallet.
   */
  public async deployWithWallet(
    walletApi?: ConnectedAPI | null,
    budget: bigint = 10000n,
    recipients?: string[],
  ): Promise<{ contractAddress: string; txId: string }> {
    const api = walletApi || this.walletApi;
    if (api && !this.isInitialized()) {
      await this.init(api);
    }
    if (!this.providers || !this.compiledContract) {
      throw new Error('Please connect your Midnight wallet (Lace or 1AM) before deploying.');
    }

    const effectiveBudget = budget > 0n ? budget : 10000n;
    const callerBytes = await this.getCallerBytes();
    const recipientBytes =
      recipients && recipients.length === 4
        ? recipients.map(stringToBytes32)
        : [
            stringToBytes32('mn_addr_preprod1alice_9f4e2b810d7a6c3e1a2b3c4d5e6f7a8b9c0d1e2f'),
            stringToBytes32('mn_addr_preprod1bob_5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f'),
            stringToBytes32('mn_addr_preprod1charlie_9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b'),
            stringToBytes32('mn_addr_preprod1dave_3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b'),
          ];

    return this.deploy(effectiveBudget, callerBytes, recipientBytes);
  }

  public getContractAddress(): string | null {
    return this.contractAddress;
  }

  public async setContractAddress(address: string): Promise<void> {
    await this.attachToContract(address);
  }

  // ── Stored Employer Allocations (for UI display) ──────────────────────────

  /**
   * Returns locally stored employer allocations so the UI can show
   * commitment hashes without re-fetching from chain.
   */
  public getStoredEmployerAllocations(): Record<number, {
    amount: bigint; saltHex: string; commitmentHex: string;
  }> {
    const ps = this.psProvider?.getSync() ?? {};
    const allocs = ps.employerAllocations ?? {};
    const result: Record<number, { amount: bigint; saltHex: string; commitmentHex: string }> = {};

    for (const [k, v] of Object.entries(allocs)) {
      const idx = Number(k);
      const commitment = pureCircuits.computeCommitment(v.amount, v.salt);
      result[idx] = {
        amount:        v.amount,
        saltHex:       bytesToHex(v.salt),
        commitmentHex: bytesToHex(commitment),
      };
    }
    return result;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Clears cached address and local state.
   * Does NOT affect on-chain state.
   */
  public resetLocalState(): void {
    localStorage.removeItem(CONTRACT_ADDR_KEY);
    this.currentState     = null;
    this.contractAddress  = null;
    this.callTx           = null;
    this.notify();
  }

  /** @deprecated kept for compatibility — calls resetLocalState */
  public resetDemo(): void {
    this.resetLocalState();
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const payrollService = new MidnightContractService();

// Re-export utilities consumed by pages
export { generateSalt, bytesToHex, hexToBytes, pureCircuits };

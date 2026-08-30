/**
 * Local (localStorage) implementation of Midnight.js PrivateStateProvider.
 *
 * Implements the full interface required by @midnight-ntwrk/midnight-js-types:
 *   - setContractAddress(address) — scopes all keys to the given contract
 *   - set(id, state) — persist by private-state-id (async, as required)
 *   - get(id) — retrieve by id (returns null if absent)
 *   - remove(id) — remove by id
 *
 * The synchronous `.get()` helper (no id argument) is kept for backward
 * compatibility with contractService.ts internals.
 */

import type { PayrollPrivateState } from 'private-payroll-contract';

const STORAGE_KEY_PREFIX = 'midnight_payroll_private_state_';

export class LocalPrivateStateProvider {
  private accountAddress: string;
  private contractAddress: string = '';
  private signingKeys: Map<string, any> = new Map();

  constructor(accountAddress: string) {
    this.accountAddress = accountAddress;
  }

  // ── PrivateStateProvider interface ────────────────────────────────────────

  /** Called by midnight-js before any get/set — sets the namespace. */
  setContractAddress(address: string): void {
    this.contractAddress = address;
  }

  private makeKey(privateStateId: string): string {
    return `${STORAGE_KEY_PREFIX}${this.accountAddress}_${this.contractAddress}_${privateStateId}`;
  }

  /** Store private state by ID (async as required by the interface). */
  async set(privateStateId: string, state: PayrollPrivateState): Promise<void> {
    const serializable = this.serialize(state);
    localStorage.setItem(this.makeKey(privateStateId), JSON.stringify(serializable));
  }

  /** Retrieve private state by ID. Returns null if not found. */
  async get(privateStateId: string): Promise<PayrollPrivateState | null> {
    const raw = localStorage.getItem(this.makeKey(privateStateId));
    if (!raw) return null;
    try {
      return this.deserialize(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Remove stored private state for a given ID. */
  async remove(privateStateId: string): Promise<void> {
    localStorage.removeItem(this.makeKey(privateStateId));
  }

  // ── Internal sync helper (used by contractService.ts) ─────────────────────

  /**
   * Synchronous read of the latest state for any stored ID under this account.
   * Used internally by contractService to build witness private state.
   * Falls back to empty object when nothing is stored.
   */
  getSync(): PayrollPrivateState {
    // Find any matching key for this account (id-agnostic, latest wins)
    const prefix = `${STORAGE_KEY_PREFIX}${this.accountAddress}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          return this.deserialize(JSON.parse(localStorage.getItem(key)!));
        } catch { /* continue */ }
      }
    }
    return {};
  }

  async clear(): Promise<void> {
    const prefix = `${STORAGE_KEY_PREFIX}${this.accountAddress}_`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }

  // ── Signing Key Methods (Required by Midnight.js) ─────────────────────────

  private makeSigningKeyStorageKey(address: string): string {
    return `${STORAGE_KEY_PREFIX}sk_${this.accountAddress}_${address}`;
  }

  async setSigningKey(address: string, signingKey: any): Promise<void> {
    this.signingKeys.set(address, signingKey);
    try {
      const serialized =
        typeof signingKey === 'string'
          ? signingKey
          : JSON.stringify(signingKey, (_, value) =>
              typeof value === 'bigint' ? value.toString() : value,
            );
      localStorage.setItem(this.makeSigningKeyStorageKey(address), serialized);
    } catch {
      // Ephemeral fallback in map
    }
  }

  async getSigningKey(address: string): Promise<any | null> {
    if (this.signingKeys.has(address)) {
      return this.signingKeys.get(address);
    }
    const raw = localStorage.getItem(this.makeSigningKeyStorageKey(address));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      this.signingKeys.set(address, parsed);
      return parsed;
    } catch {
      this.signingKeys.set(address, raw);
      return raw;
    }
  }

  async removeSigningKey(address: string): Promise<void> {
    this.signingKeys.delete(address);
    localStorage.removeItem(this.makeSigningKeyStorageKey(address));
  }

  async clearSigningKeys(): Promise<void> {
    this.signingKeys.clear();
    const prefix = `${STORAGE_KEY_PREFIX}sk_${this.accountAddress}_`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }

  // ── Stubs for Export / Import ──────────────────────────────────────────────

  async exportPrivateStates(): Promise<any> {
    throw new Error('exportPrivateStates is not supported by LocalPrivateStateProvider');
  }

  async importPrivateStates(): Promise<any> {
    throw new Error('importPrivateStates is not supported by LocalPrivateStateProvider');
  }

  async exportSigningKeys(): Promise<any> {
    throw new Error('exportSigningKeys is not supported by LocalPrivateStateProvider');
  }

  async importSigningKeys(): Promise<any> {
    throw new Error('importSigningKeys is not supported by LocalPrivateStateProvider');
  }

  // ── Serialization helpers ─────────────────────────────────────────────────

  private serialize(state: PayrollPrivateState): any {
    return {
      callerAddress: state.callerAddress ? Array.from(state.callerAddress) : undefined,
      recipientIndex: state.recipientIndex,
      recipientAmount: state.recipientAmount?.toString(),
      recipientSalt: state.recipientSalt ? Array.from(state.recipientSalt) : undefined,
      employerAllocations: state.employerAllocations
        ? Object.fromEntries(
            Object.entries(state.employerAllocations).map(([k, v]: [string, any]) => [
              k,
              { amount: v.amount.toString(), salt: Array.from(v.salt) },
            ]),
          )
        : undefined,
    };
  }

  private deserialize(parsed: any): PayrollPrivateState {
    return {
      callerAddress: parsed.callerAddress
        ? new Uint8Array(parsed.callerAddress)
        : undefined,
      recipientIndex:  parsed.recipientIndex,
      recipientAmount: parsed.recipientAmount ? BigInt(parsed.recipientAmount) : undefined,
      recipientSalt:   parsed.recipientSalt ? new Uint8Array(parsed.recipientSalt) : undefined,
      employerAllocations: parsed.employerAllocations
        ? Object.fromEntries(
            Object.entries(parsed.employerAllocations).map(([k, v]: any) => [
              Number(k),
              { amount: BigInt(v.amount), salt: new Uint8Array(v.salt) },
            ]),
          )
        : undefined,
    };
  }
}

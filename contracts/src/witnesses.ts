/**
 * Midnight Private Payroll / Splits — Witness Providers & Private State
 *
 * Witnesses supply private inputs (employer amounts/salts, recipient claim
 * credentials, caller identity) into Compact ZK circuits on demand.
 * None of this private data is ever committed to the public ledger.
 */

import type * as runtime from '@midnight-ntwrk/compact-runtime';
import type { Ledger, Witnesses } from '../managed/payroll/contract/index.js';

export type RecipientAllocation = {
  readonly amount: bigint;
  readonly salt: Uint8Array;
};

export type PayrollPrivateState = {
  readonly callerAddress?: Uint8Array;
  // Employer state: allocations mapped by recipient index 0..3
  readonly employerAllocations?: Record<number, RecipientAllocation>;
  // Recipient state: recipient's own private amount & salt
  readonly recipientIndex?: number;
  readonly recipientAmount?: bigint;
  readonly recipientSalt?: Uint8Array;
};

/**
 * Generate a cryptographically secure 32-byte salt.
 */
export const generateSalt = (): Uint8Array => {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  return salt;
};

/**
 * Convert string address or identifier to 32-byte Uint8Array.
 */
export const stringToBytes32 = (str: string): Uint8Array => {
  const buf = new Uint8Array(32);
  const encoded = new TextEncoder().encode(str);
  buf.set(encoded.slice(0, 32));
  return buf;
};

/**
 * Convert 32-byte Uint8Array to string.
 */
export const bytes32ToString = (bytes: Uint8Array): string => {
  const firstZero = bytes.indexOf(0);
  const slice = firstZero === -1 ? bytes : bytes.slice(0, firstZero);
  return new TextDecoder().decode(slice);
};

/**
 * Encode amount into 32-byte big-endian Uint8Array.
 */
export const encodeAmount = (amount: bigint): Uint8Array => {
  const buf = new Uint8Array(32);
  let v = amount;
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
};

/**
 * Create witness implementations for the Payroll contract.
 */
export const createWitnesses = (): Witnesses<PayrollPrivateState> => ({
  getEmployerAmount: (
    context: runtime.WitnessContext<Ledger, PayrollPrivateState>,
    recipient_index_0: bigint,
  ): [PayrollPrivateState, bigint] => {
    const idx = Number(recipient_index_0);
    const amount = context.privateState.employerAllocations?.[idx]?.amount ?? 0n;
    return [context.privateState, amount];
  },

  getEmployerSalt: (
    context: runtime.WitnessContext<Ledger, PayrollPrivateState>,
    recipient_index_0: bigint,
  ): [PayrollPrivateState, Uint8Array] => {
    const idx = Number(recipient_index_0);
    const salt =
      context.privateState.employerAllocations?.[idx]?.salt ?? new Uint8Array(32);
    return [context.privateState, salt];
  },

  getRecipientAmount: (
    context: runtime.WitnessContext<Ledger, PayrollPrivateState>,
    recipient_index_0: bigint,
  ): [PayrollPrivateState, bigint] => {
    const idx = Number(recipient_index_0);
    const amount =
      context.privateState.recipientIndex === idx
        ? context.privateState.recipientAmount ?? 0n
        : context.privateState.employerAllocations?.[idx]?.amount ??
          context.privateState.recipientAmount ??
          0n;
    return [context.privateState, amount];
  },

  getRecipientSalt: (
    context: runtime.WitnessContext<Ledger, PayrollPrivateState>,
    recipient_index_0: bigint,
  ): [PayrollPrivateState, Uint8Array] => {
    const idx = Number(recipient_index_0);
    const salt =
      context.privateState.recipientIndex === idx
        ? context.privateState.recipientSalt ?? new Uint8Array(32)
        : context.privateState.employerAllocations?.[idx]?.salt ??
          context.privateState.recipientSalt ??
          new Uint8Array(32);
    return [context.privateState, salt];
  },

  getCallerAddress: (
    context: runtime.WitnessContext<Ledger, PayrollPrivateState>,
  ): [PayrollPrivateState, Uint8Array] => {
    const caller = context.privateState.callerAddress ?? new Uint8Array(32);
    return [context.privateState, caller];
  },
});

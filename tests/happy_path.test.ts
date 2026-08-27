import { describe, it, expect } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  pureCircuits,
  ledger,
  createWitnesses,
  generateSalt,
  stringToBytes32,
  bytes32ToString,
  encodeAmount,
  type PayrollPrivateState,
} from '../contracts/src/index.js';

function createDummyAddress(): runtime.ContractAddress {
  return runtime.dummyContractAddress();
}

describe('Private Payroll — Happy Path Integration Test Suite (Step 9)', () => {
  const employerAddr = stringToBytes32('midnight1_employer_hq');
  const recipient0Addr = stringToBytes32('midnight1_alice_recip');
  const recipient1Addr = stringToBytes32('midnight1_bob_recip');
  const recipient2Addr = stringToBytes32('midnight1_charlie_recip');
  const recipient3Addr = stringToBytes32('midnight1_dave_recip');

  const budget = 10000n;
  const allocations = [
    { amount: 2500n, salt: generateSalt() },
    { amount: 3500n, salt: generateSalt() },
    { amount: 1800n, salt: generateSalt() },
    { amount: 2200n, salt: generateSalt() },
  ];

  it('1. Circuit Logic: computeCommitment is deterministic and collision-resistant', () => {
    const saltA = generateSalt();
    const saltB = generateSalt();
    const hash1 = pureCircuits.computeCommitment(2500n, saltA);
    const hash2 = pureCircuits.computeCommitment(2500n, saltA);
    const hashDifferentAmount = pureCircuits.computeCommitment(3500n, saltA);
    const hashDifferentSalt = pureCircuits.computeCommitment(2500n, saltB);

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(hashDifferentAmount);
    expect(hash1).not.toEqual(hashDifferentSalt);
    expect(hash1.length).toBe(32);
  });

  it('2. Full Valid Flow: Initialize -> Assign 4 commitments -> Finalize with Sum Proof -> 4 Claims -> Audit Verify', () => {
    const employerPrivateState: PayrollPrivateState = {
      callerAddress: employerAddr,
      employerAllocations: {
        0: allocations[0],
        1: allocations[1],
        2: allocations[2],
        3: allocations[3],
      },
    };

    const witnesses = createWitnesses();
    const contract = new Contract(witnesses);

    const constructorContext: runtime.ConstructorContext<PayrollPrivateState> = {
      initialPrivateState: employerPrivateState,
      initialZswapLocalState: {},
    };

    // 1. Initialize Contract / Round
    const constructorResult = contract.initialState(
      constructorContext,
      budget,
      employerAddr,
      recipient0Addr,
      recipient1Addr,
      recipient2Addr,
      recipient3Addr,
    );

    let state = constructorResult.currentContractState;
    const contractAddr = createDummyAddress();

    const makeContext = (
      currentPrivateState: PayrollPrivateState,
    ): runtime.CircuitContext<PayrollPrivateState> =>
      runtime.createCircuitContext(
        contractAddr,
        runtime.dummyUserAddress(),
        state,
        currentPrivateState,
        undefined,
        undefined,
      );

    // Assert initial public ledger state
    let l = ledger(state.data);
    expect(l.round.budget).toBe(10000n);
    expect(l.round.status).toBe(1n); // Assigning
    expect(l.round.assigned_count).toBe(0n);
    expect(l.commitments.size()).toBe(4n);
    expect(l.sum_proof.valid).toBe(false);

    // 2. Assign Commitments for all 4 recipients
    for (let i = 0; i < 4; i++) {
      const alloc = allocations[i];
      const commitment = pureCircuits.computeCommitment(alloc.amount, alloc.salt);
      const res = contract.circuits.assign_amount(
        makeContext(employerPrivateState),
        BigInt(i),
        commitment,
      );
      state.data = res.context.currentQueryContext.state;
    }

    l = ledger(state.data);
    expect(l.round.assigned_count).toBe(4n);
    for (let i = 0n; i < 4n; i++) {
      expect(l.commitments.lookup(i).is_assigned).toBe(true);
      expect(l.commitments.lookup(i).claimed).toBe(false);
    }

    // 3. Finalize Round with Sum Proof
    const finalizeRes = contract.circuits.finalize_round(
      makeContext(employerPrivateState),
    );
    state.data = finalizeRes.context.currentQueryContext.state;

    l = ledger(state.data);
    expect(l.round.status).toBe(2n); // Finalized
    expect(l.sum_proof.valid).toBe(true);

    // 4. Each recipient claims their individual amount
    const recipientAddrs = [recipient0Addr, recipient1Addr, recipient2Addr, recipient3Addr];
    for (let i = 0; i < 4; i++) {
      const recipientPrivateState: PayrollPrivateState = {
        callerAddress: recipientAddrs[i],
        recipientIndex: i,
        recipientAmount: allocations[i].amount,
        recipientSalt: allocations[i].salt,
      };

      const claimRes = contract.circuits.claim_amount(
        makeContext(recipientPrivateState),
        BigInt(i),
      );
      state.data = claimRes.context.currentQueryContext.state;

      const currentLedger = ledger(state.data);
      expect(currentLedger.commitments.lookup(BigInt(i)).claimed).toBe(true);
    }

    // 5. Audit / Observer calls verify_total
    const auditorPrivateState: PayrollPrivateState = {
      callerAddress: stringToBytes32('midnight1_auditor'),
    };
    const auditRes = contract.circuits.verify_total(makeContext(auditorPrivateState));
    expect(auditRes.result).toBe(true);
  });

  it('3. Privacy Invariants: No plaintext individual amounts exist on ledger', () => {
    const witnesses = createWitnesses();
    const contract = new Contract(witnesses);

    const employerPrivateState: PayrollPrivateState = {
      callerAddress: employerAddr,
      employerAllocations: {
        0: allocations[0],
        1: allocations[1],
        2: allocations[2],
        3: allocations[3],
      },
    };

    const constructorResult = contract.initialState(
      { initialPrivateState: employerPrivateState, initialZswapLocalState: {} },
      budget,
      employerAddr,
      recipient0Addr,
      recipient1Addr,
      recipient2Addr,
      recipient3Addr,
    );

    let state = constructorResult.currentContractState;
    const contractAddr = createDummyAddress();

    const makeContext = (ps: PayrollPrivateState) =>
      runtime.createCircuitContext(
        contractAddr,
        runtime.dummyUserAddress(),
        state,
        ps,
        undefined,
        undefined,
      );

    // Assign
    for (let i = 0; i < 4; i++) {
      const commitment = pureCircuits.computeCommitment(
        allocations[i].amount,
        allocations[i].salt,
      );
      const res = contract.circuits.assign_amount(
        makeContext(employerPrivateState),
        BigInt(i),
        commitment,
      );
      state.data = res.context.currentQueryContext.state;
    }

    // Finalize
    const finalizeRes = contract.circuits.finalize_round(
      makeContext(employerPrivateState),
    );
    state.data = finalizeRes.context.currentQueryContext.state;

    const currentLedger = ledger(state.data);

    // Check every recipient slot on the public ledger
    for (let i = 0n; i < 4n; i++) {
      const entry = currentLedger.commitments.lookup(i);
      const expectedAmount = allocations[Number(i)].amount;
      const rawAmountEncoded = encodeAmount(expectedAmount);

      // 1. Commitment hash is 32 bytes and does not equal raw encoded amount
      expect(entry.commitment_hash.length).toBe(32);
      expect(entry.commitment_hash).not.toEqual(rawAmountEncoded);

      // 2. The entry only stores recipient_id, commitment_hash, is_assigned, and claimed
      expect(Object.keys(entry).sort()).toEqual([
        'claimed',
        'commitment_hash',
        'is_assigned',
        'recipient_id',
      ]);
      expect((entry as any).amount).toBeUndefined();
      expect((entry as any).salt).toBeUndefined();
    }
  });
});

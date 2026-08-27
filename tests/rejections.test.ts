import { describe, it, expect } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  pureCircuits,
  ledger,
  createWitnesses,
  generateSalt,
  stringToBytes32,
  type PayrollPrivateState,
} from '../contracts/src/index.js';

function createDummyAddress(): runtime.ContractAddress {
  return runtime.dummyContractAddress();
}

describe('Private Payroll — Rejections & Failure Cases Test Suite (Step 10)', () => {
  const employerAddr = stringToBytes32('midnight1_employer_hq');
  const attackerAddr = stringToBytes32('midnight1_attacker_bad');
  const recipient0Addr = stringToBytes32('midnight1_alice_recip');
  const recipient1Addr = stringToBytes32('midnight1_bob_recip');
  const recipient2Addr = stringToBytes32('midnight1_charlie_recip');
  const recipient3Addr = stringToBytes32('midnight1_dave_recip');

  const budget = 10000n;
  const validAllocations = [
    { amount: 2500n, salt: generateSalt() },
    { amount: 3500n, salt: generateSalt() },
    { amount: 1800n, salt: generateSalt() },
    { amount: 2200n, salt: generateSalt() },
  ];

  const setupInitializedRound = () => {
    const employerPrivateState: PayrollPrivateState = {
      callerAddress: employerAddr,
      employerAllocations: {
        0: validAllocations[0],
        1: validAllocations[1],
        2: validAllocations[2],
        3: validAllocations[3],
      },
    };

    const witnesses = createWitnesses();
    const contract = new Contract(witnesses);

    const constructorResult = contract.initialState(
      { initialPrivateState: employerPrivateState, initialZswapLocalState: {} },
      budget,
      employerAddr,
      recipient0Addr,
      recipient1Addr,
      recipient2Addr,
      recipient3Addr,
    );

    const state = constructorResult.currentContractState;
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

    return { contract, state, makeContext, employerPrivateState };
  };

  it('1. Invalid sum rejection: amounts sum to 9,900n != 10,000n budget at finalize_round', () => {
    const invalidAllocations = [
      { amount: 2400n, salt: generateSalt() }, // 100 less
      { amount: 3500n, salt: generateSalt() },
      { amount: 1800n, salt: generateSalt() },
      { amount: 2200n, salt: generateSalt() },
    ];

    const employerPrivateState: PayrollPrivateState = {
      callerAddress: employerAddr,
      employerAllocations: {
        0: invalidAllocations[0],
        1: invalidAllocations[1],
        2: invalidAllocations[2],
        3: invalidAllocations[3],
      },
    };

    const witnesses = createWitnesses();
    const contract = new Contract(witnesses);

    const constructorResult = contract.initialState(
      { initialPrivateState: employerPrivateState, initialZswapLocalState: {} },
      budget,
      employerAddr,
      recipient0Addr,
      recipient1Addr,
      recipient2Addr,
      recipient3Addr,
    );

    const state = constructorResult.currentContractState;
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

    // Assign all 4 with the invalid allocations
    for (let i = 0; i < 4; i++) {
      const commitment = pureCircuits.computeCommitment(
        invalidAllocations[i].amount,
        invalidAllocations[i].salt,
      );
      const res = contract.circuits.assign_amount(
        makeContext(employerPrivateState),
        BigInt(i),
        commitment,
      );
      state.data = res.context.currentQueryContext.state;
    }

    // Attempting to finalize should fail sum check
    expect(() => {
      contract.circuits.finalize_round(makeContext(employerPrivateState));
    }).toThrow(/sum of private amounts does not match public budget/i);
  });

  it('2. Incomplete assignment rejection: finalizing before all 4 recipients assigned', () => {
    const { contract, state, makeContext, employerPrivateState } = setupInitializedRound();

    // Assign only 3 recipients
    for (let i = 0; i < 3; i++) {
      const commitment = pureCircuits.computeCommitment(
        validAllocations[i].amount,
        validAllocations[i].salt,
      );
      const res = contract.circuits.assign_amount(
        makeContext(employerPrivateState),
        BigInt(i),
        commitment,
      );
      state.data = res.context.currentQueryContext.state;
    }

    expect(() => {
      contract.circuits.finalize_round(makeContext(employerPrivateState));
    }).toThrow(/cannot finalize: not all 4 recipients have been assigned/i);
  });

  it('3. Mismatched commitment rejection: recipient claiming with altered amount or wrong salt', () => {
    const { contract, state, makeContext, employerPrivateState } = setupInitializedRound();

    // Assign all 4
    for (let i = 0; i < 4; i++) {
      const commitment = pureCircuits.computeCommitment(
        validAllocations[i].amount,
        validAllocations[i].salt,
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

    // Recipient 0 tries to claim with an exaggerated amount (e.g. 5000n instead of 2500n)
    const dishonestPrivateState: PayrollPrivateState = {
      callerAddress: recipient0Addr,
      recipientIndex: 0,
      recipientAmount: 5000n,
      recipientSalt: validAllocations[0].salt,
    };

    expect(() => {
      contract.circuits.claim_amount(makeContext(dishonestPrivateState), 0n);
    }).toThrow(/claim rejected: invalid amount or salt/i);

    // Recipient 0 tries to claim with a wrong salt
    const wrongSaltPrivateState: PayrollPrivateState = {
      callerAddress: recipient0Addr,
      recipientIndex: 0,
      recipientAmount: validAllocations[0].amount,
      recipientSalt: generateSalt(),
    };

    expect(() => {
      contract.circuits.claim_amount(makeContext(wrongSaltPrivateState), 0n);
    }).toThrow(/claim rejected: invalid amount or salt/i);
  });

  it('4. Double-claim rejection: recipient cannot claim twice', () => {
    const { contract, state, makeContext, employerPrivateState } = setupInitializedRound();

    for (let i = 0; i < 4; i++) {
      const commitment = pureCircuits.computeCommitment(
        validAllocations[i].amount,
        validAllocations[i].salt,
      );
      const res = contract.circuits.assign_amount(
        makeContext(employerPrivateState),
        BigInt(i),
        commitment,
      );
      state.data = res.context.currentQueryContext.state;
    }

    const finalizeRes = contract.circuits.finalize_round(
      makeContext(employerPrivateState),
    );
    state.data = finalizeRes.context.currentQueryContext.state;

    const validRecipient0State: PayrollPrivateState = {
      callerAddress: recipient0Addr,
      recipientIndex: 0,
      recipientAmount: validAllocations[0].amount,
      recipientSalt: validAllocations[0].salt,
    };

    // First claim succeeds
    const claim1 = contract.circuits.claim_amount(
      makeContext(validRecipient0State),
      0n,
    );
    state.data = claim1.context.currentQueryContext.state;

    // Second claim must fail
    expect(() => {
      contract.circuits.claim_amount(makeContext(validRecipient0State), 0n);
    }).toThrow(/double-claim rejected/i);
  });

  it('5. Unauthorized caller rejection: non-employer cannot assign or finalize', () => {
    const { contract, state, makeContext } = setupInitializedRound();

    const attackerPrivateState: PayrollPrivateState = {
      callerAddress: attackerAddr,
    };

    const commitment = pureCircuits.computeCommitment(1000n, generateSalt());

    // Attacker cannot assign
    expect(() => {
      contract.circuits.assign_amount(
        makeContext(attackerPrivateState),
        0n,
        commitment,
      );
    }).toThrow(/unauthorized: only employer can assign amounts/i);

    // Attacker cannot finalize
    expect(() => {
      contract.circuits.finalize_round(makeContext(attackerPrivateState));
    }).toThrow(/unauthorized: only employer can finalize round/i);
  });

  it('6. Premature claim rejection: cannot claim before Finalized status', () => {
    const { contract, state, makeContext, employerPrivateState } = setupInitializedRound();

    // Assign slot 0 only
    const commitment = pureCircuits.computeCommitment(
      validAllocations[0].amount,
      validAllocations[0].salt,
    );
    const res = contract.circuits.assign_amount(
      makeContext(employerPrivateState),
      0n,
      commitment,
    );
    state.data = res.context.currentQueryContext.state;

    const recipient0State: PayrollPrivateState = {
      callerAddress: recipient0Addr,
      recipientIndex: 0,
      recipientAmount: validAllocations[0].amount,
      recipientSalt: validAllocations[0].salt,
    };

    // Attempt claim while still in Assigning status
    expect(() => {
      contract.circuits.claim_amount(makeContext(recipient0State), 0n);
    }).toThrow(/round is not Finalized: cannot claim yet/i);
  });

  it('7. Unauthorized recipient rejection: cannot claim another recipient slot', () => {
    const { contract, state, makeContext, employerPrivateState } = setupInitializedRound();

    for (let i = 0; i < 4; i++) {
      const commitment = pureCircuits.computeCommitment(
        validAllocations[i].amount,
        validAllocations[i].salt,
      );
      const res = contract.circuits.assign_amount(
        makeContext(employerPrivateState),
        BigInt(i),
        commitment,
      );
      state.data = res.context.currentQueryContext.state;
    }

    const finalizeRes = contract.circuits.finalize_round(
      makeContext(employerPrivateState),
    );
    state.data = finalizeRes.context.currentQueryContext.state;

    // Recipient 1 (Bob) tries to claim slot 0 (Alice)
    const impostorState: PayrollPrivateState = {
      callerAddress: recipient1Addr,
      recipientIndex: 0,
      recipientAmount: validAllocations[0].amount,
      recipientSalt: validAllocations[0].salt,
    };

    expect(() => {
      contract.circuits.claim_amount(makeContext(impostorState), 0n);
    }).toThrow(/unauthorized: caller is not the intended recipient/i);
  });
});

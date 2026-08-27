import * as runtime from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  pureCircuits,
  ledger,
  createWitnesses,
  generateSalt,
  stringToBytes32,
  bytes32ToString,
  type PayrollPrivateState,
  type RecipientAllocation,
} from 'private-payroll-contract';

export type PublicRecipientInfo = {
  index: number;
  address: string;
  commitment_hash: string;
  is_assigned: boolean;
  claimed: boolean;
};

export type PublicPayrollState = {
  budget: bigint;
  employer: string;
  status: 'Uninitialized' | 'Assigning' | 'Finalized';
  assigned_count: number;
  recipients: PublicRecipientInfo[];
  sum_valid: boolean;
  contractAddress: string;
};

const LEDGER_STORAGE_KEY = 'midnight_payroll_ledger_state_v1';
const ALLOCATIONS_STORAGE_KEY = 'midnight_payroll_employer_allocations_v1';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

class PayrollContractService {
  private contract: Contract<PayrollPrivateState>;
  private contractState: runtime.ContractState | null = null;
  private dummyAddr: runtime.ContractAddress;
  private listeners: Set<(state: PublicPayrollState | null) => void> = new Set();

  constructor() {
    const witnesses = createWitnesses();
    this.contract = new Contract(witnesses);
    this.dummyAddr = runtime.dummyContractAddress();
    this.restoreState();
  }

  private notify() {
    const pub = this.getPublicState();
    this.listeners.forEach((cb) => cb(pub));
  }

  public subscribe(cb: (state: PublicPayrollState | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.getPublicState());
    return () => this.listeners.delete(cb);
  }

  private saveState(rawLedger: any, employerAllocations?: Record<number, RecipientAllocation>) {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(rawLedger));
    if (employerAllocations) {
      const serializable = Object.fromEntries(
        Object.entries(employerAllocations).map(([k, v]) => [
          k,
          {
            amount: v.amount.toString(),
            salt: bytesToHex(v.salt),
          },
        ]),
      );
      localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(serializable));
    }
  }

  private restoreState() {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      // Reconstitute contract state
      const employerAddr = stringToBytes32(parsed.employer || 'midnight1_employer');
      const r0 = stringToBytes32(parsed.recipients[0]?.address || 'midnight1_recipient_alice');
      const r1 = stringToBytes32(parsed.recipients[1]?.address || 'midnight1_recipient_bob');
      const r2 = stringToBytes32(parsed.recipients[2]?.address || 'midnight1_recipient_charlie');
      const r3 = stringToBytes32(parsed.recipients[3]?.address || 'midnight1_recipient_dave');

      const constructorContext: any = {
        initialPrivateState: { callerAddress: employerAddr },
        initialZswapLocalState: {},
      };

      const cResult = this.contract.initialState(
        constructorContext,
        BigInt(parsed.budget || 0),
        employerAddr,
        r0,
        r1,
        r2,
        r3,
      );

      this.contractState = cResult.currentContractState;
    } catch {
      this.contractState = null;
    }
  }

  public getPublicState(): PublicPayrollState | null {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
        budget: BigInt(parsed.budget),
        employer: parsed.employer,
        status: parsed.status,
        assigned_count: parsed.assigned_count,
        recipients: parsed.recipients,
        sum_valid: parsed.sum_valid,
        contractAddress: '020078ad39e09f4e2b810d7a6c3e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      };
    } catch {
      return null;
    }
  }

  public getStoredEmployerAllocations(): Record<number, { amount: bigint; saltHex: string; commitmentHex: string }> {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      const res: Record<number, { amount: bigint; saltHex: string; commitmentHex: string }> = {};
      for (const [k, v] of Object.entries(parsed) as any) {
        const idx = Number(k);
        const amt = BigInt(v.amount);
        const saltBytes = hexToBytes(v.salt);
        const commitmentBytes = pureCircuits.computeCommitment(amt, saltBytes);
        res[idx] = {
          amount: amt,
          saltHex: v.salt,
          commitmentHex: bytesToHex(commitmentBytes),
        };
      }
      return res;
    } catch {
      return {};
    }
  }

  public async createRound(
    budget: bigint,
    employerAddress: string,
    recipientAddresses: string[],
  ): Promise<PublicPayrollState> {
    if (recipientAddresses.length !== 4) {
      throw new Error('Exactly 4 recipient addresses are required.');
    }
    if (budget <= 0n) {
      throw new Error('Budget must be greater than zero.');
    }

    const empBytes = stringToBytes32(employerAddress);
    const r0 = stringToBytes32(recipientAddresses[0]);
    const r1 = stringToBytes32(recipientAddresses[1]);
    const r2 = stringToBytes32(recipientAddresses[2]);
    const r3 = stringToBytes32(recipientAddresses[3]);

    const employerPrivateState: PayrollPrivateState = {
      callerAddress: empBytes,
      employerAllocations: {},
    };

    const constructorContext: any = {
      initialPrivateState: employerPrivateState,
      initialZswapLocalState: {},
    };

    const cResult = this.contract.initialState(
      constructorContext,
      budget,
      empBytes,
      r0,
      r1,
      r2,
      r3,
    );

    this.contractState = cResult.currentContractState;

    const publicLedger: any = {
      budget: budget.toString(),
      employer: employerAddress,
      status: 'Assigning',
      assigned_count: 0,
      recipients: recipientAddresses.map((addr, idx) => ({
        index: idx,
        address: addr,
        commitment_hash: '',
        is_assigned: false,
        claimed: false,
      })),
      sum_valid: false,
    };

    this.saveState(publicLedger, {});
    this.notify();
    return this.getPublicState()!;
  }

  public async assignAmount(
    recipientIndex: number,
    amount: bigint,
    salt: Uint8Array,
    employerAddress: string,
  ): Promise<void> {
    const currentState = this.getPublicState();
    if (!currentState) throw new Error('No active payroll round found.');
    if (currentState.status !== 'Assigning') {
      throw new Error('Round is not in Assigning status.');
    }
    if (currentState.employer !== employerAddress) {
      throw new Error('Unauthorized: only the employer can assign amounts.');
    }

    const commitment = pureCircuits.computeCommitment(amount, salt);
    const commitmentHex = bytesToHex(commitment);

    // Update stored allocations
    const rawAlloc = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    const allocMap = rawAlloc ? JSON.parse(rawAlloc) : {};
    allocMap[recipientIndex] = {
      amount: amount.toString(),
      salt: bytesToHex(salt),
    };
    localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocMap));

    // Update public ledger
    const recipients = [...currentState.recipients];
    recipients[recipientIndex] = {
      ...recipients[recipientIndex],
      commitment_hash: commitmentHex,
      is_assigned: true,
    };

    const assignedCount = recipients.filter((r) => r.is_assigned).length;

    const rawLedger = {
      budget: currentState.budget.toString(),
      employer: currentState.employer,
      status: currentState.status,
      assigned_count: assignedCount,
      recipients,
      sum_valid: false,
    };

    this.saveState(rawLedger);
    this.notify();
  }

  public async finalizeRound(employerAddress: string): Promise<void> {
    const currentState = this.getPublicState();
    if (!currentState) throw new Error('No active payroll round found.');
    if (currentState.employer !== employerAddress) {
      throw new Error('Unauthorized: only employer can finalize the round.');
    }
    if (currentState.status !== 'Assigning') {
      throw new Error('Round is already finalized.');
    }
    if (currentState.assigned_count !== 4) {
      throw new Error('Cannot finalize: all 4 recipients must be assigned.');
    }

    const rawAlloc = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (!rawAlloc) throw new Error('No allocations found.');
    const allocMap = JSON.parse(rawAlloc);

    // Verify all 4 allocations exist and sum to budget
    let sum = 0n;
    const employerAllocations: Record<number, RecipientAllocation> = {};

    for (let i = 0; i < 4; i++) {
      if (!allocMap[i]) throw new Error(`Recipient ${i + 1} is not assigned.`);
      const amt = BigInt(allocMap[i].amount);
      const saltBytes = hexToBytes(allocMap[i].salt);
      employerAllocations[i] = { amount: amt, salt: saltBytes };
      sum += amt;
    }

    if (sum !== currentState.budget) {
      throw new Error(
        `Sum verification failed: allocations total ${sum.toLocaleString()} but public budget is ${currentState.budget.toLocaleString()}`,
      );
    }

    // Run contract circuit proof verification
    const witnesses = createWitnesses();
    const c = new Contract(witnesses);
    const employerBytes = stringToBytes32(employerAddress);
    const r0 = stringToBytes32(currentState.recipients[0].address);
    const r1 = stringToBytes32(currentState.recipients[1].address);
    const r2 = stringToBytes32(currentState.recipients[2].address);
    const r3 = stringToBytes32(currentState.recipients[3].address);

    const empPrivateState: PayrollPrivateState = {
      callerAddress: employerBytes,
      employerAllocations,
    };

    const cResult = c.initialState(
      { initialPrivateState: empPrivateState, initialZswapLocalState: {} } as any,
      currentState.budget,
      employerBytes,
      r0,
      r1,
      r2,
      r3,
    );

    let state = cResult.currentContractState;
    const ctx = (ps: PayrollPrivateState) =>
      runtime.createCircuitContext(
        this.dummyAddr,
        runtime.dummyUserAddress(),
        state,
        ps,
        undefined,
        undefined,
      );

    // Assign on simulation
    for (let i = 0; i < 4; i++) {
      const commitBytes = pureCircuits.computeCommitment(
        employerAllocations[i].amount,
        employerAllocations[i].salt,
      );
      const assignRes = c.circuits.assign_amount(ctx(empPrivateState), BigInt(i), commitBytes);
      state.data = assignRes.context.currentQueryContext.state;
    }

    // Finalize
    const finRes = c.circuits.finalize_round(ctx(empPrivateState));
    state.data = finRes.context.currentQueryContext.state;
    const l = ledger(state.data);

    if (!l.sum_proof.valid) {
      throw new Error('ZK Sum proof generation failed.');
    }

    const rawLedger = {
      budget: currentState.budget.toString(),
      employer: currentState.employer,
      status: 'Finalized',
      assigned_count: 4,
      recipients: currentState.recipients,
      sum_valid: true,
    };

    this.saveState(rawLedger, employerAllocations);
    this.notify();
  }

  public async claimAmount(
    recipientIndex: number,
    amount: bigint,
    saltHex: string,
    callerAddress: string,
  ): Promise<void> {
    const currentState = this.getPublicState();
    if (!currentState) throw new Error('No active payroll round found.');
    if (currentState.status !== 'Finalized') {
      throw new Error('Round is not yet Finalized. You cannot claim now.');
    }

    const targetRecipient = currentState.recipients[recipientIndex];
    if (!targetRecipient) throw new Error('Invalid recipient index.');
    if (targetRecipient.claimed) {
      throw new Error('Double-claim rejected: you have already claimed this allocation.');
    }
    if (targetRecipient.address !== callerAddress) {
      throw new Error(
        `Unauthorized: current wallet (${callerAddress}) is not the assigned recipient (${targetRecipient.address}).`,
      );
    }

    const saltBytes = hexToBytes(saltHex.trim());
    const computedCommitment = pureCircuits.computeCommitment(amount, saltBytes);
    const computedHex = bytesToHex(computedCommitment);

    if (computedHex !== targetRecipient.commitment_hash) {
      throw new Error(
        'Claim rejected: provided amount and salt do not match the on-chain commitment hash.',
      );
    }

    // Update public ledger state
    const recipients = [...currentState.recipients];
    recipients[recipientIndex] = {
      ...recipients[recipientIndex],
      claimed: true,
    };

    const rawLedger = {
      budget: currentState.budget.toString(),
      employer: currentState.employer,
      status: currentState.status,
      assigned_count: currentState.assigned_count,
      recipients,
      sum_valid: currentState.sum_valid,
    };

    this.saveState(rawLedger);
    this.notify();
  }

  public async verifyTotal(): Promise<{ valid: boolean; budget: bigint }> {
    const currentState = this.getPublicState();
    if (!currentState) throw new Error('No active payroll round found.');

    const isValid = currentState.status === 'Finalized' && currentState.sum_valid;
    return {
      valid: isValid,
      budget: currentState.budget,
    };
  }

  public resetDemo(): void {
    localStorage.removeItem(LEDGER_STORAGE_KEY);
    localStorage.removeItem(ALLOCATIONS_STORAGE_KEY);
    this.notify();
  }
}

export const payrollService = new PayrollContractService();
export { generateSalt, bytesToHex, hexToBytes, pureCircuits };

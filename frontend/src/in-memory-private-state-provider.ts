import type { PayrollPrivateState } from 'private-payroll-contract';

const STORAGE_KEY_PREFIX = 'midnight_payroll_private_state_';

export class LocalPrivateStateProvider {
  private key: string;

  constructor(accountAddress: string) {
    this.key = `${STORAGE_KEY_PREFIX}${accountAddress}`;
  }

  get(): PayrollPrivateState {
    const raw = localStorage.getItem(this.key);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      // Restore Uint8Arrays
      const state: PayrollPrivateState = {
        callerAddress: parsed.callerAddress
          ? new Uint8Array(parsed.callerAddress)
          : undefined,
        recipientIndex: parsed.recipientIndex,
        recipientAmount: parsed.recipientAmount
          ? BigInt(parsed.recipientAmount)
          : undefined,
        recipientSalt: parsed.recipientSalt
          ? new Uint8Array(parsed.recipientSalt)
          : undefined,
        employerAllocations: parsed.employerAllocations
          ? Object.fromEntries(
              Object.entries(parsed.employerAllocations).map(([k, v]: any) => [
                Number(k),
                {
                  amount: BigInt(v.amount),
                  salt: new Uint8Array(v.salt),
                },
              ]),
            )
          : undefined,
      };
      return state;
    } catch {
      return {};
    }
  }

  set(state: PayrollPrivateState): void {
    const serializable = {
      callerAddress: state.callerAddress
        ? Array.from(state.callerAddress)
        : undefined,
      recipientIndex: state.recipientIndex,
      recipientAmount: state.recipientAmount?.toString(),
      recipientSalt: state.recipientSalt
        ? Array.from(state.recipientSalt)
        : undefined,
      employerAllocations: state.employerAllocations
        ? Object.fromEntries(
            Object.entries(state.employerAllocations).map(([k, v]: [string, any]) => [
              k,
              {
                amount: v.amount.toString(),
                salt: Array.from(v.salt),
              },
            ]),
          )
        : undefined,
    };
    localStorage.setItem(this.key, JSON.stringify(serializable));
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}

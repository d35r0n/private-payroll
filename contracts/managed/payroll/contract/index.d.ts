import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getEmployerAmount(context: __compactRuntime.WitnessContext<Ledger, PS>,
                    recipient_index_0: bigint): [PS, bigint];
  getEmployerSalt(context: __compactRuntime.WitnessContext<Ledger, PS>,
                  recipient_index_0: bigint): [PS, Uint8Array];
  getRecipientAmount(context: __compactRuntime.WitnessContext<Ledger, PS>,
                     recipient_index_0: bigint): [PS, bigint];
  getRecipientSalt(context: __compactRuntime.WitnessContext<Ledger, PS>,
                   recipient_index_0: bigint): [PS, Uint8Array];
  getCallerAddress(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  create_round(context: __compactRuntime.CircuitContext<PS>,
               budget_0: bigint,
               recipient0_0: Uint8Array,
               recipient1_0: Uint8Array,
               recipient2_0: Uint8Array,
               recipient3_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  assign_amount(context: __compactRuntime.CircuitContext<PS>,
                recipient_index_0: bigint,
                commitment_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalize_round(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  claim_amount(context: __compactRuntime.CircuitContext<PS>,
               recipient_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_total(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  create_round(context: __compactRuntime.CircuitContext<PS>,
               budget_0: bigint,
               recipient0_0: Uint8Array,
               recipient1_0: Uint8Array,
               recipient2_0: Uint8Array,
               recipient3_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  assign_amount(context: __compactRuntime.CircuitContext<PS>,
                recipient_index_0: bigint,
                commitment_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalize_round(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  claim_amount(context: __compactRuntime.CircuitContext<PS>,
               recipient_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_total(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  computeCommitment(amount_0: bigint, salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  computeCommitment(context: __compactRuntime.CircuitContext<PS>,
                    amount_0: bigint,
                    salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  create_round(context: __compactRuntime.CircuitContext<PS>,
               budget_0: bigint,
               recipient0_0: Uint8Array,
               recipient1_0: Uint8Array,
               recipient2_0: Uint8Array,
               recipient3_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  assign_amount(context: __compactRuntime.CircuitContext<PS>,
                recipient_index_0: bigint,
                commitment_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  finalize_round(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  claim_amount(context: __compactRuntime.CircuitContext<PS>,
               recipient_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_total(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly round: { budget: bigint,
                    employer: Uint8Array,
                    status: bigint,
                    assigned_count: bigint
                  };
  commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { recipient_id: Uint8Array,
                             commitment_hash: Uint8Array,
                             is_assigned: boolean,
                             claimed: boolean
                           };
    [Symbol.iterator](): Iterator<[bigint, { recipient_id: Uint8Array,
  commitment_hash: Uint8Array,
  is_assigned: boolean,
  claimed: boolean
}]>
  };
  readonly sum_proof: { valid: boolean };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               budget_0: bigint,
               employer_0: Uint8Array,
               recipient0_0: Uint8Array,
               recipient1_0: Uint8Array,
               recipient2_0: Uint8Array,
               recipient3_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

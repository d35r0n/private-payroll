import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
}

export type ProvableCircuits<PS> = {
}

export type PureCircuits = {
  compute_commitment(amount_0: bigint, salt_0: Uint8Array): Uint8Array;
  prove_total(amount1_0: bigint,
              salt1_0: Uint8Array,
              amount2_0: bigint,
              salt2_0: Uint8Array,
              amount3_0: bigint,
              salt3_0: Uint8Array,
              amount4_0: bigint,
              salt4_0: Uint8Array,
              budget_0: bigint,
              commitment1_0: Uint8Array,
              commitment2_0: Uint8Array,
              commitment3_0: Uint8Array,
              commitment4_0: Uint8Array): boolean;
}

export type Circuits<PS> = {
  compute_commitment(context: __compactRuntime.CircuitContext<PS>,
                     amount_0: bigint,
                     salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  prove_total(context: __compactRuntime.CircuitContext<PS>,
              amount1_0: bigint,
              salt1_0: Uint8Array,
              amount2_0: bigint,
              salt2_0: Uint8Array,
              amount3_0: bigint,
              salt3_0: Uint8Array,
              amount4_0: bigint,
              salt4_0: Uint8Array,
              budget_0: bigint,
              commitment1_0: Uint8Array,
              commitment2_0: Uint8Array,
              commitment3_0: Uint8Array,
              commitment4_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

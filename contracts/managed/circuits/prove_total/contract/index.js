import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_2 = __compactRuntime.CompactTypeBoolean;

class _tuple_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_0.fromValue(value_0),
      _descriptor_1.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0[0]).concat(_descriptor_1.toValue(value_0[1]));
  }
}

const _descriptor_3 = new _tuple_0();

class _Either_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_2.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_4 = new _Either_0();

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_6 = new _ContractAddress_0();

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      compute_commitment(context, ...args_1) {
        return { result: pureCircuits.compute_commitment(...args_1), context };
      },
      prove_total(context, ...args_1) {
        return { result: pureCircuits.prove_total(...args_1), context };
      }
    };
    this.impureCircuits = {};
    this.provableCircuits = {};
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_3, value_0);
    return result_0;
  }
  _compute_commitment_0(amount_0, salt_0) {
    return this._persistentHash_0([amount_0, salt_0]);
  }
  _prove_total_0(amount1_0,
                 salt1_0,
                 amount2_0,
                 salt2_0,
                 amount3_0,
                 salt3_0,
                 amount4_0,
                 salt4_0,
                 budget_0,
                 commitment1_0,
                 commitment2_0,
                 commitment3_0,
                 commitment4_0)
  {
    __compactRuntime.assert(this._equal_0(this._compute_commitment_0(amount1_0,
                                                                     salt1_0),
                                          commitment1_0),
                            'commitment 1 mismatch');
    __compactRuntime.assert(this._equal_1(this._compute_commitment_0(amount2_0,
                                                                     salt2_0),
                                          commitment2_0),
                            'commitment 2 mismatch');
    __compactRuntime.assert(this._equal_2(this._compute_commitment_0(amount3_0,
                                                                     salt3_0),
                                          commitment3_0),
                            'commitment 3 mismatch');
    __compactRuntime.assert(this._equal_3(this._compute_commitment_0(amount4_0,
                                                                     salt4_0),
                                          commitment4_0),
                            'commitment 4 mismatch');
    const total_0 = amount1_0 + amount2_0 + amount3_0 + amount4_0;
    __compactRuntime.assert(this._equal_4(total_0, budget_0),
                            'sum of private amounts does not equal public budget');
    return true;
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {
  compute_commitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`compute_commitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const amount_0 = args_0[0];
    const salt_0 = args_0[1];
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('compute_commitment',
                                 'argument 1',
                                 'prove_total.compact line 21 char 1',
                                 'Uint<0..18446744073709551616>',
                                 amount_0)
    }
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('compute_commitment',
                                 'argument 2',
                                 'prove_total.compact line 21 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._compute_commitment_0(amount_0, salt_0);
  },
  prove_total: (...args_0) => {
    if (args_0.length !== 13) {
      throw new __compactRuntime.CompactError(`prove_total: expected 13 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const amount1_0 = args_0[0];
    const salt1_0 = args_0[1];
    const amount2_0 = args_0[2];
    const salt2_0 = args_0[3];
    const amount3_0 = args_0[4];
    const salt3_0 = args_0[5];
    const amount4_0 = args_0[6];
    const salt4_0 = args_0[7];
    const budget_0 = args_0[8];
    const commitment1_0 = args_0[9];
    const commitment2_0 = args_0[10];
    const commitment3_0 = args_0[11];
    const commitment4_0 = args_0[12];
    if (!(typeof(amount1_0) === 'bigint' && amount1_0 >= 0n && amount1_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 1',
                                 'prove_total.compact line 25 char 1',
                                 'Uint<0..18446744073709551616>',
                                 amount1_0)
    }
    if (!(salt1_0.buffer instanceof ArrayBuffer && salt1_0.BYTES_PER_ELEMENT === 1 && salt1_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 2',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 salt1_0)
    }
    if (!(typeof(amount2_0) === 'bigint' && amount2_0 >= 0n && amount2_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 3',
                                 'prove_total.compact line 25 char 1',
                                 'Uint<0..18446744073709551616>',
                                 amount2_0)
    }
    if (!(salt2_0.buffer instanceof ArrayBuffer && salt2_0.BYTES_PER_ELEMENT === 1 && salt2_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 4',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 salt2_0)
    }
    if (!(typeof(amount3_0) === 'bigint' && amount3_0 >= 0n && amount3_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 5',
                                 'prove_total.compact line 25 char 1',
                                 'Uint<0..18446744073709551616>',
                                 amount3_0)
    }
    if (!(salt3_0.buffer instanceof ArrayBuffer && salt3_0.BYTES_PER_ELEMENT === 1 && salt3_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 6',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 salt3_0)
    }
    if (!(typeof(amount4_0) === 'bigint' && amount4_0 >= 0n && amount4_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 7',
                                 'prove_total.compact line 25 char 1',
                                 'Uint<0..18446744073709551616>',
                                 amount4_0)
    }
    if (!(salt4_0.buffer instanceof ArrayBuffer && salt4_0.BYTES_PER_ELEMENT === 1 && salt4_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 8',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 salt4_0)
    }
    if (!(typeof(budget_0) === 'bigint' && budget_0 >= 0n && budget_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 9',
                                 'prove_total.compact line 25 char 1',
                                 'Uint<0..18446744073709551616>',
                                 budget_0)
    }
    if (!(commitment1_0.buffer instanceof ArrayBuffer && commitment1_0.BYTES_PER_ELEMENT === 1 && commitment1_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 10',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 commitment1_0)
    }
    if (!(commitment2_0.buffer instanceof ArrayBuffer && commitment2_0.BYTES_PER_ELEMENT === 1 && commitment2_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 11',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 commitment2_0)
    }
    if (!(commitment3_0.buffer instanceof ArrayBuffer && commitment3_0.BYTES_PER_ELEMENT === 1 && commitment3_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 12',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 commitment3_0)
    }
    if (!(commitment4_0.buffer instanceof ArrayBuffer && commitment4_0.BYTES_PER_ELEMENT === 1 && commitment4_0.length === 32)) {
      __compactRuntime.typeError('prove_total',
                                 'argument 13',
                                 'prove_total.compact line 25 char 1',
                                 'Bytes<32>',
                                 commitment4_0)
    }
    return _dummyContract._prove_total_0(amount1_0,
                                         salt1_0,
                                         amount2_0,
                                         salt2_0,
                                         amount3_0,
                                         salt3_0,
                                         amount4_0,
                                         salt4_0,
                                         budget_0,
                                         commitment1_0,
                                         commitment2_0,
                                         commitment3_0,
                                         commitment4_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map

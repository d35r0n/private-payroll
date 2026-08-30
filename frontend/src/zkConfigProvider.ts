/**
 * Custom ZKConfigProvider for Midnight Private Payroll.
 * Embeds verifier keys and ZKIR directly to avoid network round-trips or 404 errors,
 * while safely resolving prover keys on-demand.
 */

import { Buffer } from 'buffer';
import {
  ZKConfigProvider,
  createVerifierKey,
  createProverKey,
  createZKIR,
  type VerifierKey,
  type ProverKey,
  type ZKIR,
} from '@midnight-ntwrk/midnight-js-types';
import { EMBEDDED_VERIFIER_KEYS, EMBEDDED_ZKIR } from './embeddedZkConfig';

function base64ToUint8(base64: string): Uint8Array {
  const buf = Buffer.from(base64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export class PayrollZKConfigProvider extends ZKConfigProvider<string> {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    super();
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  public async getVerifierKey(circuitId: string): Promise<VerifierKey> {
    const name = circuitId.includes('#') ? circuitId.split('#')[1] : circuitId;

    if (EMBEDDED_VERIFIER_KEYS[name]) {
      return createVerifierKey(base64ToUint8(EMBEDDED_VERIFIER_KEYS[name]));
    }

    const host = this.baseUrl || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
    const url = `${host}/keys/${name}.verifier`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch verifier key for ${circuitId} from ${url}: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return createVerifierKey(new Uint8Array(buf));
  }

  public async getZKIR(circuitId: string): Promise<ZKIR> {
    const name = circuitId.includes('#') ? circuitId.split('#')[1] : circuitId;

    if (EMBEDDED_ZKIR[name]) {
      return createZKIR(base64ToUint8(EMBEDDED_ZKIR[name]));
    }

    const host = this.baseUrl || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
    const url = `${host}/zkir/${name}.bzkir`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ZKIR for ${circuitId} from ${url}: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return createZKIR(new Uint8Array(buf));
  }

  public async getProverKey(circuitId: string): Promise<ProverKey> {
    const name = circuitId.includes('#') ? circuitId.split('#')[1] : circuitId;
    const host = this.baseUrl || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
    const url = `${host}/keys/${name}.prover`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch prover key for ${circuitId} from ${url}: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return createProverKey(new Uint8Array(buf));
  }
}

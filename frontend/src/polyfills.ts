/**
 * Browser polyfills for Node.js built-ins required by Midnight ledger and crypto libraries.
 */
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = (window as any).process || { env: {} };
}

if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;
  (globalThis as any).process = (globalThis as any).process || { env: {} };
}

export { Buffer };

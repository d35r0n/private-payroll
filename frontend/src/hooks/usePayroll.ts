import { useState, useEffect, useCallback } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  payrollService,
  type PublicPayrollState,
} from '../contractService';

export function usePayroll(wallet?: ConnectedAPI | null) {
  const [payrollState, setPayrollState] = useState<PublicPayrollState | null>(() =>
    payrollService.getPublicState(),
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError]     = useState<string | null>(null);

  // Re-initialize the contract service whenever the wallet changes
  useEffect(() => {
    if (!wallet) return;
    payrollService.init(wallet).catch((e) => {
      setError(e?.message ?? 'Failed to initialize contract service.');
    });
  }, [wallet]);

  // Subscribe to live state updates from the service (indexer stream)
  useEffect(() => {
    const unsubscribe = payrollService.subscribe((newState) => {
      setPayrollState(newState);
    });
    return unsubscribe;
  }, []);

  // ── Step 1 ───────────────────────────────────────────────────────────────

  const createRound = useCallback(
    async (budget: bigint, recipients: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const state = await payrollService.createRound(budget, recipients);
        setPayrollState(state);
        return state;
      } catch (e: any) {
        setError(e.message || 'Failed to create round.');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Step 2 ───────────────────────────────────────────────────────────────

  const assignAmount = useCallback(
    async (recipientIndex: number, amount: bigint, salt: Uint8Array) => {
      setLoading(true);
      setError(null);
      try {
        await payrollService.assignAmount(recipientIndex, amount, salt);
      } catch (e: any) {
        setError(e.message || 'Failed to assign amount.');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Step 3 ───────────────────────────────────────────────────────────────

  const finalizeRound = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await payrollService.finalizeRound();
    } catch (e: any) {
      setError(e.message || 'Failed to finalize round.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step 4 ───────────────────────────────────────────────────────────────

  const claimAmount = useCallback(
    async (recipientIndex: number, amount: bigint, salt: Uint8Array) => {
      setLoading(true);
      setError(null);
      try {
        await payrollService.claimAmount(recipientIndex, amount, salt);
      } catch (e: any) {
        setError(e.message || 'Failed to claim amount.');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Audit ────────────────────────────────────────────────────────────────

  const verifyTotal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await payrollService.verifyTotal();
    } catch (e: any) {
      setError(e.message || 'Failed to verify total.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Deploy ────────────────────────────────────────────────────────────────

  const deployContract = useCallback(
    async (budget: bigint = 10000n, recipients?: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await payrollService.deployWithWallet(wallet, budget, recipients);
        return res;
      } catch (e: any) {
        setError(e.message || 'Failed to deploy contract.');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [wallet],
  );

  const setContractAddress = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      await payrollService.setContractAddress(address);
    } catch (e: any) {
      setError(e.message || 'Failed to attach to contract address.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetDemo = useCallback(() => {
    payrollService.resetLocalState();
    setError(null);
  }, []);

  return {
    payrollState,
    contractAddress: payrollService.getContractAddress(),
    loading,
    error,
    createRound,
    assignAmount,
    finalizeRound,
    claimAmount,
    verifyTotal,
    deployContract,
    setContractAddress,
    resetDemo,
    clearError: () => setError(null),
  };
}

// Re-export type for pages that import it from here
export type { PublicPayrollState };

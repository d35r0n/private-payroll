import { useState, useEffect, useCallback } from 'react';
import {
  payrollService,
  type PublicPayrollState,
  type PublicRecipientInfo,
} from '../contractService';

export function usePayroll() {
  const [payrollState, setPayrollState] = useState<PublicPayrollState | null>(() =>
    payrollService.getPublicState(),
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = payrollService.subscribe((newState) => {
      setPayrollState(newState);
    });
    return unsubscribe;
  }, []);

  const createRound = useCallback(
    async (budget: bigint, employerAddress: string, recipients: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const state = await payrollService.createRound(
          budget,
          employerAddress,
          recipients,
        );
        setPayrollState(state);
        return state;
      } catch (e: any) {
        setError(e.message || 'Failed to create round');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const assignAmount = useCallback(
    async (
      recipientIndex: number,
      amount: bigint,
      salt: Uint8Array,
      employerAddress: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        await payrollService.assignAmount(
          recipientIndex,
          amount,
          salt,
          employerAddress,
        );
      } catch (e: any) {
        setError(e.message || 'Failed to assign amount');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const finalizeRound = useCallback(async (employerAddress: string) => {
    setLoading(true);
    setError(null);
    try {
      await payrollService.finalizeRound(employerAddress);
    } catch (e: any) {
      setError(e.message || 'Failed to finalize round');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const claimAmount = useCallback(
    async (
      recipientIndex: number,
      amount: bigint,
      saltHex: string,
      callerAddress: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        await payrollService.claimAmount(
          recipientIndex,
          amount,
          saltHex,
          callerAddress,
        );
      } catch (e: any) {
        setError(e.message || 'Failed to claim amount');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const verifyTotal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await payrollService.verifyTotal();
    } catch (e: any) {
      setError(e.message || 'Failed to verify total');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetDemo = useCallback(() => {
    payrollService.resetDemo();
    setError(null);
  }, []);

  return {
    payrollState,
    loading,
    error,
    createRound,
    assignAmount,
    finalizeRound,
    claimAmount,
    verifyTotal,
    resetDemo,
    clearError: () => setError(null),
  };
}

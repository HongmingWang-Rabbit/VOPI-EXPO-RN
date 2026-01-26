import { useState, useEffect, useCallback, useRef } from 'react';
import { vopiService } from '../services/vopi.service';
import { CreditBalance, CreditPack, CostEstimate } from '../types/vopi.types';

export function useCredits() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await vopiService.getBalance();
      if (isMountedRef.current) {
        setBalance(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      }
    }
  }, []);

  const fetchPacks = useCallback(async () => {
    try {
      const data = await vopiService.getPacks();
      if (isMountedRef.current) {
        setPacks(data.packs);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch packs');
      }
    }
  }, []);

  const estimateCost = useCallback(
    async (videoDurationSeconds: number, frameCount?: number): Promise<CostEstimate | null> => {
      try {
        return await vopiService.estimateCost(videoDurationSeconds, frameCount);
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to estimate cost');
        }
        return null;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    await Promise.all([fetchBalance(), fetchPacks()]);
    if (isMountedRef.current) {
      setLoading(false);
    }
  }, [fetchBalance, fetchPacks]);

  useEffect(() => {
    isMountedRef.current = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchBalance(), fetchPacks()]);
      if (isMountedRef.current) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchBalance, fetchPacks]);

  return {
    balance: balance?.balance ?? 0,
    transactions: balance?.transactions ?? [],
    packs,
    loading,
    error,
    refresh,
    estimateCost,
  };
}

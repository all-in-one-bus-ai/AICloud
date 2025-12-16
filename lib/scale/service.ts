import { useState, useEffect, useCallback } from 'react';

const SCALE_ENDPOINT = 'http://localhost:7070/scale/weight';
const POLL_INTERVAL = 500;

interface ScaleWeight {
  weight: number;
  unit: string;
  stable: boolean;
}

export function useScaleWeight(autoConnect: boolean = false) {
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const fetchWeight = useCallback(async () => {
    try {
      const response = await fetch(SCALE_ENDPOINT, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const data: ScaleWeight = await response.json();
        setCurrentWeight(data.weight || 0);
        setIsConnected(true);
        setLastUpdated(new Date());
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!isPolling || !autoConnect) return;

    const interval = setInterval(fetchWeight, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isPolling, autoConnect, fetchWeight]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const manualFetch = useCallback(async () => {
    await fetchWeight();
  }, [fetchWeight]);

  return {
    currentWeight,
    isConnected,
    lastUpdated,
    isPolling,
    startPolling,
    stopPolling,
    manualFetch,
  };
}

export async function checkScaleConnection(): Promise<boolean> {
  try {
    const response = await fetch(SCALE_ENDPOINT, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

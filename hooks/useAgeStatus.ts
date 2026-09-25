// The signed-in person's age band and lock (activation run B, Part B5).
import { useEffect, useState } from 'react';
import { cachedAgeStatus, fetchAgeStatus, isTeenBand, subscribeAgeStatus, type AgeStatus } from '@/lib/ageBand';

export function useAgeStatus(): { status: AgeStatus | null; isTeen: boolean } {
  const [status, setStatus] = useState<AgeStatus | null>(cachedAgeStatus());
  useEffect(() => {
    const unsub = subscribeAgeStatus(setStatus);
    if (!cachedAgeStatus()) void fetchAgeStatus();
    return unsub;
  }, []);
  return { status, isTeen: isTeenBand(status?.ageBand) };
}

import { getSubscriptionTier } from '@/lib/db';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { SubscriptionTier } from '@/lib/types';

export type Tier = SubscriptionTier;

interface SubscriptionState {
  tier: Tier;
  isLoading: boolean;
}

async function fetchTier(): Promise<Tier> {
  try {
    return await getSubscriptionTier();
  } catch {
    return 'free';
  }
}

// Entitlement is read-only on the client. It is written server-side only —
// by the Stripe webhook today, and by the RevenueCat webhook once mobile
// purchases land. The old version wrote the tier it had just read back to
// Supabase, which was both a wasted round-trip and a self-grant path.
export function useSubscription(): SubscriptionState {
  const [tier, setTier] = useState<Tier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchTier().then(t => {
      if (!cancelled) {
        setTier(t);
        setIsLoading(false);
      }
    });

    // Re-read on foreground so a purchase or cancellation completed
    // elsewhere shows up without a restart.
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        fetchTier().then(t => {
          if (!cancelled) setTier(t);
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return { tier, isLoading };
}

interface TierLimits {
  maxMessages: number;
  maxCounselors: number;
  maxTokens: number;
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:    { maxMessages: 10,       maxCounselors: 3,  maxTokens: 400 },
  premium: { maxMessages: 50,       maxCounselors: 23, maxTokens: 600 },
  pro:     { maxMessages: Infinity, maxCounselors: 23, maxTokens: 1000 },
};

export function useTierLimits(): TierLimits {
  const { tier } = useSubscription();
  return TIER_LIMITS[tier];
}

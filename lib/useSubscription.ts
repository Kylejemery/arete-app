import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { syncTierToSupabase } from '@/lib/syncSubscription';

export type Tier = 'free' | 'arete' | 'arete_pro';

interface SubscriptionState {
  tier: Tier;
  isLoading: boolean;
}

async function fetchTier(): Promise<Tier> {
  if (Platform.OS !== 'ios') return 'free';
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo.entitlements.active;
    if (active['arete_pro']) return 'arete_pro';
    if (active['arete']) return 'arete';
    return 'free';
  } catch {
    return 'free';
  }
}

export function useSubscription(): SubscriptionState {
  const [tier, setTier] = useState<Tier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchTier().then(t => {
      if (!cancelled) {
        setTier(t);
        setIsLoading(false);
        syncTierToSupabase(t);
      }
    });

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        fetchTier().then(t => {
          if (!cancelled) {
            setTier(t);
            syncTierToSupabase(t);
          }
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
  free:      { maxMessages: 3,        maxCounselors: 3,  maxTokens: 400 },
  arete:     { maxMessages: 50,       maxCounselors: 23, maxTokens: 600 },
  arete_pro: { maxMessages: Infinity, maxCounselors: 23, maxTokens: 1000 },
};

export function useTierLimits(): TierLimits {
  const { tier } = useSubscription();
  return TIER_LIMITS[tier];
}

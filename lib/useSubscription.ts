import { getSubscriptionTier } from '@/lib/db';
import { supabase } from '@/lib/supabase';
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

// ─── Shared tier store ────────────────────────────────────────────────────────
// One module-level source of truth that every mounted hook subscribes to, so
// a purchase completed on the web updates the Cabinet tab, counselor chat,
// journal, and settings at the same moment — not just whichever screen
// happened to remount. Refreshes on:
//   • first mount
//   • app foreground (Android Custom Tabs, backgrounding for Safari)
//   • the in-app browser closing (iOS SFSafariViewController does not
//     background the app, so the paywall calls refreshTier() explicitly)
//   • auth state changes (sign-in / sign-out must never show a stale tier)

let currentTier: Tier = 'free';
let hasLoaded = false;
let inFlight: Promise<Tier> | null = null;
const listeners = new Set<(tier: Tier, loaded: boolean) => void>();

function notify() {
  listeners.forEach(fn => fn(currentTier, hasLoaded));
}

/** Re-read entitlement from Supabase and push it to every subscriber. */
export function refreshTier(): Promise<Tier> {
  if (inFlight) return inFlight;
  inFlight = fetchTier()
    .then(t => {
      currentTier = t;
      hasLoaded = true;
      notify();
      return t;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

let globalListenersInstalled = false;
function installGlobalListeners() {
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;

  AppState.addEventListener('change', nextState => {
    if (nextState === 'active') refreshTier();
  });

  supabase.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      currentTier = 'free';
      hasLoaded = true;
      notify();
      return;
    }
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      refreshTier();
    }
  });
}

// Entitlement is read-only on the client. It is written server-side only —
// by the Stripe webhook today, and by the RevenueCat webhook once mobile
// purchases land. The old version wrote the tier it had just read back to
// Supabase, which was both a wasted round-trip and a self-grant path.
export function useSubscription(): SubscriptionState {
  const [tier, setTier] = useState<Tier>(currentTier);
  const [isLoading, setIsLoading] = useState(!hasLoaded);

  useEffect(() => {
    installGlobalListeners();

    const listener = (t: Tier, loaded: boolean) => {
      setTier(t);
      setIsLoading(!loaded);
    };
    listeners.add(listener);

    // Sync in case the store changed between render and effect, then make
    // sure a fresh read is in flight for a newly mounted screen.
    listener(currentTier, hasLoaded);
    refreshTier();

    return () => {
      listeners.delete(listener);
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

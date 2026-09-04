'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tier } from '@/types';

// ─── Arete subscription → Academy standing ───────────────────────────────────
// The Academy has no billing of its own. Standing is read from the Arete
// subscription (profiles.tier + is_premium, written only by the Stripe
// webhook and the admin grant functions) and mapped onto the Academy's
// three historical tier names so the existing course and agent gating keeps
// working unchanged:
//
//   free    → auditor   PHIL 701, lexicon, vocab drill, daily examination,
//                       the Courtyard, and the Library
//   premium → scholar   the full curriculum, practicum, papers, composer
//   pro     → fellow    everything, all five agents
//
// academy_enrollments.tier still exists but is no longer authoritative;
// getEnrollment() overlays this mapping on top of it.

export type AreteTier = 'free' | 'premium' | 'pro';

export function normalizeTier(raw: unknown, isPremium?: boolean | null): AreteTier {
  const value = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (value === 'pro') return 'pro';
  if (value === 'premium' || value === 'arete' || value === 'scholar') return 'premium';
  return isPremium ? 'premium' : 'free';
}

export const ACADEMY_TIER_FOR: Record<AreteTier, Tier> = {
  free: 'auditor',
  premium: 'scholar',
  pro: 'fellow',
};

export const TIER_LABEL: Record<AreteTier, string> = {
  free: 'Free',
  premium: 'Arete Premium',
  pro: 'Arete Pro',
};

export interface Entitlement {
  tier: AreteTier;
  isPremium: boolean; // premium OR pro
  isAdmin: boolean;
}

export async function getEntitlement(): Promise<Entitlement> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tier: 'free', isPremium: false, isAdmin: false };
  const { data, error } = await supabase
    .from('profiles')
    .select('tier, is_premium, is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return { tier: 'free', isPremium: false, isAdmin: false };
  const tier = normalizeTier(data.tier, data.is_premium);
  return { tier, isPremium: tier !== 'free', isAdmin: data.is_admin === true };
}

export function useEntitlement(): Entitlement & { loading: boolean } {
  const [state, setState] = useState<Entitlement & { loading: boolean }>({
    tier: 'free', isPremium: false, isAdmin: false, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    getEntitlement().then(e => { if (!cancelled) setState({ ...e, loading: false }); });
    // A purchase completes in another tab (Stripe Checkout returns there),
    // so re-read when this tab regains focus.
    const onFocus = () => { getEntitlement().then(e => { if (!cancelled) setState({ ...e, loading: false }); }); };
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); };
  }, []);

  return state;
}

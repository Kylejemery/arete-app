'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/lib/useSubscription';

type PlanKey = 'monthly' | 'yearly' | 'pro';

const PLANS: {
  key: PlanKey;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  bestValue?: boolean;
}[] = [
  {
    key: 'monthly',
    name: 'Premium Monthly',
    price: '$9.99',
    cadence: '/month',
    blurb: 'Full counselor library, custom cabinet, and premium features.',
  },
  {
    key: 'yearly',
    name: 'Premium Yearly',
    price: '$79.99',
    cadence: '/year',
    blurb: 'Everything in Premium, two months free.',
    bestValue: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$19.99',
    cadence: '/month',
    blurb: 'For the most committed: everything in Premium and first access to new features.',
  },
];

const TIER_LABELS: Record<string, string> = {
  premium: 'Arete Premium',
  scholar: 'Arete Scholar',
  pro: 'Arete Pro',
};

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const { tier, isPremium, loading } = useSubscription();
  const [busyPlan, setBusyPlan] = useState<PlanKey | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (plan: PlanKey) => {
    setError(null);
    setBusyPlan(plan);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
      setBusyPlan(null);
    }
  };

  const openPortal = async () => {
    setError(null);
    setBusyPlan('portal');
    try {
      const res = await fetch('/api/create-portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not open billing portal');
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open billing portal.');
      setBusyPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <p className="text-arete-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="text-arete-muted hover:text-arete-text">
            ← Back
          </button>
          <div>
            <h1 className="font-serif text-[28px] text-arete-text leading-none tracking-tight">
              Pursue <em className="text-arete-gold not-italic">Arete</em>
            </h1>
            <p className="font-mono text-[12px] text-arete-muted mt-1">
              Unlock the full cabinet and every premium feature
            </p>
          </div>
        </div>

        {status === 'success' && (
          <div className="mb-8 rounded-xl border border-arete-gold/40 bg-arete-surface p-6">
            <p className="text-arete-gold font-semibold mb-1">Welcome to Arete Premium.</p>
            <p className="text-arete-muted text-sm">
              Your subscription is active. It may take a few seconds for your account to
              reflect the change — refresh if you don&apos;t see it yet.
            </p>
          </div>
        )}
        {status === 'cancelled' && (
          <div className="mb-8 rounded-xl border border-arete-border bg-arete-surface p-6">
            <p className="text-arete-text font-semibold mb-1">Checkout cancelled.</p>
            <p className="text-arete-muted text-sm">
              No charge was made. Whenever you&apos;re ready, the plans below will be waiting.
            </p>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {isPremium ? (
          <div className="rounded-xl border border-arete-border bg-arete-surface p-8 max-w-lg">
            <p className="font-mono text-[11px] uppercase tracking-widest text-arete-muted mb-2">
              Current plan
            </p>
            <p className="text-arete-text font-serif text-2xl mb-6">
              {TIER_LABELS[tier] ?? 'Arete Premium'}
            </p>
            <button
              onClick={openPortal}
              disabled={busyPlan === 'portal'}
              className="bg-arete-gold text-arete-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {busyPlan === 'portal' ? 'Opening…' : 'Manage subscription'}
            </button>
            <p className="text-arete-muted text-xs mt-4">
              Change plan, update payment method, or cancel — all from the billing portal.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-xl bg-arete-surface p-6 border ${
                  plan.bestValue ? 'border-arete-gold' : 'border-arete-border'
                }`}
              >
                {plan.bestValue && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-arete-gold text-arete-bg font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Best value
                  </span>
                )}
                <p className="text-arete-text font-semibold mb-1">{plan.name}</p>
                <p className="mb-4">
                  <span className="text-arete-gold font-serif text-3xl">{plan.price}</span>
                  <span className="text-arete-muted text-sm">{plan.cadence}</span>
                </p>
                <p className="text-arete-muted text-sm mb-6 flex-1">{plan.blurb}</p>
                <button
                  onClick={() => startCheckout(plan.key)}
                  disabled={busyPlan !== null}
                  className={`w-full font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 ${
                    plan.bestValue
                      ? 'bg-arete-gold text-arete-bg'
                      : 'border border-arete-gold text-arete-gold'
                  }`}
                >
                  {busyPlan === plan.key ? 'Redirecting…' : 'Choose plan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-arete-bg flex items-center justify-center">
          <p className="text-arete-muted">Loading...</p>
        </div>
      }
    >
      <UpgradeContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/lib/useSubscription';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

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
    name: 'Arete',
    price: '$9.99',
    cadence: '/month',
    blurb: '50 messages/day · All 23 counselors · Shared sessions',
  },
  {
    key: 'yearly',
    name: 'Arete Annual',
    price: '$79.99',
    cadence: '/year',
    blurb: '$6.67/mo · Save 33% · Everything in Arete',
    bestValue: true,
  },
  {
    key: 'pro',
    name: 'Arete Pro',
    price: '$19.99',
    cadence: '/month',
    blurb: 'Unlimited messages · Deepest reasoning · Model choice',
  },
];

const TIER_LABELS: Record<string, string> = {
  premium: 'Arete Premium',
  scholar: 'Arete Scholar',
  pro: 'Arete Pro',
};

// The mobile paywall's comparison table, minus the two rows that describe
// iOS-only capabilities (screen time sight, watchlists / focus blocking).
const FEATURES: { label: string; free: string; arete: string; pro: string }[] = [
  { label: 'Messages/day', free: '10', arete: '50', pro: 'Unlimited' },
  { label: 'Counselors', free: '3', arete: '23', pro: '23' },
  { label: 'Reasoning depth', free: 'Standard', arete: 'Deeper', pro: 'Deepest' },
  { label: 'Custom cabinet', free: '—', arete: '✓', pro: '✓' },
  { label: 'Shared sessions', free: '—', arete: '✓', pro: '✓' },
  { label: 'Weekly insights', free: 'Preview', arete: 'Full', pro: 'Full' },
];

// Source-specific headline copy: whoever arrives from a tease lands on a page
// that speaks to the exact thing they just reached for. Sources not listed
// fall back to the generic header. The attend / health / calendar sources from
// the mobile paywall are deliberately absent — the web has none of those.
const SOURCE_COPY: Record<string, { title: string; subtitle: string }> = {
  cabinet_daily_limit: {
    title: 'The Cabinet Was Mid-Counsel',
    subtitle: 'Ten messages a day ends most conversations early.\nPremium gives them room to finish the thought.',
  },
  cabinet_limit_card: {
    title: 'The Cabinet Was Mid-Counsel',
    subtitle: 'Ten messages a day ends most conversations early.\nPremium gives them room to finish the thought.',
  },
};

const DEFAULT_COPY = {
  title: 'Unlock Your Cabinet',
  subtitle: 'More counselors. More conversations.\nThe discipline to actually use them.',
};

function FeatureTable() {
  const cell = 'px-3 py-2 text-[13px] text-center';
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <table className="w-full border-collapse min-w-[420px]">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
            <th className="px-3 py-2 text-left text-[13px] font-normal" style={{ color: '#9aa0a6', width: '40%' }} />
            <th className={cell} style={{ color: '#9aa0a6', fontWeight: 500 }}>Free</th>
            <th className={cell} style={{ color: '#9aa0a6', fontWeight: 500 }}>Arete</th>
            <th className={cell} style={{ color: '#c9a84c', fontWeight: 600 }}>Pro</th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((row, i) => (
            <tr key={row.label} style={i % 2 === 0 ? { background: 'rgba(255,255,255,0.02)' } : undefined}>
              <td className="px-3 py-2 text-[13px] text-left" style={{ color: '#9aa0a6' }}>
                {row.label}
              </td>
              <td className={cell} style={{ color: '#e6eef8' }}>{row.free}</td>
              <td className={cell} style={{ color: '#e6eef8' }}>{row.arete}</td>
              <td className={cell} style={{ color: '#c9a84c' }}>{row.pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const src = searchParams.get('src');
  const { tier, isPremium, loading } = useSubscription();
  const [busyPlan, setBusyPlan] = useState<PlanKey | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loggedRef = useRef(false);

  // Funnel telemetry: one row per view, labeled with what triggered it, so we
  // can see which gate actually converts. Fire-and-forget; never blocks UI.
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('paywall_events').insert({
          user_id: user.id,
          source: src ?? 'unknown',
        });
      } catch {
        /* telemetry is best-effort */
      }
    })();
  }, [src]);

  const copy = (src && SOURCE_COPY[src]) || DEFAULT_COPY;

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
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* ── Header ────────────────────────────────────────────── */}
        <button
          onClick={() => router.back()}
          className="text-[13px] mb-6 hover:opacity-80"
          style={{ color: '#9aa0a6' }}
        >
          ← Back
        </button>

        <div className="mb-8">
          <div
            className="text-[10px] tracking-[3px] uppercase mb-2"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Arete
          </div>
          <h1
            className="text-[32px] font-medium leading-none tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            {copy.title}
          </h1>
          <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: '#9aa0a6' }}>
            {copy.subtitle}
          </p>
          {!isPremium && (
            <p
              className="text-[12px] mt-3"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              New members start with a 7-day free trial
            </p>
          )}
        </div>

        {status === 'success' && (
          <div
            className="mb-8 rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.4)' }}
          >
            <p className="font-semibold mb-1" style={{ color: '#c9a84c' }}>Welcome to Arete Premium.</p>
            <p className="text-sm" style={{ color: '#9aa0a6' }}>
              Your subscription is active. It may take a few seconds for your account to
              reflect the change — refresh if you don&apos;t see it yet.
            </p>
          </div>
        )}
        {status === 'cancelled' && (
          <div
            className="mb-8 rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="font-semibold mb-1" style={{ color: '#e6eef8' }}>Checkout cancelled.</p>
            <p className="text-sm" style={{ color: '#9aa0a6' }}>
              No charge was made. Whenever you&apos;re ready, the plans below will be waiting.
            </p>
          </div>
        )}
        {error && <p className="text-sm mb-6" style={{ color: '#ff4444' }}>{error}</p>}

        {/* ── Feature comparison ────────────────────────────────── */}
        <div className="mb-8">
          <FeatureTable />
        </div>

        {isPremium ? (
          <div
            className="rounded-xl p-8 max-w-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p
              className="text-[11px] uppercase tracking-[1.4px] mb-2"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              Current plan
            </p>
            <p
              className="text-2xl mb-6"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              {TIER_LABELS[tier] ?? 'Arete Premium'}
            </p>
            <button
              onClick={openPortal}
              disabled={busyPlan === 'portal'}
              className="font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ background: '#c9a84c', color: '#0f1724' }}
            >
              {busyPlan === 'portal' ? 'Opening…' : 'Manage subscription'}
            </button>
            <p className="text-xs mt-4" style={{ color: '#9aa0a6' }}>
              Change plan, update payment method, or cancel — all from the billing portal.
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className="relative flex flex-col rounded-xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: plan.bestValue
                      ? '1px solid #c9a84c'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {plan.bestValue && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[1.4px] px-3 py-1 rounded-full"
                      style={{ background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      Best value
                    </span>
                  )}
                  <p className="font-semibold mb-1" style={{ color: '#e6eef8' }}>{plan.name}</p>
                  <p className="mb-4">
                    <span
                      className="text-3xl"
                      style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: '#9aa0a6' }}>{plan.cadence}</span>
                  </p>
                  <p className="text-sm mb-6 flex-1" style={{ color: '#9aa0a6' }}>{plan.blurb}</p>
                  <button
                    onClick={() => startCheckout(plan.key)}
                    disabled={busyPlan !== null}
                    className="w-full font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
                    style={
                      plan.bestValue
                        ? { background: '#c9a84c', color: '#0f1724' }
                        : { border: '1px solid #c9a84c', color: '#c9a84c' }
                    }
                  >
                    {busyPlan === plan.key ? 'Redirecting…' : 'Start free trial'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs mt-6 max-w-lg" style={{ color: '#9aa0a6' }}>
              New subscribers get 7 days free on any plan. Cancel anytime during the trial
              and you won&apos;t be charged. If you&apos;ve subscribed before, checkout
              starts your plan immediately.
            </p>
            <p className="text-xs mt-3 max-w-lg" style={{ color: '#9aa0a6' }}>
              Subscriptions auto-renew. Manage or cancel anytime from your account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size={24} label="Loading" />
        </div>
      }
    >
      <UpgradeContent />
    </Suspense>
  );
}

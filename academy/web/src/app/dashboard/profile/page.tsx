'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getEnrollment } from '@/lib/db';
import { TIER_LABEL, useEntitlement, type AreteTier } from '@/lib/entitlement';
import { Card, CardLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Topbar from '@/components/navigation/Topbar';
import type { Enrollment } from '@/types';

// What each standing includes, in the Academy's own terms. Prices match the
// Stripe products shared with app.pursuearete.com.
const STANDING: Record<AreteTier, { price: string; includes: string[]; description: string }> = {
  free: {
    price: 'Free',
    description: 'The beginning of the examined life: the first course and the daily practices.',
    includes: [
      'PHIL 701 — The Art of Living',
      'The Lexicon and the Vocab Drill',
      'The Daily Examination',
      'The Courtyard',
      'The Library — every primary text, in full',
      '5 Symposium dialogues a day',
    ],
  },
  premium: {
    price: '$9.99/mo or $79.99/yr',
    description: 'The full curriculum and the tools of a serious student.',
    includes: [
      'Everything in Free',
      'PHIL 702–707, the logic and language tracks',
      'The Practicum, Papers, Composer, and Dissertation',
      'The corpus writes in the margins of the Library',
      '50 Symposium dialogues a day',
      'In the Arete app: all 23 counselors, 50 messages a day',
    ],
  },
  pro: {
    price: '$19.99/mo',
    description: 'Everything, without limits.',
    includes: [
      'Everything in Premium',
      'Unlimited Symposium dialogues',
      'In the Arete app: unlimited messages, deepest reasoning, model choice',
    ],
  },
};

type Plan = 'monthly' | 'yearly' | 'pro';

const PLANS: { key: Plan; name: string; price: string; note: string; best?: boolean }[] = [
  { key: 'monthly', name: 'Premium Monthly', price: '$9.99 / month', note: 'Full curriculum. Cancel anytime.' },
  { key: 'yearly', name: 'Premium Yearly', price: '$79.99 / year', note: 'Two months free.', best: true },
  { key: 'pro', name: 'Pro', price: '$19.99 / month', note: 'No limits, in the Academy or the app.' },
];

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const { tier, isPremium, isAdmin, loading: entitlementLoading } = useEntitlement();

  const [email, setEmail] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [busy, setBusy] = useState<Plan | 'portal' | 'password' | 'signout' | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Only a plan bought through Stripe has a customer for the billing portal;
  // plans granted by Arete have nothing to manage.
  const [billing, setBilling] = useState<{ source: 'stripe' | 'granted'; until: string | null } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? '');
        const { data } = await supabase
          .from('subscriptions')
          .select('billing_source, stripe_subscription_id, current_period_end')
          .eq('user_id', user.id);
        const stripeRow = (data ?? []).find(r => r.billing_source === 'stripe' && r.stripe_subscription_id);
        const grantRow = (data ?? []).find(r => r.billing_source !== 'stripe');
        setBilling(stripeRow
          ? { source: 'stripe', until: null }
          : { source: 'granted', until: grantRow?.current_period_end ?? null });
      }
      setEnrollment(await getEnrollment());
      setLoaded(true);
    }
    load();
  }, []);

  const startCheckout = async (plan: Plan) => {
    setBillingError(null);
    setBusy(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.assign(data.url);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBillingError(null);
    setBusy('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not open billing portal');
      window.location.assign(data.url);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Could not open billing portal.');
      setBusy(null);
    }
  };

  const changePassword = async () => {
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage({ ok: false, text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setBusy('password');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(null);
    if (error) {
      setPasswordMessage({ ok: false, text: error.message });
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage({ ok: true, text: 'Password updated.' });
  };

  const signOut = async () => {
    setBusy('signout');
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (!loaded || entitlementLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Loading profile...</p>
      </div>
    );
  }

  const standing = STANDING[tier];
  const enrolledDate = enrollment?.enrolled_at
    ? new Date(enrollment.enrolled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <div>
      <Topbar title="Student Profile" subtitle="Know thyself" />

      {status === 'success' && (
        <div className="mb-6 rounded-lg border border-academy-gold/50 bg-academy-card p-5">
          <p className="text-academy-gold font-semibold mb-1">Welcome to Arete Premium.</p>
          <p className="text-academy-muted text-sm">
            Your subscription is active. It can take a few seconds for your standing to update — refresh if you don&apos;t see it yet.
          </p>
        </div>
      )}
      {status === 'cancelled' && (
        <div className="mb-6 rounded-lg border border-academy-border bg-academy-card p-5">
          <p className="text-academy-text font-semibold mb-1">Checkout cancelled.</p>
          <p className="text-academy-muted text-sm">No charge was made. The plans below will be waiting whenever you&apos;re ready.</p>
        </div>
      )}
      {billingError && <p className="text-red-400 text-sm mb-6">{billingError}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Account */}
        <Card>
          <CardLabel>Account</CardLabel>
          <p className="text-academy-text text-sm font-medium mb-1">{email}</p>
          <p className="text-academy-muted text-xs">Enrolled {enrolledDate}</p>

          <div className="mt-4 pt-4 border-t border-academy-border">
            <p className="text-academy-muted text-xs uppercase tracking-wider mb-2">Change password</p>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="w-full bg-academy-bg border border-academy-border rounded-lg px-3 py-2 pr-16 text-sm text-academy-text placeholder:text-academy-muted focus:outline-none focus:border-academy-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-3 text-xs text-academy-muted hover:text-academy-text"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full bg-academy-bg border border-academy-border rounded-lg px-3 py-2 text-sm text-academy-text placeholder:text-academy-muted focus:outline-none focus:border-academy-gold"
              />
              {passwordMessage && (
                <p className={`text-xs ${passwordMessage.ok ? 'text-academy-gold' : 'text-red-400'}`}>{passwordMessage.text}</p>
              )}
              <Button size="sm" variant="ghost" onClick={changePassword} disabled={busy === 'password' || !newPassword}>
                {busy === 'password' ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-academy-border flex items-center justify-between">
            <p className="text-academy-muted text-xs">
              To delete your account, use the Arete app: Settings → Delete account.
            </p>
            <Button size="sm" variant="danger" onClick={signOut} disabled={busy === 'signout'}>
              Sign out
            </Button>
          </div>
        </Card>

        {/* Standing */}
        <Card gold>
          <CardLabel>Academic Standing</CardLabel>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-serif text-2xl text-academy-text">{TIER_LABEL[tier]}</p>
              <p className="text-academy-gold text-sm">{standing.price}</p>
            </div>
            <div className="text-3xl">{isPremium ? '🎓' : '📜'}</div>
          </div>
          <p className="text-academy-muted text-sm leading-relaxed mb-4">{standing.description}</p>
          <ul className="text-academy-text text-sm space-y-1.5">
            {standing.includes.map(line => (
              <li key={line} className="flex gap-2"><span className="text-academy-gold">✓</span><span>{line}</span></li>
            ))}
          </ul>
          {isAdmin && (
            <p className="text-academy-muted text-xs mt-4 italic">Admin: every lock is bypassed regardless of standing.</p>
          )}
        </Card>

        {/* Current Course */}
        <Card>
          <CardLabel>Current Course</CardLabel>
          <p className="text-academy-text font-semibold text-sm uppercase tracking-wider">
            {enrollment?.current_course?.toUpperCase().replace('-', ' ') ?? 'PHIL 701'}
          </p>
          <p className="text-academy-muted text-xs mt-1">Program: Advanced Study in Stoic Philosophy</p>
        </Card>

        {/* Upgrade / manage */}
        <Card className="md:col-span-2" gold={!isPremium}>
          <div id="upgrade" />
          {!isPremium ? (
            <>
              <CardLabel>Upgrade Standing</CardLabel>
              <p className="text-academy-muted text-sm leading-relaxed mb-1">
                Premium opens the full curriculum, the Practicum, Papers, the Composer, and the corpus&apos;s voice in the margins of the Library.
                One subscription covers the Academy and the Arete app.
              </p>
              <p className="text-academy-gold text-xs mb-5">New members start with a 7-day free trial.</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {PLANS.map(plan => (
                  <button
                    key={plan.key}
                    onClick={() => startCheckout(plan.key)}
                    disabled={busy !== null}
                    className={`text-left rounded-lg border p-4 transition-colors disabled:opacity-50 ${
                      plan.best ? 'border-academy-gold bg-academy-gold/5' : 'border-academy-border hover:border-academy-gold'
                    }`}
                  >
                    {plan.best && (
                      <p className="text-[10px] font-bold tracking-widest uppercase text-academy-gold mb-1">Best value</p>
                    )}
                    <p className="text-academy-text font-semibold text-sm">{plan.name}</p>
                    <p className="text-academy-gold text-sm mt-0.5">{plan.price}</p>
                    <p className="text-academy-muted text-xs mt-2">{plan.note}</p>
                    <p className="text-academy-text text-xs mt-3 font-semibold">
                      {busy === plan.key ? 'Opening checkout…' : 'Choose →'}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-academy-muted text-xs mt-4 italic">
                Payment is handled securely by Stripe. Subscriptions auto-renew; cancel anytime from this page.
              </p>
            </>
          ) : (
            <>
              <CardLabel>Subscription</CardLabel>
              {billing?.source === 'granted' ? (
                <p className="text-academy-muted text-sm leading-relaxed">
                  This plan was granted directly by Arete
                  {billing.until
                    ? ` and runs until ${new Date(billing.until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
                    : '.'}
                  {' '}There is no billing to manage.
                </p>
              ) : (
                <>
                  <p className="text-academy-muted text-sm leading-relaxed mb-4">
                    Change plan, update your card, or cancel through the billing portal.
                  </p>
                  <Button onClick={openPortal} disabled={busy === 'portal' || billing === null}>
                    {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
                  </Button>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-academy-muted italic text-sm">Loading profile...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

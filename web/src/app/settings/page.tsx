'use client';

import { useAgeStatus } from '@/lib/useAgeStatus';
import PronounSetting from '@/components/PronounSetting';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getDevPremiumOverride, setDevPremiumOverride } from '@/lib/devMode';
import PageHeader from '@/components/PageHeader';
import { upgradeHref } from '@/lib/paywall';

export default function SettingsPage() {
  // Run B, Part B5: no upgrade or subscription prompts for teens.
  const { isTeen } = useAgeStatus();
  const router = useRouter();
  const [simulatingFree, setSimulatingFree] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  // Dev Tools (tier simulation) is for admins and local development only.
  // Hidden until the profile check resolves so it never flashes for members.
  const [devToolsVisible, setDevToolsVisible] = useState(false);
  // Arete email (retention plan R9): the welcome note, the day two follow
  // up, and the weekly pattern note. Stored as profiles.email_opt_out, the
  // same flag the unsubscribe link in each email sets, so one switch covers
  // every kind of Arete email. null until the profile has loaded.
  const [emailOn, setEmailOn] = useState<boolean | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      supabase
        .from('profiles')
        .select('email_opt_out')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setEmailOn(data ? !data.email_opt_out : null));
      if (process.env.NODE_ENV !== 'production') {
        setDevToolsVisible(true);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      setDevToolsVisible(profile?.is_admin === true);
    }
    load();

    const override = getDevPremiumOverride();
    setSimulatingFree(override === false);
  }, [router]);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    const first = window.confirm(
      'This permanently deletes your account and all of your data — conversations, journal entries, beliefs, progress, and subscription records. This cannot be undone.\n\nContinue?'
    );
    if (!first) return;
    const second = window.confirm('Are you absolutely sure? Your account and every trace of your data will be gone forever.');
    if (!second) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Please sign in again and retry.');
        return;
      }
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        alert(data?.error || 'Account deletion failed. Please try again or contact support@pursuearete.com.');
        return;
      }
      await supabase.auth.signOut().catch(() => {});
      router.replace('/login');
    } catch {
      alert('Could not reach the server. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const toggleEmail = async () => {
    if (emailOn === null || emailSaving) return;
    const next = !emailOn;
    setEmailSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ email_opt_out: !next, email_opt_out_at: next ? null : new Date().toISOString() })
        .eq('id', user.id);
      if (error) {
        alert('Could not save your email preference. Please try again.');
        return;
      }
      setEmailOn(next);
    } finally {
      setEmailSaving(false);
    }
  };

  const toggleSimulateFree = () => {
    const next = !simulatingFree;
    setSimulatingFree(next);
    setDevPremiumOverride(next ? false : null);
  };

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Settings" subtitle="Manage your Arete experience" />

      <div className="max-w-lg space-y-4 mt-6">
        {/* Profile */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-3">Profile</p>
          <Link
            href="/profile"
            className="block w-full text-center bg-arete-bg border border-arete-border text-arete-text rounded-lg px-4 py-2 text-sm hover:border-arete-gold transition-colors"
          >
            👤 Edit Know Thyself Profile
          </Link>
        </div>

        <PronounSetting />

        {/* Subscription — /upgrade shows plans to free users and the Stripe
            Customer Portal entry (manage/cancel) to paid users */}
        {!isTeen && (
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-3">Subscription</p>
          <Link
            href={upgradeHref('settings_upgrade')}
            className="block w-full text-center bg-arete-bg border border-arete-border text-arete-text rounded-lg px-4 py-2 text-sm hover:border-arete-gold transition-colors"
          >
            Manage Subscription
          </Link>
        </div>
        )}

        {/* Email (retention plan R9) */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-1">Email</p>
          <p className="text-arete-muted text-xs mb-3">
            A welcome note, one follow up after your first check in, and a note when your
            counselors have noticed a pattern in your week. Nothing else.
          </p>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-arete-text text-sm">Send me Arete email</span>
            <input
              type="checkbox"
              checked={emailOn === true}
              disabled={emailOn === null || emailSaving}
              onChange={toggleEmail}
              className="h-4 w-4 accent-arete-gold disabled:opacity-50"
              aria-label="Send me Arete email"
            />
          </label>
        </div>

        {/* Account */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-3">Account</p>
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="w-full text-left text-red-400 hover:text-red-300 text-sm disabled:opacity-50 transition-colors"
          >
            {signOutLoading ? 'Signing out…' : '🚪 Sign Out'}
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="w-full text-left text-red-500/70 hover:text-red-400 text-xs mt-3 disabled:opacity-50 transition-colors"
          >
            {deletingAccount ? 'Deleting account…' : 'Delete Account'}
          </button>
        </div>

        {/* Legal */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-3">Legal</p>
          <Link
            href="/privacy"
            className="text-arete-muted hover:text-arete-text text-sm transition-colors"
          >
            Privacy Policy →
          </Link>
        </div>

        {/* Dev Tools: admins and non-production builds only */}
        {devToolsVisible && (
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-1">Dev Tools</p>
          <p className="text-arete-muted text-xs mb-3">These options reset on page reload and do not affect your account.</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-arete-text text-sm">Simulate Free Tier</p>
              <p className="text-arete-muted text-xs">Preview the app as a non-premium user</p>
            </div>
            <button
              onClick={toggleSimulateFree}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                simulatingFree ? 'bg-arete-gold' : 'bg-arete-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  simulatingFree ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

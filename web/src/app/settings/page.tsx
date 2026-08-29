'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getDevPremiumOverride, setDevPremiumOverride } from '@/lib/devMode';
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  const router = useRouter();
  const [simulatingFree, setSimulatingFree] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
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

        {/* Subscription — /upgrade shows plans to free users and the Stripe
            Customer Portal entry (manage/cancel) to paid users */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-text font-semibold mb-3">Subscription</p>
          <Link
            href="/upgrade"
            className="block w-full text-center bg-arete-bg border border-arete-border text-arete-text rounded-lg px-4 py-2 text-sm hover:border-arete-gold transition-colors"
          >
            Manage Subscription
          </Link>
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

        {/* Dev Tools */}
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
      </div>
    </div>
  );
}

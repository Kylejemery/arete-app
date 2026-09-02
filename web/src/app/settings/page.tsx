'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getDevPremiumOverride, setDevPremiumOverride } from '@/lib/devMode';
import { getShareRoutinesWithCabinet, setShareRoutinesWithCabinet } from '@/lib/storage';
import { useSubscription } from '@/lib/useSubscription';
import { useRequireUser } from '@/hooks/useRequireUser';
import { ConfirmDialog, Spinner, useToast } from '@/components/ui';
import ChapterRule from '@/components/ChapterRule';
import {
  SettingsButtonRow,
  SettingsCard,
  SettingsLinkRow,
  ToggleRow,
} from '@/components/settings/SettingsControls';
import type { SubscriptionTier } from '@/lib/types';

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Arete Premium',
  pro: 'Arete Pro',
};

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  // Settings must stay reachable before the name is set — it holds Sign Out.
  const { loading } = useRequireUser({ requireName: false });
  const { tier, loading: tierLoading } = useSubscription();

  const [shareRoutines, setShareRoutines] = useState(true);
  const [simulatingFree, setSimulatingFree] = useState(false);

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setShareRoutines(getShareRoutinesWithCabinet());
    setSimulatingFree(getDevPremiumOverride() === false);
  }, []);

  const handleSignOut = async () => {
    setSignOutOpen(false);
    setSigningOut(true);
    await supabase.auth.signOut().catch(() => {});
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleteStep(0);
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.show('Not signed in. Please sign in again and retry.');
        return;
      }
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data: { success?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        toast.show(
          data?.error ||
            'Deletion failed. Something went wrong. Please try again or contact support@pursuearete.com.'
        );
        return;
      }
      await supabase.auth.signOut().catch(() => {});
      router.replace('/login');
    } catch {
      toast.show('Deletion failed. Could not reach the server. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    );
  }

  const isFree = tier === 'free';

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Settings
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Your account,<br />
          <em style={{ color: '#c9a84c' }}>in order.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      <div className="px-4 flex flex-col gap-4 max-w-2xl">
        {/* Know Thyself shortcut */}
        <SettingsCard title="Profile">
          <SettingsLinkRow href="/profile" label="📖 Edit Your Know Thyself Profile" />
        </SettingsCard>

        {/* Cabinet & privacy */}
        <SettingsCard title="Cabinet & privacy">
          <ToggleRow
            label="Cabinet sees routine completion"
            hint="Morning and evening checklists, done or not done."
            checked={shareRoutines}
            onChange={(next) => {
              setShareRoutines(next);
              setShareRoutinesWithCabinet(next);
            }}
          />
          <p className="text-[12px] mt-4 leading-relaxed" style={{ color: '#9aa0a6' }}>
            Screen time, health, and calendar signals are not available in the web app. Your
            counselors are told so plainly rather than left to guess.
          </p>
        </SettingsCard>

        {/* Subscription — purchase and management both live on the web, through
            the Stripe Customer Portal on /upgrade. Entitlement itself is only
            ever written by the Stripe webhook. */}
        <SettingsCard title="Subscription">
          <SettingsLinkRow
            href={isFree ? '/upgrade?src=settings_upgrade' : '/upgrade'}
            label={isFree ? 'Upgrade to Premium' : 'Manage Subscription'}
            detail={tierLoading ? undefined : TIER_LABELS[tier]}
          />
        </SettingsCard>

        {/* Legal */}
        <SettingsCard title="Legal">
          <SettingsLinkRow href="/privacy" label="Privacy Policy" />
        </SettingsCard>

        {/* Account */}
        <SettingsCard title="Account">
          <div className="flex flex-col gap-3">
            <SettingsButtonRow
              label={signingOut ? 'Signing out…' : 'Sign Out'}
              onClick={() => setSignOutOpen(true)}
              disabled={signingOut}
            />
            <SettingsButtonRow
              label={deletingAccount ? 'Deleting Account…' : 'Delete Account'}
              onClick={() => setDeleteStep(1)}
              disabled={deletingAccount}
              tone="danger"
            />
          </div>
        </SettingsCard>

        {/* DEV ONLY — never rendered in production builds */}
        {process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
          <div className="rounded-2xl p-5" style={{ border: '2px solid #ef4444' }}>
            <p
              className="text-[10px] tracking-[1.8px] uppercase mb-1"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#ef4444' }}
            >
              DEV ONLY
            </p>
            <p className="text-[14px] font-semibold mb-4" style={{ color: '#e6eef8' }}>
              Developer Tools
            </p>
            <ToggleRow
              label="Simulate free tier"
              hint="Overrides isPremium in memory. Resets on reload."
              checked={simulatingFree}
              danger
              onChange={(next) => {
                setSimulatingFree(next);
                setDevPremiumOverride(next ? false : null);
              }}
            />
            {simulatingFree && (
              <p className="text-[12px] mt-3" style={{ color: '#ef4444' }}>
                ⚠ Premium overridden to FALSE. Reload the page to reset.
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        destructive
        onConfirm={handleSignOut}
        onCancel={() => setSignOutOpen(false)}
      />

      {/* Two confirmations, as on mobile (App Review 5.1.1(v)). */}
      <ConfirmDialog
        open={deleteStep === 1}
        title="Delete Account"
        message="This permanently deletes your account and all of your data — conversations, journal entries, beliefs, progress, and subscription records. This cannot be undone."
        confirmLabel="Continue"
        destructive
        onConfirm={() => setDeleteStep(2)}
        onCancel={() => setDeleteStep(0)}
      />
      <ConfirmDialog
        open={deleteStep === 2}
        title="Are you absolutely sure?"
        message="Your account and every trace of your data will be gone forever."
        confirmLabel="Delete Everything"
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteStep(0)}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getUserCabinet, saveCabinetSelection, getIsPremium } from '@/lib/db';
import PageHeader from '@/components/PageHeader';
import CounselorLibrary from '@/components/CounselorLibrary';

const SAVE_SUCCESS_REDIRECT_DELAY_MS = 2000;

export default function CabinetSelectPage() {
  const router = useRouter();
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      const [premium, cabinet] = await Promise.all([
        getIsPremium(),
        getUserCabinet(),
      ]);

      setIsPremium(premium);

      if (Array.isArray(cabinet)) {
        setSelectedSlugs(cabinet.map(c => c.slug).filter(s => s !== 'futureSelf'));
      }

      setLoading(false);
    }
    init();
  }, [router]);

  const handleToggle = (slug: string) => {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
    setSaveSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (selectedSlugs.length < 3) {
      setError('Select at least 3 counselors');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveCabinetSelection(selectedSlugs);
      setSaveSuccess(true);
      setTimeout(() => router.push('/cabinet'), SAVE_SUCCESS_REDIRECT_DELAY_MS);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
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
      {/* Paywall overlay */}
      {!isPremium && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-arete-surface border border-arete-border rounded-xl p-8 max-w-sm mx-4 text-center">
            <p className="text-arete-text font-bold text-lg mb-3">Custom Cabinet is a Premium Feature</p>
            <p className="text-arete-muted text-sm mb-6">
              Upgrade to Arete Premium to build a custom cabinet from the full counselor library.
            </p>
            <button
              onClick={() => router.push('/cabinet')}
              className="bg-arete-gold text-arete-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-arete-muted hover:text-arete-text">
            ← Back
          </button>
          <PageHeader title="Build Your Cabinet" subtitle="Choose 3 to 5 counselors" />
        </div>

        <p className="text-arete-muted text-sm mb-6">
          Future Self is always present in your cabinet and cannot be removed.
        </p>

        <CounselorLibrary
          selectedSlugs={selectedSlugs}
          onToggle={handleToggle}
          maxSelections={5}
        />

        <div className="mt-8 flex flex-col items-start gap-3">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {saveSuccess && <p className="text-green-400 text-sm">Cabinet saved.</p>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-arete-gold text-arete-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Cabinet'}
          </button>
        </div>
      </div>
    </div>
  );
}

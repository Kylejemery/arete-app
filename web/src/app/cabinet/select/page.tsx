'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getUserCabinet, saveCabinetSelection, getIsPremium, isFreeCounselorSlug, FREE_COUNSELOR_SLUGS } from '@/lib/db';
import PageHeader from '@/components/PageHeader';
import CounselorLibrary from '@/components/CounselorLibrary';
import { upgradeHref } from '@/lib/paywall';
import { logEvent } from '@/lib/events';

const SAVE_SUCCESS_REDIRECT_DELAY_MS = 2000;
const MAX_SELECTIONS = 5;

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
        let slugs = cabinet.map(c => c.slug).filter(s => s !== 'futureSelf');
        // A free member's selection is the free counselors only (retention
        // plan R10). A locked counselor left over in cabinet_members would
        // otherwise show as selected here while the server never fires it.
        if (!premium) {
          slugs = slugs.filter(isFreeCounselorSlug);
          if (slugs.length === 0) slugs = [...FREE_COUNSELOR_SLUGS];
        }
        setSelectedSlugs(slugs);
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

  // A locked card is the paywall entry for this page: no modal over the
  // whole library, just the tap on the counselor the member wanted.
  const handleLockedTap = (slug: string) => {
    logEvent('gate_hit', { gate: 'cabinet_select_locked', counselor: slug });
    router.push(upgradeHref('cabinet_select_locked'));
  };

  // Premium builds a Cabinet of 3 to 5. A free member rearranges among the
  // three free counselors and only needs to keep one.
  const minSelections = isPremium ? 3 : 1;

  const handleSave = async () => {
    if (selectedSlugs.length < minSelections) {
      setError(isPremium ? 'Select at least 3 counselors' : 'Keep at least one counselor');
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-arete-muted hover:text-arete-text">
            ← Back
          </button>
          <PageHeader
            title="Build Your Cabinet"
            subtitle={isPremium ? 'Choose 3 to 5 counselors' : 'Your three free counselors. Premium opens the full library.'}
          />
        </div>

        <p className="text-arete-muted text-sm mb-6">
          Future Self is always present in your cabinet and cannot be removed.
        </p>

        <CounselorLibrary
          selectedSlugs={selectedSlugs}
          onToggle={handleToggle}
          maxSelections={MAX_SELECTIONS}
          isUnlocked={isPremium ? undefined : isFreeCounselorSlug}
          onLockedTap={isPremium ? undefined : handleLockedTap}
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

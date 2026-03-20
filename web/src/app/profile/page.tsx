'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, upsertUserSettings } from '@/lib/db';
import { getDevPremiumOverride, setDevPremiumOverride } from '@/lib/devMode';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';

const YEAR_OPTIONS = [5, 10, 15, 20];

export default function ProfilePage() {
  const router = useRouter();
  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [majorEvents, setMajorEvents] = useState('');
  const [futureSelfYears, setFutureSelfYears] = useState(10);
  const [futureSelfDescription, setFutureSelfDescription] = useState('');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [simulatingFree, setSimulatingFree] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      setBackground(settings.kt_background || '');
      setIdentity(settings.kt_identity || '');
      setGoals(settings.kt_goals || '');
      setStrengths(settings.kt_strengths || '');
      setWeaknesses(settings.kt_weaknesses || '');
      setPatterns(settings.kt_patterns || '');
      setMajorEvents(settings.kt_major_events || '');
      setFutureSelfYears(settings.future_self_years ?? 10);
      setFutureSelfDescription(settings.future_self_description || '');
      setSimulatingFree(getDevPremiumOverride() === false);
      setLoaded(true);
    }
    load();
  }, [router]);

  const handleSave = async () => {
    await upsertUserSettings({
      kt_background: background.trim(),
      kt_identity: identity.trim(),
      kt_goals: goals.trim(),
      user_goals: goals.trim(),
      kt_strengths: strengths.trim(),
      kt_weaknesses: weaknesses.trim(),
      kt_patterns: patterns.trim(),
      kt_major_events: majorEvents.trim(),
      future_self_years: futureSelfYears,
      future_self_description: futureSelfDescription.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!loaded) return null;

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none w-full";
  const textareaClass = `${inputClass} resize-none`;

  const sections = [
    { label: 'Background & Life Story', sub: 'Where did you come from? What shaped you?', value: background, onChange: setBackground, rows: 5 },
    { label: 'Professional Identity & Pursuits', sub: 'What do you do? What are you building?', value: identity, onChange: setIdentity, rows: 4 },
    { label: 'Goals', sub: 'What are you working toward? Be specific.', value: goals, onChange: setGoals, rows: 4 },
    { label: 'Strengths', sub: 'What are you genuinely good at?', value: strengths, onChange: setStrengths, rows: 3 },
    { label: 'Weaknesses', sub: 'Where do you consistently fall short?', value: weaknesses, onChange: setWeaknesses, rows: 3 },
    { label: 'Patterns & Failure Modes', sub: 'What do you do when things get hard?', value: patterns, onChange: setPatterns, rows: 4 },
    { label: 'Major Life Events', sub: 'What defining moments shaped who you are?', value: majorEvents, onChange: setMajorEvents, rows: 4 },
  ];

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Know Thyself" subtitle="The Cabinet reads this before every session" />

      <p className="text-arete-muted text-sm mb-6 bg-arete-surface rounded-lg border border-arete-border p-4">
        Changes take effect on your next Cabinet session. The more honest and specific you are here, the more useful your counselors will be.
      </p>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.label} className="bg-arete-surface rounded-lg border border-arete-border p-4">
            <label className="text-arete-gold font-semibold text-sm block mb-1">{section.label}</label>
            <p className="text-arete-muted text-xs mb-2">{section.sub}</p>
            <textarea
              className={textareaClass}
              rows={section.rows}
              value={section.value}
              onChange={e => section.onChange(e.target.value)}
            />
          </div>
        ))}

        {/* Future Self */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-4">
          <label className="text-arete-gold font-semibold text-sm block mb-1">Future Self</label>
          <p className="text-arete-muted text-xs mb-3">Who will you be if you do the work?</p>
          <div className="flex gap-2 mb-3">
            {YEAR_OPTIONS.map(y => (
              <button
                key={y}
                onClick={() => setFutureSelfYears(y)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${futureSelfYears === y ? 'bg-arete-gold text-arete-bg border-arete-gold' : 'border-arete-border text-arete-muted hover:border-arete-gold hover:text-arete-text'}`}
              >
                {y} yrs
              </button>
            ))}
          </div>
          <textarea
            className={textareaClass}
            rows={5}
            placeholder={`Describe who you are ${futureSelfYears} years from now...`}
            value={futureSelfDescription}
            onChange={e => setFutureSelfDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 sticky bottom-6">
        <button
          onClick={handleSave}
          className={`w-full font-semibold rounded-lg px-4 py-3 transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-arete-gold text-arete-bg hover:opacity-90'
          }`}
        >
          {saved ? '✓ Profile Saved' : 'Save Profile'}
        </button>
      </div>

      {process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
        <div className="mt-8 border-2 border-red-500 rounded-lg p-5">
          <p className="text-red-400 text-xs font-bold tracking-widest uppercase mb-1">DEV ONLY</p>
          <p className="text-arete-text font-semibold mb-4">Developer Tools</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-arete-text text-sm">Simulate free tier</p>
              <p className="text-arete-muted text-xs">Overrides getIsPremium() in memory. Resets on reload.</p>
            </div>
            <button
              onClick={() => {
                const current = getDevPremiumOverride();
                // Toggle: null/true → simulate free (false), false → back to real DB (null)
                if (current === false) {
                  setDevPremiumOverride(null);
                  setSimulatingFree(false);
                } else {
                  setDevPremiumOverride(false);
                  setSimulatingFree(true);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                simulatingFree
                  ? 'bg-red-500 text-white'
                  : 'bg-arete-surface border border-arete-border text-arete-muted'
              }`}
            >
              {simulatingFree ? 'Free Tier Active' : 'Simulate Free Tier'}
            </button>
          </div>
          {simulatingFree && (
            <p className="text-red-400 text-xs mt-3">
              ⚠ Premium is currently overridden to FALSE. Reload the page to reset.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

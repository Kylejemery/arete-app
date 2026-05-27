'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, upsertUserSettings } from '@/lib/db';
import { getDevPremiumOverride, setDevPremiumOverride } from '@/lib/devMode';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';

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
      const { data: { user } } = await supabase.auth.getUser();
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

  const textareaClass = [
    'w-full px-4 py-3 rounded-xl text-[14px] leading-relaxed resize-none outline-none',
  ].join(' ');
  const textareaStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e6eef8',
    fontFamily: 'var(--font-serif, Georgia, serif)',
  };

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
    <div className="min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Know Thyself
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Your Cabinet<br />
          <em style={{ color: '#c9a84c' }}>reads this.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      {/* Intro note */}
      <div className="px-4 pb-5">
        <p
          className="text-[13px] leading-relaxed px-4 py-3 rounded-xl"
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            color: '#9aa0a6',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          Changes take effect on your next Cabinet session. The more honest and specific you are, the more useful your counselors will be.
        </p>
      </div>

      {/* ── Sections ────────────────────────────────────────────── */}
      <div className="px-4 flex flex-col gap-4 max-w-2xl">
        {sections.map(section => (
          <GlassCard key={section.label}>
            <div className="p-4">
              <div
                className="text-[11px] tracking-[1.4px] uppercase mb-0.5"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                {section.label}
              </div>
              <p
                className="text-[12px] mb-2"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
              >
                {section.sub}
              </p>
              <textarea
                className={textareaClass}
                style={textareaStyle}
                rows={section.rows}
                value={section.value}
                onChange={e => section.onChange(e.target.value)}
              />
            </div>
          </GlassCard>
        ))}

        {/* Future Self */}
        <GlassCard>
          <div className="p-4">
            <div
              className="text-[11px] tracking-[1.4px] uppercase mb-0.5"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              Future Self
            </div>
            <p
              className="text-[12px] mb-3"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              Who will you be if you do the work?
            </p>
            <div className="flex gap-2 mb-3">
              {YEAR_OPTIONS.map(y => (
                <button
                  key={y}
                  onClick={() => setFutureSelfYears(y)}
                  className="px-3 py-1.5 rounded-lg text-[11px] tracking-[1px] uppercase transition-all"
                  style={
                    futureSelfYears === y
                      ? { background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)', border: '1px solid #c9a84c', fontWeight: 700 }
                      : { background: 'rgba(255,255,255,0.04)', color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {y} yrs
                </button>
              ))}
            </div>
            <textarea
              className={textareaClass}
              style={textareaStyle}
              rows={5}
              placeholder={`Describe who you are ${futureSelfYears} years from now…`}
              value={futureSelfDescription}
              onChange={e => setFutureSelfDescription(e.target.value)}
            />
          </div>
        </GlassCard>
      </div>

      {/* ── Save Button ─────────────────────────────────────────── */}
      <div className="px-4 mt-6 sticky bottom-6 max-w-2xl">
        <button
          onClick={handleSave}
          className="w-full rounded-2xl px-4 py-4 font-bold text-[14px] tracking-[0.5px] transition-all"
          style={
            saved
              ? { background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }
              : { background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }
          }
        >
          {saved ? '✓ Profile Saved' : 'Save Profile'}
        </button>
      </div>

      {/* ── DEV section — preserved exactly ─────────────────────── */}
      {process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
        <div className="px-4 mt-8 max-w-2xl">
          <div className="border-2 border-red-500 rounded-lg p-5">
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
        </div>
      )}
    </div>
  );
}

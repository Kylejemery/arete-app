'use client';

import { useEffect, useState } from 'react';
import { upsertUserSettings } from '@/lib/db';
import { useRequireUser } from '@/hooks/useRequireUser';
import { Spinner, useToast } from '@/components/ui';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';

const YEAR_OPTIONS = [5, 10, 15, 20];
const DEFAULT_YEARS = 10;

export default function ProfilePage() {
  const { settings, loading } = useRequireUser();
  const toast = useToast();

  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [majorEvents, setMajorEvents] = useState('');
  const [futureSelfYears, setFutureSelfYears] = useState(DEFAULT_YEARS);
  const [futureSelfDescription, setFutureSelfDescription] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setBackground(settings.kt_background || '');
    setIdentity(settings.kt_identity || '');
    setGoals(settings.kt_goals || '');
    setStrengths(settings.kt_strengths || '');
    setWeaknesses(settings.kt_weaknesses || '');
    setPatterns(settings.kt_patterns || '');
    setMajorEvents(settings.kt_major_events || '');
    // Numeric guard: mobile parseInt()s a free-text field and can persist NaN.
    const years = Number(settings.future_self_years);
    setFutureSelfYears(Number.isFinite(years) && years > 0 ? Math.round(years) : DEFAULT_YEARS);
    setFutureSelfDescription(settings.future_self_description || '');
  }, [settings]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const years = Number(futureSelfYears);
      await upsertUserSettings({
        kt_background: background.trim(),
        kt_identity: identity.trim(),
        kt_goals: goals.trim(),
        user_goals: goals.trim(),
        kt_strengths: strengths.trim(),
        kt_weaknesses: weaknesses.trim(),
        kt_patterns: patterns.trim(),
        kt_major_events: majorEvents.trim(),
        future_self_description: futureSelfDescription.trim(),
        // Only written when it is a real, positive number — never NaN.
        ...(Number.isFinite(years) && years > 0 ? { future_self_years: Math.round(years) } : {}),
      });
      setSaved(true);
      toast.show('Profile saved. Changes take effect on your next session.');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.show('Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    );
  }

  const textareaClass =
    'w-full px-4 py-3 rounded-xl text-[14px] leading-relaxed resize-none outline-none';
  const textareaStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e6eef8',
    fontFamily: 'var(--font-serif, Georgia, serif)',
  };

  const sections = [
    { label: 'Background & Life Story', sub: 'Where are you from, and how did you get to where you are today?', placeholder: 'I grew up in…', value: background, onChange: setBackground, rows: 5 },
    { label: 'Professional Identity & Pursuits', sub: 'What do you do professionally? What are you pursuing outside of work?', placeholder: 'Professionally, I…', value: identity, onChange: setIdentity, rows: 4 },
    { label: 'Goals', sub: 'What are you working toward?', placeholder: 'I am here to…', value: goals, onChange: setGoals, rows: 4 },
    { label: 'Strengths', sub: 'What are you genuinely good at?', placeholder: 'I am strong at…', value: strengths, onChange: setStrengths, rows: 3 },
    { label: 'Weaknesses', sub: 'Where do you consistently fall short?', placeholder: 'I struggle with…', value: weaknesses, onChange: setWeaknesses, rows: 3 },
    { label: 'Patterns & Failure Modes', sub: 'What patterns do you notice in yourself? What tends to derail you?', placeholder: 'When under pressure, I tend to…', value: patterns, onChange: setPatterns, rows: 4 },
    { label: 'Major Life Events', sub: 'What crucible experiences shaped who you are?', placeholder: '', value: majorEvents, onChange: setMajorEvents, rows: 4 },
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
          Your profile gives the Cabinet deep context about who you are. Update it any time — changes take effect on your next session.
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
                placeholder={section.placeholder}
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
              placeholder={`In ${futureSelfYears} years, I have…`}
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
          disabled={saving}
          className="w-full rounded-2xl px-4 py-4 font-bold text-[14px] tracking-[0.5px] transition-all disabled:opacity-60"
          style={
            saved
              ? { background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }
              : { background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }
          }
        >
          {saved ? '✓ Profile Saved' : saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

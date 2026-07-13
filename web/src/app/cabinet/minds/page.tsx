'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getUserCabinet, getIsPremium, upsertUserSettings } from '@/lib/db';
import { COUNSELOR_MODEL_OPTIONS, DEFAULT_COUNSELOR_MODEL, counselorModelKey } from '@/lib/llmModels';
import type { Counselor } from '@/lib/types';

export default function CabinetMindsPage() {
  const router = useRouter();
  const [cabinet, setCabinet] = useState<Counselor[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [counselorModels, setCounselorModels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      const [members, premium] = await Promise.all([getUserCabinet(), getIsPremium()]);
      setCabinet(members);
      setIsPremium(premium);
      setCounselorModels(settings?.counselor_models ?? {});
      setLoading(false);
    }
    load();
  }, [router]);

  const handleModelSelect = (modelKey: string, modelId: string) => {
    const updated = { ...counselorModels, [modelKey]: modelId };
    setCounselorModels(updated);
    upsertUserSettings({ counselor_models: updated }).catch(e =>
      console.warn('[Minds] failed to save counselor model:', e)
    );
  };

  const renderModelPicker = (modelKey: string) => {
    const current = counselorModels[modelKey] ?? DEFAULT_COUNSELOR_MODEL;
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span
          className="text-[10px] tracking-[0.8px] uppercase mr-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          Mind
        </span>
        {COUNSELOR_MODEL_OPTIONS.map(option => {
          const selected = current === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleModelSelect(modelKey, option.id)}
              className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
              style={selected
                ? { background: 'rgba(201,168,76,0.12)', border: '1px solid #c9a84c', color: '#c9a84c' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#9aa0a6' }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1724' }}>
        <p style={{ color: '#9aa0a6' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0f1724' }}>
      {/* Paywall overlay */}
      {!isPremium && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            className="rounded-xl p-8 max-w-sm mx-4 text-center"
            style={{ background: '#16213e', border: '1px solid rgba(201,168,76,0.33)' }}
          >
            <p className="font-bold text-lg mb-3" style={{ color: '#e6eef8' }}>
              Assigning Minds is a Premium Feature
            </p>
            <p className="text-sm mb-6" style={{ color: '#9aa0a6' }}>
              Upgrade to Arete Premium to choose which AI model powers each counselor.
            </p>
            <button
              onClick={() => router.push('/upgrade')}
              className="w-full font-semibold px-6 py-3 rounded-lg hover:opacity-90 mb-3"
              style={{ background: '#c9a84c', color: '#0f1724' }}
            >
              Upgrade
            </button>
            <button
              onClick={() => router.push('/cabinet')}
              className="w-full text-sm py-2 hover:opacity-80"
              style={{ color: '#9aa0a6' }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="hover:opacity-80" style={{ color: '#9aa0a6' }}>
            ← Back
          </button>
          <div>
            <h1
              className="text-[24px] font-medium leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              Assign <em style={{ color: '#c9a84c' }}>Minds</em>
            </h1>
            <p className="text-[12px] mt-1" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}>
              Choose which AI model powers each counselor
            </p>
          </div>
        </div>

        {/* Future Self — always present */}
        <div
          className="rounded-xl p-4 mb-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.4)' }}
        >
          <div
            className="text-[10px] tracking-[1px] uppercase mb-1"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Always Present
          </div>
          <div className="text-[16px] font-medium" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
            Future Self
          </div>
          <div className="text-[13px]" style={{ color: '#9aa0a6' }}>
            Your ideal self, years from now, guiding you forward.
          </div>
          {renderModelPicker('future-self')}
        </div>

        {/* Current cabinet members */}
        {cabinet.map(counselor => (
          <div
            key={counselor.slug}
            className="rounded-xl p-4 mb-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[16px] font-medium" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
              {counselor.name}
            </div>
            <div
              className="text-[10px] tracking-[1px] uppercase mt-0.5"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              {counselor.category}
            </div>
            {renderModelPicker(counselorModelKey(counselor.slug))}
          </div>
        ))}

        {cabinet.length === 0 && (
          <p className="text-center text-[14px] mt-6" style={{ color: '#9aa0a6' }}>
            No counselors selected yet.
          </p>
        )}
      </div>
    </div>
  );
}

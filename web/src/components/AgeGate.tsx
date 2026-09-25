'use client';

// Blocks the web app until a signed-in person has answered the age question
// once, and shows a kind locked screen for under-13 accounts (activation run
// B, Part B5). Web port of components/AgeGate.tsx.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AGE_BANDS, UNDER_13_MESSAGE, fetchAgeStatus, setMyAgeBand, takePendingAgeBand, type AgeBand, type AgeStatus,
} from '@/lib/ageBand';
import { useAgeStatus } from '@/lib/useAgeStatus';

export default function AgeGate() {
  const { status } = useAgeStatus();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let s: AgeStatus | null = await fetchAgeStatus();
      if (s && !s.ageBand) {
        const pending = takePendingAgeBand();
        if (pending) s = await setMyAgeBand(pending);
      }
      if (!cancelled) setChecked(true);
    };
    void run();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void run(); });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (!checked || !status) return null;
  if (status.ageBand && !status.locked) return null;

  const choose = async (band: AgeBand) => {
    if (saving) return;
    setSaving(true);
    await setMyAgeBand(band);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" style={{ background: '#0f1724' }}>
      <div className="w-full max-w-md">
        {status.locked ? (
          <>
            <h1 className="text-2xl font-semibold mb-3" style={{ color: '#c9a84c' }}>Thank you for coming to Arete</h1>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: '#e6eef8' }}>{UNDER_13_MESSAGE}</p>
            <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/login'; })} className="text-sm" style={{ color: '#9aa0a6' }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-3" style={{ color: '#c9a84c' }}>How old are you?</h1>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: '#e6eef8' }}>
              We ask once, so the Cabinet can speak to you in the right way. We only keep the range you choose.
            </p>
            <div className="flex flex-col gap-2">
              {AGE_BANDS.map(b => (
                <button
                  key={b.value}
                  onClick={() => choose(b.value)}
                  disabled={saving}
                  className="rounded-xl px-4 py-3 text-[15px] disabled:opacity-50"
                  style={{ border: '1px solid rgba(201,168,76,0.45)', color: '#e6eef8' }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

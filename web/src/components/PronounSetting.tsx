'use client';

// Optional pronoun setting (activation run B, Part B4). Web port of
// components/PronounSetting.tsx.
import { useEffect, useState } from 'react';
import { getUserSettings, upsertUserSettings } from '@/lib/db';
import { PRONOUN_OPTIONS, type PronounSetting as Value } from '@/lib/pronouns';

export default function PronounSetting() {
  const [value, setValue] = useState<Value | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserSettings().then(s => {
      if (!cancelled) setValue(((s as { pronouns?: Value | null } | null)?.pronouns) ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const choose = async (v: Value) => {
    const next = value === v ? null : v;
    setValue(next);
    await upsertUserSettings({ pronouns: next });
  };

  return (
    <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
      <p className="text-arete-text font-semibold mb-1">Pronouns</p>
      <p className="text-arete-muted text-sm mb-3">Optional. How the app and your Cabinet refer to you. Without a choice, they/them.</p>
      <div className="flex flex-wrap gap-2">
        {PRONOUN_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => choose(o.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${value === o.value ? 'bg-arete-gold text-arete-bg border-arete-gold font-semibold' : 'border-arete-border text-arete-text hover:border-arete-gold'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

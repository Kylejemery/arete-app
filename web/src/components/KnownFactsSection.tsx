'use client';

// Know Thyself: what the Cabinet knows, field by field, with where each value
// came from. Inferred values can be confirmed, edited or removed (activation
// plan, Part 3f). Web port of components/KnownFactsSection.tsx.
import { useCallback, useEffect, useState } from 'react';
import GlassCard from '@/components/GlassCard';
import {
  confirmFact, editFact, fieldViews, getProfileFacts, markFactsSeen, removeFact,
  SOURCE_LABELS, type FieldView, type ProfileFact,
} from '@/lib/profileFields';

export default function KnownFactsSection({ settings, reloadKey = 0 }: { settings: Record<string, unknown> | null; reloadKey?: number }) {
  const [facts, setFacts] = useState<ProfileFact[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setFacts(await getProfileFacts());
  }, []);

  useEffect(() => {
    void load();
    void markFactsSeen();
  }, [load, reloadKey]);

  const views = fieldViews(facts, settings).filter(v => v.field.key !== 'off_limits');
  if (views.length === 0) return null;

  const act = async (fn: () => Promise<boolean>) => {
    const ok = await fn();
    setError(!ok);
    setEditing(null);
    await load();
  };

  const mono = { fontFamily: 'var(--font-mono, monospace)' };
  const renderRow = (v: FieldView) => {
    const fact = v.source === 'cabinet_inferred' ? v.fact : null;
    const isEditing = editing === v.field.key;
    return (
      <div key={v.field.key} className="flex flex-col gap-1">
        <div className="text-[12px]" style={{ ...mono, color: '#9aa0a6' }}>{v.field.question}</div>
        {isEditing ? (
          <textarea
            className="w-full px-3 py-2 rounded-xl text-[14px] outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6eef8' }}
            rows={3}
            maxLength={500}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
        ) : (
          <div className="text-[14px] leading-relaxed" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>{v.value}</div>
        )}
        <div className="text-[11px] italic" style={{ color: fact ? '#b39ddb' : '#6b7280' }}>{SOURCE_LABELS[v.source]}</div>
        {fact && (
          <div className="flex gap-4 mt-1 text-[12px] font-semibold" style={mono}>
            {isEditing ? (
              <>
                <button onClick={() => act(() => editFact(fact, draft))} style={{ color: '#c9a84c' }}>Save</button>
                <button onClick={() => setEditing(null)} style={{ color: '#9aa0a6' }}>Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => act(() => confirmFact(fact))} style={{ color: '#c9a84c' }}>Confirm</button>
                <button onClick={() => { setDraft(v.value); setEditing(v.field.key); }} style={{ color: '#c9a84c' }}>Edit</button>
                <button onClick={() => act(() => removeFact(fact))} style={{ color: '#9aa0a6' }}>Remove</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-4 pb-5 max-w-2xl">
      <GlassCard>
        <div className="p-4 flex flex-col gap-4">
          <div className="text-[10px] tracking-[1.4px] uppercase" style={{ ...mono, color: '#c9a84c' }}>What your Cabinet knows</div>
          {views.map(renderRow)}
          {error && <div className="text-[12px]" style={{ color: '#e57373' }}>Could not save. Please try again.</div>}
        </div>
      </GlassCard>
    </div>
  );
}

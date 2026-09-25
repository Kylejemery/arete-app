'use client';

// "Your practices" on Home (personalization run C, Part C1). Shows the
// practices a person has said yes to, below everything Home already has.
// With none on, it renders nothing, so Home is exactly as it was.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { moduleInfo, visiblePractices, weekDays, type PracticeRow } from '@/lib/modules';
import { fetchPractices, fetchTicks, savePracticeSettings, setTick, turnOffPractice } from '@/lib/practices';

export default function YourPractices() {
  const [rows, setRows] = useState<PracticeRow[]>([]);

  const load = useCallback(() => {
    fetchPractices().then(r => setRows(visiblePractices(r))).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  if (rows.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <p
        className="text-[10px] tracking-[1.6px] uppercase mb-3"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        Your practices
      </p>
      <div className="space-y-3">
        {rows.map(row => <PracticeCard key={row.module_key} row={row} onChanged={load} />)}
      </div>
    </div>
  );
}

function PracticeCard({ row, onChanged }: { row: PracticeRow; onChanged: () => void }) {
  const info = moduleInfo(row.module_key);
  const s = row.settings as Record<string, unknown>;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  if (!info) return null;
  const freeText = String(s?.[info.freeTextField] ?? '').trim();

  const save = async () => {
    setBusy(true);
    const r = await savePracticeSettings(row.module_key, { [info.freeTextField]: draft.trim() });
    setBusy(false);
    if (r.ok) { setEditing(false); onChanged(); }
  };
  const off = async () => {
    setBusy(true);
    await turnOffPractice(row.module_key);
    setBusy(false);
    onChanged();
  };

  let body: React.ReactNode = null;
  let action: { label: string; href: string } | null = null;
  if (row.module_key === 'focus_timer') {
    body = <p className="text-sm text-arete-muted">{Number(s?.minutes) || 25} minutes{freeText ? ` · ${freeText}` : ''}</p>;
    action = { label: 'Start', href: '/focus' };
  } else if (row.module_key === 'evening_review') {
    body = <p className="text-sm text-arete-muted">{freeText || 'Close the day with your evening review.'}</p>;
    action = { label: 'Open', href: '/evening' };
  } else if (row.module_key === 'premeditatio') {
    body = <p className="text-sm text-arete-muted">{freeText ? `Prepare for: ${freeText}` : 'Rehearse one hard thing the day might bring, and how you would meet it.'}</p>;
    const opener = freeText
      ? `Premeditatio. Help me rehearse this calmly: ${freeText}. What could go wrong, and how would I meet it well?`
      : 'Premeditatio. Help me rehearse, calmly, one hard thing today might bring and how I would meet it.';
    action = { label: 'Rehearse', href: `/cabinet?q=${encodeURIComponent(opener)}&counselor=seneca` };
  } else if (row.module_key === 'habit_tracker') {
    body = <HabitBody habit={freeText} target={Number(s?.target_per_week) || 7} />;
  }

  return (
    <GlassCard>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-arete-text font-semibold text-[15px]">{info.label}</p>
          {action && (
            <Link href={action.href} className="bg-arete-gold text-arete-bg rounded-lg px-3 py-1 text-xs font-bold">
              {action.label}
            </Link>
          )}
        </div>
        {body}
        {editing ? (
          <div className="space-y-2">
            <label className="block text-xs text-arete-muted">{info.freeTextLabel}</label>
            <input
              className="w-full bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-sm text-arete-text"
              value={draft}
              maxLength={280}
              placeholder={info.freeTextPlaceholder}
              onChange={e => setDraft(e.target.value)}
            />
            <div className="flex gap-4 text-xs font-semibold">
              <button onClick={save} disabled={busy} className="text-arete-gold disabled:opacity-50">Save</button>
              <button onClick={() => setEditing(false)} disabled={busy} className="text-arete-muted">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 text-xs font-semibold">
            <button onClick={() => { setDraft(freeText); setEditing(true); }} className="text-arete-muted">Edit</button>
            <button onClick={off} disabled={busy} className="text-arete-muted disabled:opacity-50">Turn off</button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function HabitBody({ habit, target }: { habit: string; target: number }) {
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const today = localToday();
  useEffect(() => {
    let cancelled = false;
    fetchTicks('habit_tracker', weekDays()).then(t => { if (!cancelled) setTicks(t); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const done = ticks.has(today);
  const toggle = async () => {
    const before = ticks;
    const next = new Set(ticks);
    if (done) next.delete(today); else next.add(today);
    setTicks(next);
    const ok = await setTick('habit_tracker', today, !done);
    if (!ok) setTicks(before);
  };
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        role="checkbox"
        aria-checked={done}
        className={`w-7 h-7 rounded-md border-2 border-arete-gold flex items-center justify-center text-sm font-bold ${done ? 'bg-arete-gold text-arete-bg' : 'text-arete-gold'}`}
      >
        {done ? '✓' : ''}
      </button>
      <div>
        <p className="text-sm text-arete-text">{habit || 'Your habit for today'}</p>
        <p className="text-xs text-arete-muted">{ticks.size} of {target} this week</p>
      </div>
    </div>
  );
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

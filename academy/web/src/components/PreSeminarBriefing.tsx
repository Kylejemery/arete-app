'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getLibraryForSession } from '@/data/library';
import { readingHref } from '@/data/reading-links';

// A reading's identity for check-offs: the same "<source> || <passage>" key
// reading-links.ts uses, so a reworded row starts unchecked.
const readingKey = (r: { source: string; passage: string }) => `${r.source} || ${r.passage}`;

// The student's check-offs for one session's Required Reading
// (reading_checkoffs). Toggling is optimistic; a failed write reverts it.
function useReadingCheckoffs(courseId: string, session: number) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('reading_checkoffs')
        .select('reading_key')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('session_id', session)
        .eq('done', true);
      if (!cancelled) setDone(new Set((data ?? []).map(r => r.reading_key as string)));
    })();
    return () => { cancelled = true; };
  }, [courseId, session]);

  const toggle = useCallback(async (key: string) => {
    if (!userId) return;
    const next = !done.has(key);
    const apply = (on: boolean) => setDone(prev => {
      const s = new Set(prev);
      if (on) s.add(key); else s.delete(key);
      return s;
    });
    apply(next);
    const { error } = await supabase
      .from('reading_checkoffs')
      .upsert(
        { user_id: userId, course_id: courseId, session_id: session, reading_key: key, done: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,course_id,session_id,reading_key' },
      );
    if (error) apply(!next);
  }, [userId, done, courseId, session]);

  return { done, toggle, ready: userId !== null };
}

function ReadCheck({ checked, onToggle, disabled, label }: { checked: boolean; onToggle: () => void; disabled: boolean; label: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      disabled={disabled}
      aria-label={`Mark as read: ${label}`}
      title={checked ? 'Read' : 'Mark as read'}
      className="mt-1 h-4 w-4 cursor-pointer accent-[#c9a84c] disabled:cursor-not-allowed"
    />
  );
}

// The passage cell of a Required Reading row: a link when the row can be read
// (the Library reader for corpus texts, a DOI or publisher page for
// scholarship), plain text otherwise. Opens in a new tab so the briefing stays.
function Passage({ r }: { r: { source: string; passage: string } }) {
  const href = readingHref(r);
  if (!href) return <>{r.passage}</>;
  const inLibrary = href.startsWith('/library');
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={inLibrary ? 'Read this passage in the Library' : 'Publisher or DOI page'}
      className="text-academy-gold hover:underline"
    >
      {r.passage} <span aria-hidden>{inLibrary ? '→' : '↗'}</span>
    </a>
  );
}

export interface BriefingData {
  session: number;
  title: string;
  problem: string;
  whyItMatters: string;
  watchFor: string[];
  yourTask: string;
  requiredReading?: { source: string; passage: string; note: string }[];
}

interface PreSeminarBriefingProps extends BriefingData {
  courseId: string;
  isComplete?: boolean;
}

export default function PreSeminarBriefing({
  courseId,
  session,
  title,
  problem,
  whyItMatters,
  watchFor,
  yourTask,
  requiredReading,
  isComplete = false,
}: PreSeminarBriefingProps) {
  const storageKey = `briefing-collapsed-${courseId}-${session}`;
  const [collapsed, setCollapsed] = useState(false);
  const sessionReadings = getLibraryForSession(courseId, session);
  const checkoffs = useReadingCheckoffs(courseId, session);
  const readCount = (requiredReading ?? []).filter(r => checkoffs.done.has(readingKey(r))).length;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'true') setCollapsed(true);
  }, [storageKey]);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  return (
    <div className="border-l-4 border-academy-gold mb-8 bg-academy-card border border-academy-border rounded-r-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-navy/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isComplete && (
            <span className="text-academy-gold text-xs font-mono">&#10003;</span>
          )}
          <div>
            <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-0.5">
              Pre-Seminar Briefing
            </p>
            <p className="font-serif text-academy-text text-base leading-snug">{title}</p>
          </div>
        </div>
        <span className="text-academy-muted text-xs ml-4 flex-shrink-0">
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-6 pb-6 space-y-5 border-t border-academy-border">
          {/* The Problem */}
          <div className="pt-5">
            <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
              The Problem
            </p>
            <p className="text-academy-text text-sm leading-relaxed">{problem}</p>
          </div>

          {/* Why It Matters */}
          {whyItMatters && (
            <div>
              <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
                Why It Matters
              </p>
              <p className="text-academy-muted text-sm leading-relaxed">{whyItMatters}</p>
            </div>
          )}

          {/* What to Watch For */}
          {watchFor.length > 0 && (
            <div>
              <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
                What to Watch For
              </p>
              <ul className="space-y-1.5">
                {watchFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-academy-muted">
                    <span className="text-academy-gold font-bold leading-none mt-0.5">&mdash;</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Your Task */}
          {yourTask && (
            <div className="border-t border-academy-gold/20 pt-5">
              <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
                Your Task
              </p>
              <p className="font-serif text-academy-gold text-sm leading-relaxed italic">{yourTask}</p>
            </div>
          )}

          {/* Required Reading */}
          {requiredReading && requiredReading.length > 0 && (
            <div className="border-t border-academy-gold/20 pt-5">
              <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-3">
                Required Reading
                <span className={`ml-2 normal-case tracking-normal ${readCount === requiredReading.length ? 'text-green-400' : 'text-academy-muted'}`}>
                  · {readCount} of {requiredReading.length} read
                </span>
              </p>
              {/* Desktop: table with a read check */}
              <table className="hidden md:table w-full border-collapse border-l-2 border-academy-gold">
                <thead>
                  <tr>
                    <th className="w-8 px-3 pb-2"><span className="sr-only">Read</span></th>
                    <th className="font-mono text-academy-muted text-[10px] font-normal uppercase tracking-widest text-left px-3 pb-2">Source</th>
                    <th className="font-mono text-academy-muted text-[10px] font-normal uppercase tracking-widest text-left px-3 pb-2">Passage</th>
                    <th className="font-mono text-academy-muted text-[10px] font-normal uppercase tracking-widest text-left px-3 pb-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredReading.map((r, i) => {
                    const key = readingKey(r);
                    const read = checkoffs.done.has(key);
                    return (
                    <tr key={i} className={`border-t border-academy-border align-top ${read ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2">
                        <ReadCheck checked={read} onToggle={() => checkoffs.toggle(key)} disabled={!checkoffs.ready} label={`${r.source}, ${r.passage}`} />
                      </td>
                      <td className="font-serif text-academy-text text-sm px-3 py-2">{r.source}</td>
                      <td className="font-serif text-academy-text text-sm px-3 py-2"><Passage r={r} /></td>
                      <td className="text-academy-muted text-sm leading-relaxed px-3 py-2">{r.note}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3">
                {requiredReading.map((r, i) => {
                  const key = readingKey(r);
                  const read = checkoffs.done.has(key);
                  return (
                  <div key={i} className={`border-l-2 border-academy-gold pl-3 flex gap-3 ${read ? 'opacity-60' : ''}`}>
                    <ReadCheck checked={read} onToggle={() => checkoffs.toggle(key)} disabled={!checkoffs.ready} label={`${r.source}, ${r.passage}`} />
                    <div>
                      <p className="font-serif text-academy-text text-sm font-semibold">{r.source}</p>
                      <p className="font-serif text-academy-text text-sm"><Passage r={r} /></p>
                      <p className="text-academy-muted text-sm italic leading-relaxed mt-0.5">{r.note}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {sessionReadings.length > 0 && (
            <div className="border-t border-academy-border pt-5">
              <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-3">
                Further Reading
              </p>
              <ul className="space-y-2">
                {sessionReadings.map(item => {
                  const isOpen = item.accessType === 'open-access';
                  return (
                    <li key={item.id} className="text-sm text-academy-muted leading-relaxed">
                      {!isOpen && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 align-middle"
                          aria-hidden
                        />
                      )}
                      {item.author} ({item.year > 0 ? item.year : 'ancient'}) — {item.title}{' '}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`hover:underline whitespace-nowrap ${isOpen ? 'text-academy-gold' : 'text-amber-300'}`}
                      >
                        {isOpen ? 'Open' : 'Library'} &rarr;
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

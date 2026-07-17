'use client';

// Vocabulary Drill — spaced repetition over the GREK 101 / LATN 101 decks.
//
// Queue = every card due now (per vocab_progress) + up to NEW_PER_DAY unseen
// cards, in course order. Grades feed the SM-2-lite scheduler in lib/srs.
// 'Again' cycles the card back into today's session; other grades schedule
// it days out and it leaves the queue.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Topbar from '@/components/navigation/Topbar';
import { VOCAB_DECK, DECK_BY_ID, type VocabCard } from '@/data/vocabDeck';
import { review, previewInterval, NEW_CARD_STATE, type Grade, type SrsState } from '@/lib/srs';

const NEW_PER_DAY = 10;
const GREEK_RE = /[Ͱ-Ͽἀ-῿]/;
const DM_MONO = 'DM Mono, monospace';

type Filter = 'all' | 'greek' | 'latin';

interface CardRow extends SrsState {
  dueAt: string;     // ISO
  createdAt: string; // ISO
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function DrillPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<Map<string, CardRow>>(new Map());
  const [filter, setFilter] = useState<Filter>('all');
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Load SRS state once
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSignedIn(true);
        const { data } = await supabase
          .from('vocab_progress')
          .select('card_id, ease, interval_days, reps, lapses, due_at, created_at')
          .eq('user_id', user.id);
        const m = new Map<string, CardRow>();
        for (const r of data ?? []) {
          m.set(r.card_id as string, {
            ease: Number(r.ease),
            intervalDays: Number(r.interval_days),
            reps: r.reps as number,
            lapses: r.lapses as number,
            dueAt: r.due_at as string,
            createdAt: r.created_at as string,
          });
        }
        setRows(m);
      }
      setLoading(false);
    })();
  }, []);

  // Build the queue whenever the state or filter changes materially
  useEffect(() => {
    if (loading) return;
    const now = new Date().toISOString();
    const inFilter = (c: VocabCard) => filter === 'all' || c.language === filter;

    const due = VOCAB_DECK
      .filter(c => inFilter(c) && rows.has(c.id) && rows.get(c.id)!.dueAt <= now)
      .sort((a, b) => rows.get(a.id)!.dueAt.localeCompare(rows.get(b.id)!.dueAt))
      .map(c => c.id);

    const introducedToday = [...rows.values()].filter(r => isToday(r.createdAt)).length;
    const newLimit = Math.max(0, NEW_PER_DAY - introducedToday);
    const fresh = VOCAB_DECK
      .filter(c => inFilter(c) && !rows.has(c.id))
      .slice(0, newLimit)
      .map(c => c.id);

    setQueue([...due, ...fresh]);
    setRevealed(false);
    setDone(0);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, filter]);

  const currentId = queue[0];
  const card = currentId ? DECK_BY_ID.get(currentId) : undefined;
  const cardState: SrsState = useMemo(() => {
    if (!currentId) return NEW_CARD_STATE;
    const r = rows.get(currentId);
    return r ? { ease: r.ease, intervalDays: r.intervalDays, reps: r.reps, lapses: r.lapses } : NEW_CARD_STATE;
  }, [currentId, rows]);

  const grade = async (g: Grade) => {
    if (!card) return;
    const result = review(cardState, g);
    const nowIso = new Date().toISOString();

    // Update local state so the queue and previews stay coherent
    setRows(prev => {
      const next = new Map(prev);
      const existing = prev.get(card.id);
      next.set(card.id, {
        ease: result.ease,
        intervalDays: result.intervalDays,
        reps: result.reps,
        lapses: result.lapses,
        dueAt: result.dueAt.toISOString(),
        createdAt: existing?.createdAt ?? nowIso,
      });
      return next;
    });

    // Persist (fire-and-forget)
    if (signedIn) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase
          .from('vocab_progress')
          .upsert(
            {
              user_id: user.id,
              card_id: card.id,
              ease: result.ease,
              interval_days: result.intervalDays,
              reps: result.reps,
              lapses: result.lapses,
              due_at: result.dueAt.toISOString(),
              last_grade: g,
              updated_at: nowIso,
            },
            { onConflict: 'user_id,card_id' }
          )
          .then(({ error }) => { if (error) console.error('[drill] save failed', error); });
      }
    }

    setStats(s => ({ ...s, [g]: s[g] + 1 }));
    setQueue(prev => {
      const rest = prev.slice(1);
      if (g === 'again') {
        // Re-insert a few cards later (or at the end of a short queue)
        const at = Math.min(3, rest.length);
        return [...rest.slice(0, at), card.id, ...rest.slice(at)];
      }
      return rest;
    });
    if (g !== 'again') setDone(d => d + 1);
    setRevealed(false);
  };

  const remaining = queue.length;

  return (
    <div>
      <Topbar
        title="Vocabulary Drill"
        subtitle="Greek and Latin, on the spacing your memory actually needs"
      />

      {!signedIn && !loading && (
        <p className="text-academy-gold text-xs mb-4 italic">
          Practice mode — sign in to save your progress between sessions.
        </p>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'greek', 'latin'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border transition-colors ${
              filter === f
                ? 'border-academy-gold text-academy-gold bg-academy-gold/10'
                : 'border-academy-border text-academy-muted hover:text-academy-text'
            }`}
          >
            {f === 'all' ? 'Both' : f === 'greek' ? 'Greek' : 'Latin'}
          </button>
        ))}
        <p className="ml-auto text-academy-muted text-xs">
          {loading ? 'Loading…' : `${remaining} in queue · ${done} done`}
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <p className="font-serif text-academy-muted italic text-sm">Shuffling the deck…</p>
        </div>
      ) : !card ? (
        /* ── Session complete ── */
        <div className="max-w-xl mx-auto bg-academy-card border border-academy-gold/30 rounded-xl px-8 py-14 text-center">
          <p className="text-4xl mb-4">🏺</p>
          <h2 className="font-serif text-2xl text-academy-text mb-2">Drill complete</h2>
          <p className="text-academy-muted text-sm leading-relaxed mb-4">
            {done > 0
              ? `${done} card${done === 1 ? '' : 's'} reviewed — ${stats.good + stats.easy} solid, ${stats.hard} shaky, ${stats.again} relearned.`
              : 'Nothing due right now.'}
            {' '}New cards and reviews return on their schedule — come back tomorrow.
          </p>
          <p className="text-academy-muted text-xs italic mb-6">
            Repetitio mater memoriae — repetition is the mother of memory.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-academy-gold text-navy font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90"
          >
            Back to the Dashboard
          </Link>
        </div>
      ) : (
        /* ── The card ── */
        <div className="max-w-xl mx-auto">
          <div className="bg-academy-card border border-academy-border rounded-xl px-8 py-12 text-center min-h-[280px] flex flex-col items-center justify-center">
            <p className="text-academy-muted text-[10px] font-mono uppercase tracking-widest mb-6">
              {card.courseCode} · Session {card.session}
              {!rows.has(card.id) && <span className="ml-2 text-academy-gold">new</span>}
            </p>
            <p
              className="text-3xl text-academy-text mb-3"
              style={GREEK_RE.test(card.front) ? { fontFamily: DM_MONO } : { fontFamily: 'inherit' }}
            >
              {card.front}
            </p>
            {revealed && (
              <>
                <p className="text-academy-muted text-sm font-mono mb-4">{card.hint}</p>
                <div className="border-t border-academy-gold/20 pt-4 w-full max-w-xs mx-auto">
                  <p className="text-academy-text text-base leading-relaxed">{card.back}</p>
                </div>
              </>
            )}
          </div>

          <div className="mt-5">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full bg-academy-gold text-navy font-semibold rounded-lg py-3.5 text-sm hover:opacity-90"
              >
                Reveal
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {([
                  ['again', 'Again', 'border-red-500/50 text-red-400 hover:bg-red-500/10'],
                  ['hard', 'Hard', 'border-academy-gold/50 text-academy-gold hover:bg-academy-gold/10'],
                  ['good', 'Good', 'border-green-500/40 text-green-400 hover:bg-green-500/10'],
                  ['easy', 'Easy', 'border-academy-border text-academy-text hover:bg-navy/60'],
                ] as [Grade, string, string][]).map(([g, label, cls]) => (
                  <button
                    key={g}
                    onClick={() => grade(g)}
                    className={`border rounded-lg py-3 text-sm font-semibold transition-colors ${cls}`}
                  >
                    {label}
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                      {previewInterval(cardState, g)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

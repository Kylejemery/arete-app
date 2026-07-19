'use client';

// The Practicum — lived-time practice logs for the Year 2 courses.
//
// Two instruments in one page:
//   PHIL 706 — the anger practicum (weeks 2–6): per-episode protocol
//   (flash → judgment → offender's good → corrected response) plus the
//   nightly Sextius review. "They're just evil" is rejected by design.
//   PHIL 707 — the digital fast: schedule → daily log → completion review.
//   The completion review ('fast_review') opens the PHIL 707 capstone gate.
//
// Data: practicum_logs (user_id, course_id, episode jsonb, created_at),
// RLS own-row. Recent 706 entries are injected into the Proctor's context
// on the PHIL 706 course page.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardLabel } from '@/components/ui/Card';

type Tab = 'anger' | 'fast';

interface LogRow {
  id: string;
  course_id: string;
  episode: Record<string, unknown>;
  created_at: string;
}

const ABDICATIONS = /(they('| a)?re?\s+)?(just|pure(ly)?|simply)\s+(evil|bad|crazy|insane)|no reason|because they('| a)?re? evil/i;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function PracticumPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('anger');
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Anger episode form ──────────────────────────────────────────────────
  const [flash, setFlash] = useState('');
  const [judgment, setJudgment] = useState('');
  const [assent, setAssent] = useState<'none' | 'one' | 'both'>('none');
  const [offendersGood, setOffendersGood] = useState('');
  const [corrected, setCorrected] = useState('');

  // ── Evening review form ─────────────────────────────────────────────────
  const [habitCured, setHabitCured] = useState('');
  const [faultResisted, setFaultResisted] = useState('');
  const [respectBetter, setRespectBetter] = useState('');

  // ── Fast forms ──────────────────────────────────────────────────────────
  const [fastForm, setFastForm] = useState<'digital-sabbath' | 'austerity-week' | 'media-fast'>('austerity-week');
  const [fastStart, setFastStart] = useState('');
  const [fastEnd, setFastEnd] = useState('');
  const [fastExceptions, setFastExceptions] = useState('');
  const [fastSubstitutions, setFastSubstitutions] = useState('');
  const [dayReaches, setDayReaches] = useState('');
  const [dayWeather, setDayWeather] = useState('');
  const [dayCollisions, setDayCollisions] = useState('');
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewAmendments, setReviewAmendments] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data } = await supabase
        .from('practicum_logs')
        .select('id, course_id, episode, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setRows((data as LogRow[]) ?? []);
      setLoaded(true);
    })();
  }, [router]);

  const angerRows = useMemo(() => rows.filter(r => r.course_id === 'phil-706'), [rows]);
  const fastRows = useMemo(() => rows.filter(r => r.course_id === 'phil-707'), [rows]);
  const episodes = useMemo(() => angerRows.filter(r => r.episode.type === 'episode'), [angerRows]);
  const reviews = useMemo(() => angerRows.filter(r => r.episode.type === 'evening_review'), [angerRows]);
  const fastScheduled = useMemo(() => fastRows.find(r => r.episode.type === 'fast_scheduled'), [fastRows]);
  const fastDays = useMemo(() => fastRows.filter(r => r.episode.type === 'fast_day'), [fastRows]);
  const fastReview = useMemo(() => fastRows.find(r => r.episode.type === 'fast_review'), [fastRows]);

  // ── Trends ──────────────────────────────────────────────────────────────
  const trends = useMemo(() => {
    const week = episodes.filter(r => new Date(r.created_at) >= daysAgo(7)).length;
    const prevWeek = episodes.filter(r => {
      const d = new Date(r.created_at);
      return d >= daysAgo(14) && d < daysAgo(7);
    }).length;
    const signed = episodes.filter(r => r.episode.assent === 'both' || r.episode.assent === 'one').length;
    const assentRate = episodes.length > 0 ? Math.round((signed / episodes.length) * 100) : null;
    // Evening-review streak: consecutive days ending today or yesterday.
    const reviewDates = new Set(reviews.map(r => new Date(r.created_at).toDateString()));
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = daysAgo(i).toDateString();
      if (reviewDates.has(d)) streak++;
      else if (i > 0) break; // today may not be logged yet
    }
    return { week, prevWeek, assentRate, streak };
  }, [episodes, reviews]);

  async function insert(courseId: string, episode: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { data, error: err } = await supabase
      .from('practicum_logs')
      .insert({ user_id: user.id, course_id: courseId, episode })
      .select('id, course_id, episode, created_at')
      .single();
    setSaving(false);
    if (err) { setError(err.message); return false; }
    setRows(prev => [data as LogRow, ...prev]);
    return true;
  }

  async function submitEpisode() {
    if (!flash.trim() || !judgment.trim() || !corrected.trim()) {
      setError('All fields are required — the analysis is the practice.');
      return;
    }
    const good = offendersGood.trim();
    if (good.length < 15 || ABDICATIONS.test(good)) {
      setError("\"They're just evil\" is rejected by design. No one does wrong willingly — name the mistaken good the other person was actually pursuing.");
      return;
    }
    const ok = await insert('phil-706', {
      type: 'episode',
      flash: flash.trim(),
      judgment: judgment.trim(),
      assent,
      offenders_good: good,
      corrected_response: corrected.trim(),
    });
    if (ok) {
      setFlash(''); setJudgment(''); setAssent('none'); setOffendersGood(''); setCorrected('');
      setNotice('Episode logged. The flash was weather; the analysis was the practice.');
    }
  }

  async function submitReview() {
    if (!habitCured.trim() && !faultResisted.trim() && !respectBetter.trim()) {
      setError('Answer at least one of Sextius’s questions.');
      return;
    }
    const ok = await insert('phil-706', {
      type: 'evening_review',
      habit_cured: habitCured.trim(),
      fault_resisted: faultResisted.trim(),
      respect_better: respectBetter.trim(),
    });
    if (ok) {
      setHabitCured(''); setFaultResisted(''); setRespectBetter('');
      setNotice('Review filed. See that you do not do it again — this time you are pardoned.');
    }
  }

  async function submitFastSchedule() {
    if (!fastStart || !fastEnd) { setError('Set the start and end dates — the fast is scheduled, bounded, and chosen.'); return; }
    if (!fastExceptions.trim()) { setError('Write the exceptions now, narrowly — the exception invented mid-fast is the fast failing.'); return; }
    const ok = await insert('phil-707', {
      type: 'fast_scheduled',
      form: fastForm,
      start_date: fastStart,
      end_date: fastEnd,
      exceptions: fastExceptions.trim(),
      substitutions: fastSubstitutions.trim(),
    });
    if (ok) setNotice('Fast scheduled. Log daily — reaches, weather, collisions.');
  }

  async function submitFastDay() {
    if (!dayReaches.trim() && !dayWeather.trim() && !dayCollisions.trim()) {
      setError('Log at least one dataset — reaches, weather, or collisions.');
      return;
    }
    const ok = await insert('phil-707', {
      type: 'fast_day',
      reaches: dayReaches.trim(),
      weather: dayWeather.trim(),
      collisions: dayCollisions.trim(),
    });
    if (ok) {
      setDayReaches(''); setDayWeather(''); setDayCollisions('');
      setNotice('Day logged. Reckon the days — visibly.');
    }
  }

  async function submitFastReview() {
    if (!reviewAnswer.trim()) {
      setError('Answer Seneca’s question: is this the condition that I feared?');
      return;
    }
    if (fastDays.length === 0) {
      setError('The review requires daily logs — a fast without data was not fully run.');
      return;
    }
    const ok = await insert('phil-707', {
      type: 'fast_review',
      answer: reviewAnswer.trim(),
      amendments: reviewAmendments.trim(),
      days_logged: fastDays.length,
    });
    if (ok) {
      setReviewAnswer(''); setReviewAmendments('');
      setNotice('Fast complete and reviewed. The PHIL 707 capstone gate is open.');
    }
  }

  const inputCls = 'w-full bg-academy-bg border border-academy-border rounded-lg px-3 py-2 text-sm text-academy-text placeholder:text-academy-muted/50 focus:outline-none focus:border-academy-gold';

  if (!loaded) {
    return <div className="p-8 text-academy-muted text-sm">Opening the practicum…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">Year 2 Practicum</p>
      <h1 className="font-serif text-3xl text-academy-text mb-2">The Practicum</h1>
      <p className="text-academy-muted text-sm mb-6 leading-relaxed">
        Doctrine proven in the field. The anger practicum runs with PHIL 706 (weeks 2–6);
        the digital fast gates the PHIL 707 capstone.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab('anger'); setError(null); setNotice(null); }}
          className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide border transition-colors ${tab === 'anger' ? 'border-academy-gold text-academy-gold' : 'border-academy-border text-academy-muted hover:text-academy-text'}`}
        >
          Anger Practicum · PHIL 706
        </button>
        <button
          onClick={() => { setTab('fast'); setError(null); setNotice(null); }}
          className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide border transition-colors ${tab === 'fast' ? 'border-academy-gold text-academy-gold' : 'border-academy-border text-academy-muted hover:text-academy-text'}`}
        >
          Digital Fast · PHIL 707
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {notice && <p className="text-academy-gold text-sm mb-4">{notice}</p>}

      {tab === 'anger' && (
        <>
          {/* Trends */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardLabel>Episodes / week</CardLabel>
              <p className="font-serif text-2xl text-academy-text mt-1">
                {trends.week}
                <span className="text-academy-muted text-sm ml-2">prev {trends.prevWeek}</span>
              </p>
            </Card>
            <Card>
              <CardLabel>Assent rate</CardLabel>
              <p className="font-serif text-2xl text-academy-text mt-1">
                {trends.assentRate === null ? '—' : `${trends.assentRate}%`}
              </p>
            </Card>
            <Card>
              <CardLabel>Review streak</CardLabel>
              <p className="font-serif text-2xl text-academy-text mt-1">{trends.streak}<span className="text-academy-muted text-sm ml-1">days</span></p>
            </Card>
          </div>

          {/* Episode form */}
          <Card className="mb-6">
            <CardLabel>Log an episode</CardLabel>
            <div className="space-y-3 mt-3">
              <div>
                <label className="text-academy-muted text-xs block mb-1">1 · The flash — situation and first movement, weather-report language, no judgment yet</label>
                <textarea value={flash} onChange={e => setFlash(e.target.value)} rows={2} className={inputCls} placeholder="Merge on the highway; heat in the chest, jaw clenched." />
              </div>
              <div>
                <label className="text-academy-muted text-xs block mb-1">2 · The judgment — what exactly did you tell yourself, verbatim?</label>
                <textarea value={judgment} onChange={e => setJudgment(e.target.value)} rows={2} className={inputCls} placeholder="&quot;He did that on purpose. People like that need to be taught.&quot;" />
                <div className="flex gap-2 mt-2">
                  {(['none', 'one', 'both'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setAssent(v)}
                      className={`px-3 py-1 rounded-full text-xs border ${assent === v ? 'border-academy-gold text-academy-gold' : 'border-academy-border text-academy-muted'}`}
                    >
                      {v === 'none' ? 'Signed neither clause' : v === 'one' ? 'Signed one clause' : 'Signed both — anger occurred'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-academy-muted text-xs block mb-1">3 · The offender&rsquo;s good — required; &ldquo;they&rsquo;re just evil&rdquo; is rejected</label>
                <textarea value={offendersGood} onChange={e => setOffendersGood(e.target.value)} rows={2} className={inputCls} placeholder="What mistaken good were they pursuing? (Being on time mattered more than my fender; standing mattered more than accuracy…)" />
              </div>
              <div>
                <label className="text-academy-muted text-xs block mb-1">4 · The corrected response — teaching, pity, or firm correction</label>
                <textarea value={corrected} onChange={e => setCorrected(e.target.value)} rows={2} className={inputCls} placeholder="What does the physician do here that the avenger would not?" />
              </div>
              <button onClick={submitEpisode} disabled={saving} className="bg-academy-gold text-academy-bg text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? 'Logging…' : 'Log episode'}
              </button>
            </div>
          </Card>

          {/* Evening review */}
          <Card className="mb-6">
            <CardLabel>Evening review — Seneca, De Ira 3.36</CardLabel>
            <p className="text-academy-muted text-xs mt-1 mb-3 italic">
              &ldquo;I sit in judgment on my day. I hide nothing from myself, I pass over nothing.&rdquo; Once nightly, episodes or none.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-academy-muted text-xs block mb-1">What bad habit have you cured today?</label>
                <input value={habitCured} onChange={e => setHabitCured(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-academy-muted text-xs block mb-1">What fault have you resisted?</label>
                <input value={faultResisted} onChange={e => setFaultResisted(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-academy-muted text-xs block mb-1">In what respect are you better?</label>
                <input value={respectBetter} onChange={e => setRespectBetter(e.target.value)} className={inputCls} />
              </div>
              <button onClick={submitReview} disabled={saving} className="border border-academy-gold text-academy-gold text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                File the review
              </button>
            </div>
          </Card>

          {/* Recent entries */}
          <Card>
            <CardLabel>Recent entries</CardLabel>
            {angerRows.length === 0 ? (
              <p className="text-academy-muted text-sm mt-2">Nothing logged yet. The practicum opens in PHIL 706 Session 2.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {angerRows.slice(0, 12).map(r => (
                  <li key={r.id} className="border-t border-academy-border pt-3 first:border-t-0 first:pt-0">
                    <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                      {r.episode.type === 'episode' ? 'Episode' : 'Evening review'} · {fmtDate(r.created_at)}
                      {r.episode.type === 'episode' && (
                        <span className="text-academy-muted normal-case tracking-normal font-normal ml-2">
                          {r.episode.assent === 'both' ? 'signed both clauses' : r.episode.assent === 'one' ? 'signed one clause' : 'unsigned'}
                        </span>
                      )}
                    </p>
                    <p className="text-academy-muted text-xs mt-1 leading-relaxed">
                      {r.episode.type === 'episode'
                        ? `${r.episode.flash as string} — their good: ${r.episode.offenders_good as string}`
                        : [r.episode.habit_cured, r.episode.fault_resisted, r.episode.respect_better].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === 'fast' && (
        <>
          {!fastScheduled ? (
            <Card className="mb-6">
              <CardLabel>Schedule the fast — Seneca, Letter 18</CardLabel>
              <p className="text-academy-muted text-xs mt-1 mb-3 italic">
                &ldquo;Set aside a certain number of days… saying to yourself the while: is this the condition that I feared?&rdquo;
                Scheduled, bounded, chosen. The PHIL 707 capstone will not convene until the fast has run and been reviewed.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-academy-muted text-xs block mb-1">Form — chosen by your log&rsquo;s evidence, not by ambition</label>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      ['digital-sabbath', 'Digital sabbath (weekly)'],
                      ['austerity-week', 'Dopamine austerity week'],
                      ['media-fast', 'Full media fast'],
                    ] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setFastForm(v)} className={`px-3 py-1 rounded-full text-xs border ${fastForm === v ? 'border-academy-gold text-academy-gold' : 'border-academy-border text-academy-muted'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">Start</label>
                    <input type="date" value={fastStart} onChange={e => setFastStart(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">End</label>
                    <input type="date" value={fastEnd} onChange={e => setFastEnd(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-academy-muted text-xs block mb-1">Exceptions — written narrowly, in advance</label>
                  <textarea value={fastExceptions} onChange={e => setFastExceptions(e.target.value)} rows={2} className={inputCls} placeholder="Messages from persons; the news protocol's action-relevant minimum; work tools." />
                </div>
                <div>
                  <label className="text-academy-muted text-xs block mb-1">Substitution schedule — the freed hours, pre-assigned</label>
                  <textarea value={fastSubstitutions} onChange={e => setFastSubstitutions(e.target.value)} rows={2} className={inputCls} placeholder="Evening walk; the letter to J.; unum aliquid at lunch; the standing call." />
                </div>
                <button onClick={submitFastSchedule} disabled={saving} className="bg-academy-gold text-academy-bg text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                  Schedule the fast
                </button>
              </div>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardLabel>The scheduled fast</CardLabel>
              <p className="text-academy-text text-sm mt-2">
                {String(fastScheduled.episode.form).replace(/-/g, ' ')} · {String(fastScheduled.episode.start_date)} → {String(fastScheduled.episode.end_date)}
              </p>
              <p className="text-academy-muted text-xs mt-1">Exceptions: {String(fastScheduled.episode.exceptions)}</p>
              {fastScheduled.episode.substitutions ? (
                <p className="text-academy-muted text-xs mt-1">Substitutions: {String(fastScheduled.episode.substitutions)}</p>
              ) : null}
              <p className={`text-xs font-semibold mt-3 ${fastReview ? 'text-academy-gold' : 'text-academy-muted'}`}>
                {fastReview ? '✓ Completed and reviewed — the capstone gate is open.' : `${fastDays.length} day${fastDays.length === 1 ? '' : 's'} logged — capstone gate closed until the completion review.`}
              </p>
            </Card>
          )}

          {fastScheduled && !fastReview && (
            <>
              <Card className="mb-6">
                <CardLabel>Daily log — the three datasets</CardLabel>
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">Reaches — every phantom reach, with its trigger</label>
                    <textarea value={dayReaches} onChange={e => setDayReaches(e.target.value)} rows={2} className={inputCls} placeholder="Elevator (3), pause in conversation (2), first minute of boredom (4)…" />
                  </div>
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">Weather — mood, sleep, attention, the felt length of the day</label>
                    <textarea value={dayWeather} onChange={e => setDayWeather(e.target.value)} rows={2} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">Collisions — what arose in the unfilled intervals</label>
                    <textarea value={dayCollisions} onChange={e => setDayCollisions(e.target.value)} rows={2} className={inputCls} />
                  </div>
                  <button onClick={submitFastDay} disabled={saving} className="bg-academy-gold text-academy-bg text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                    Log the day
                  </button>
                </div>
              </Card>

              <Card className="mb-6">
                <CardLabel>Completion review — the day after the fast ends</CardLabel>
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">Is this the condition that I feared? — answered from the data, in your words</label>
                    <textarea value={reviewAnswer} onChange={e => setReviewAnswer(e.target.value)} rows={3} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-academy-muted text-xs block mb-1">Amendments the data forced on your Rule of Life</label>
                    <textarea value={reviewAmendments} onChange={e => setReviewAmendments(e.target.value)} rows={2} className={inputCls} placeholder="The notification that was never missed stays dead; the feed whose absence improved the weather stays bounded…" />
                  </div>
                  <button onClick={submitFastReview} disabled={saving} className="border border-academy-gold text-academy-gold text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                    File the completion review
                  </button>
                </div>
              </Card>
            </>
          )}

          <Card>
            <CardLabel>Fast log</CardLabel>
            {fastRows.length === 0 ? (
              <p className="text-academy-muted text-sm mt-2">Nothing logged yet. The fast is designed in PHIL 707 Session 8 (or begun early in Session 4).</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {fastRows.slice(0, 12).map(r => (
                  <li key={r.id} className="border-t border-academy-border pt-3 first:border-t-0 first:pt-0">
                    <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                      {String(r.episode.type).replace(/_/g, ' ')} · {fmtDate(r.created_at)}
                    </p>
                    <p className="text-academy-muted text-xs mt-1 leading-relaxed">
                      {r.episode.type === 'fast_day'
                        ? [r.episode.reaches, r.episode.weather, r.episode.collisions].filter(Boolean).join(' · ')
                        : r.episode.type === 'fast_review'
                          ? String(r.episode.answer)
                          : `${String(r.episode.form).replace(/-/g, ' ')} — ${String(r.episode.start_date)} → ${String(r.episode.end_date)}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

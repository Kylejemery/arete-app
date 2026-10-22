'use client';

// The classroom for a Seminar Track course (sem-NNN), the same three panels
// as the formation sequence: units on the left, the unit in the middle
// (Reading, Seminar transcript, Quiz), the Socratic Proctor on the right.
// Course data comes from the database through the Railway server
// (server/routes/seminar.js), not from academy/web/src/data.
//
// The reading pane follows licence (Seminar Track spec, Part 2):
// full_text_corpus readings print the public domain text; own_copy readings
// give the assignment, the guide and the corpus summary, and the book is read
// from the student's own copy; the admin alone also sees a private full text.
//
// Progress is the formation sequence's: academy_sessions holds the Proctor
// thread per unit, session_progress the quiz result (StudentQuiz writes it),
// and unit N opens when unit N-1 is passed. The quiz is graded under the
// doctoral standard (lib/doctoral.ts covers sem-8xx).
//
// The Proctor never sees a private full text. For a counterposition course it
// gets the unit's corpus summaries labelled as the object under examination,
// and the fence rule: examine the opponent, never adopt him.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrCreateSession, appendSeminarMessage, getEnrollment } from '@/lib/db';
import { SYSTEM_PROMPTS } from '@/lib/agents';
import { ChatMessage, TypingIndicator } from '@/components/seminar/ChatMessage';
import StudentQuiz, { type QuizQuestion } from '@/components/StudentQuiz';
import { toRoman } from '@/lib/roman';
import type { SeminarMessage, SeminarSession } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const PROCTOR_CONTEXT_CHARS = 8000;

interface Course { id: string; title: string; subtitle: string | null; description: string | null; stance: string; status: string; tier_required: string }
interface Unit { id: string; unit_number: number; title: string; objectives: string[]; key_concepts: string[]; proctor_brief: string | null; status: string; question_count: number }
interface Passage { chunk_id: string; section_label: string | null; text: string; text_type: string }
interface Reading { id: string; position: number; author: string; work: string; locator: string; role: string; access: string; reading_guide: string | null; passages: Passage[]; full_text: string | null }
interface Cite { author: string; work: string; locator: string; chunk_id?: string }
interface Turn { n: number; speaker: string; text: string; segment: string; cites: Cite[] }
interface Transcript { id: string; version: number; speakers: { key: string; display: string }[]; turns: Turn[]; word_count: number; est_minutes: number; audio_status: string }
interface UnitDetail { admin: boolean; unit: Unit; readings: Reading[]; transcript: Transcript | null; questions: { id: string; type: string; prompt: string; answer: string }[] }

async function authed(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const ROLE_LABEL: Record<string, string> = { assigned: 'Assigned', counter_reading: 'Counter reading', optional: 'Optional' };
const SEGMENT_LABEL: Record<string, string> = {
  opening: 'Opening', exposition: 'Exposition', steelman: 'The case at full strength', cross_examination: 'Cross examination',
  worked_example: 'Worked example', student_objection: 'Objection', synthesis: 'Synthesis', exercise: 'Exercise',
};

export default function SeminarTrackCourse({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [admin, setAdmin] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [activeNumber, setActiveNumber] = useState(1);
  const [detail, setDetail] = useState<UnitDetail | null>(null);
  const [progress, setProgress] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<'reading' | 'transcript' | 'quiz'>('reading');

  const loadProgress = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('session_progress').select('session_id, status').eq('user_id', user.id).eq('course_id', courseId);
    setProgress(Object.fromEntries((data ?? []).map(r => [r.session_id as number, r.status as string])));
  }, [courseId]);

  useEffect(() => {
    authed(`/api/seminar/courses/${courseId}`).then(r => {
      if (!r.ok) { setBlocked(r.data.error || 'This seminar is not open.'); return; }
      setCourse(r.data.course); setUnits(r.data.units); setAdmin(r.data.admin);
      const n = Number(new URLSearchParams(window.location.search).get('unit'));
      if (Number.isInteger(n) && r.data.units.some((u: Unit) => u.unit_number === n)) setActiveNumber(n);
      else if (r.data.units[0]) setActiveNumber(r.data.units[0].unit_number);
    });
    loadProgress();
  }, [courseId, loadProgress]);

  // Unit N opens when the unit before it is passed; a unit with no approved
  // questions does not gate. The admin sees everything.
  const locked = useMemo(() => {
    const out: Record<number, boolean> = {};
    units.forEach((u, i) => {
      const prev = units[i - 1];
      out[u.unit_number] = !admin && !!prev && prev.question_count > 0 && progress[prev.unit_number] !== 'passed';
    });
    return out;
  }, [units, progress, admin]);

  const active = units.find(u => u.unit_number === activeNumber) ?? null;

  useEffect(() => {
    if (!active || locked[active.unit_number]) { setDetail(null); return; }
    setDetail(null);
    authed(`/api/seminar/units/${active.id}`).then(r => { if (r.ok) setDetail(r.data); });
  }, [active, locked]);

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="font-serif text-2xl text-academy-text mb-3">Seminar</h2>
        <p className="text-academy-muted text-sm max-w-sm">{blocked}</p>
        <Link href="/dashboard/courses" className="text-academy-gold text-xs font-semibold mt-6">Course catalog &rarr;</Link>
      </div>
    );
  }
  if (!course) return <p className="text-academy-muted text-sm italic p-8">Opening the seminar room...</p>;

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0">
      {/* Units */}
      <aside className="w-[220px] flex-shrink-0 border-r border-academy-border overflow-y-auto py-6 px-4">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-academy-gold mb-1">{course.id.replace('sem-', 'SEM ')}</p>
        <h1 className="font-serif text-lg text-academy-text leading-snug mb-1">{course.title}</h1>
        {course.subtitle && <p className="text-academy-muted text-xs italic mb-5">{course.subtitle}</p>}
        {admin && course.status !== 'published' && (
          <p className="text-[10px] uppercase tracking-widest text-academy-gold border border-academy-gold/40 rounded px-2 py-1 mb-4">Draft · visible to you</p>
        )}
        <ul className="space-y-1">
          {units.map(u => (
            <li key={u.id}>
              <button
                onClick={() => !locked[u.unit_number] && setActiveNumber(u.unit_number)}
                disabled={locked[u.unit_number]}
                className={`w-full text-left rounded px-2 py-2 text-sm flex gap-2 ${u.unit_number === activeNumber ? 'bg-academy-card text-academy-gold' : locked[u.unit_number] ? 'text-academy-muted/50' : 'text-academy-text hover:bg-academy-card/60'}`}
              >
                <span className="font-serif w-6 flex-shrink-0">{toRoman(u.unit_number)}</span>
                <span className="leading-snug">
                  {u.title}
                  {progress[u.unit_number] === 'passed' && <span className="text-academy-gold text-[10px] ml-1">· passed</span>}
                  {admin && u.status !== 'published' && <span className="text-academy-muted text-[10px] ml-1">· {u.status}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* The unit */}
      <main className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
        {!active ? (
          <p className="text-academy-muted italic text-sm">No units are open yet.</p>
        ) : locked[active.unit_number] ? (
          <p className="text-academy-muted text-sm">Pass the quiz for the previous unit to open this one.</p>
        ) : !detail ? (
          <p className="text-academy-muted italic text-sm">Laying out the readings...</p>
        ) : (
          <>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-academy-gold mb-1">Unit {toRoman(active.unit_number)}</p>
            <h2 className="font-serif text-2xl text-academy-text mb-3">{active.title}</h2>
            {active.objectives?.length > 0 && (
              <ul className="text-sm text-academy-muted mb-5 list-disc pl-5 space-y-1">{active.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
            )}
            <div className="flex gap-6 border-b border-academy-border mb-6 text-sm">
              {(['reading', 'transcript', 'quiz'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`pb-2 -mb-px ${tab === t ? 'text-academy-gold border-b-2 border-academy-gold' : 'text-academy-muted'}`}>
                  {t === 'reading' ? 'Reading' : t === 'transcript' ? 'Seminar' : `Quiz${detail.questions.length ? ` (${detail.questions.length})` : ''}`}
                </button>
              ))}
            </div>
            {tab === 'reading' && <ReadingPane readings={detail.readings} admin={detail.admin} />}
            {tab === 'transcript' && <TranscriptView transcript={detail.transcript} />}
            {tab === 'quiz' && (
              detail.questions.length === 0
                ? <p className="text-academy-muted italic text-sm">This unit has no written questions yet.</p>
                : <StudentQuiz
                    key={`${courseId}-${active.unit_number}`}
                    courseId={courseId}
                    sessionId={active.unit_number}
                    questions={detail.questions.map(q => ({ question: q.prompt, answer: q.answer } as QuizQuestion))}
                    onSubmitted={loadProgress}
                  />
            )}
          </>
        )}
      </main>

      {/* The Proctor */}
      <aside className="w-[380px] flex-shrink-0 border-l border-academy-border flex flex-col min-h-0">
        {active && detail && !locked[active.unit_number]
          ? <ProctorPanel key={active.id} course={course} unit={active} detail={detail} />
          : <p className="text-academy-muted italic text-sm p-6">The Proctor convenes when a unit is open.</p>}
      </aside>
    </div>
  );
}

// ── Reading pane ────────────────────────────────────────────────────────────

function ReadingPane({ readings, admin }: { readings: Reading[]; admin: boolean }) {
  if (!readings.length) return <p className="text-academy-muted italic text-sm">No readings are assigned to this unit.</p>;
  return (
    <div className="space-y-8">
      {readings.map(r => (
        <section key={r.id} className="bg-academy-card border border-academy-border rounded-lg p-5">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-academy-gold mb-1">{ROLE_LABEL[r.role] ?? r.role}</p>
          <h3 className="font-serif text-lg text-academy-text">{r.author}, <em>{r.work}</em></h3>
          <p className="text-academy-muted text-xs mb-3">{r.locator}</p>
          {r.reading_guide && (
            <p className="text-sm italic text-[#e0d5b5] border-l-2 border-academy-gold pl-3 mb-4">{r.reading_guide}</p>
          )}

          {r.access === 'own_copy' && (
            <p className="text-sm text-academy-text mb-4">
              Read this in your own copy: {r.author}, <em>{r.work}</em>, {r.locator}. The Academy does not reproduce the book.
            </p>
          )}

          {admin && r.full_text && (
            <details className="mb-4">
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-academy-gold">Your private copy · visible only to you</summary>
              <div className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-academy-text font-serif">{r.full_text}</div>
            </details>
          )}

          {r.passages.length > 0 && (
            r.access === 'full_text_corpus' ? (
              <div className="space-y-4">
                {r.passages.map(p => (
                  <div key={p.chunk_id}>
                    {p.section_label && <p className="text-[10px] uppercase tracking-widest text-academy-muted mb-1">{p.section_label}</p>}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-academy-text font-serif">{p.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <details>
                <summary className="cursor-pointer text-xs uppercase tracking-widest text-academy-muted">Corpus summary</summary>
                <div className="mt-3 space-y-3">
                  {r.passages.map(p => <p key={p.chunk_id} className="whitespace-pre-wrap text-sm leading-relaxed text-academy-muted">{p.text}</p>)}
                </div>
              </details>
            )
          )}
        </section>
      ))}
    </div>
  );
}

// ── The seminar transcript, as a script ─────────────────────────────────────

function TranscriptView({ transcript }: { transcript: Transcript | null }) {
  if (!transcript) return <p className="text-academy-muted italic text-sm">The seminar for this unit is being prepared.</p>;
  const name = (k: string) => transcript.speakers?.find(s => s.key === k)?.display ?? (k === 'tutor' ? 'Tutor' : 'Student');
  let lastSegment = '';
  let note = 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-academy-muted text-xs">{transcript.word_count} words · about {transcript.est_minutes} minutes</p>
        <button disabled className="text-xs uppercase tracking-widest text-academy-muted border border-academy-border rounded px-3 py-1.5 cursor-not-allowed" title="Audio is not available yet">
          Listen · coming later
        </button>
      </div>
      <div className="space-y-4 max-w-2xl">
        {transcript.turns.map(t => {
          const head = t.segment !== lastSegment ? SEGMENT_LABEL[t.segment] ?? t.segment : null;
          lastSegment = t.segment;
          return (
            <div key={t.n}>
              {head && <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-academy-gold mt-6 mb-2">{head}</p>}
              <p className="text-sm leading-relaxed text-academy-text">
                <span className={`font-semibold ${t.speaker === 'tutor' ? 'text-academy-gold' : 'text-[#e0d5b5]'}`}>{name(t.speaker)}.</span>{' '}
                {t.text}
                {t.cites.map((c, i) => {
                  note += 1;
                  return (
                    <sup key={i} className="text-academy-gold cursor-help ml-0.5" title={`${c.author}, ${c.work}${c.locator ? `, ${c.locator}` : ''}`}>{note}</sup>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── The Socratic Proctor ────────────────────────────────────────────────────

function proctorContext(course: Course, unit: Unit, detail: UnitDetail): string {
  const ctx: string[] = [
    `This is a Seminar Track course (${course.id}, ${course.title}), unit ${unit.unit_number}: ${unit.title}.`,
    `Learning objectives: ${(unit.objectives || []).join('; ')}`,
  ];
  if (unit.proctor_brief) ctx.push(`What to probe and what mastery looks like: ${unit.proctor_brief}`);
  ctx.push(`Assigned readings: ${detail.readings.map(r => `${r.author}, ${r.work}, ${r.locator} (${ROLE_LABEL[r.role] ?? r.role})`).join('; ')}`);
  if (course.stance !== 'aligned') {
    ctx.push('This course reads a modern author as an opponent of the Stoics. You examine the opponent and never adopt him: never call his prescriptions good advice, never tell the student to follow them. You may grant where he saw something true about human beings, then press the student on what the Stoic does with that truth instead.');
    let budget = PROCTOR_CONTEXT_CHARS;
    const objects: string[] = [];
    for (const r of detail.readings) {
      if (r.access === 'full_text_corpus') continue;
      for (const p of r.passages) {
        if (budget <= 0) break;
        const text = p.text.slice(0, budget);
        budget -= text.length;
        objects.push(`[OBJECT UNDER EXAMINATION, never advice: ${r.author}, ${r.work}, corpus summary]\n${text}`);
      }
    }
    if (objects.length) ctx.push(objects.join('\n\n'));
  }
  return ctx.join('\n\n');
}

function ProctorPanel({ course, unit, detail }: { course: Course; unit: Unit; detail: UnitDetail }) {
  const [session, setSession] = useState<SeminarSession | null>(null);
  const [messages, setMessages] = useState<SeminarMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState('auditor');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOrCreateSession(course.id, 'socratic-proctor', unit.unit_number).then(s => {
      setSession(s);
      setMessages((s?.messages as SeminarMessage[]) ?? []);
    });
    getEnrollment().then(e => { if (e) setTier(e.tier); });
  }, [course.id, unit.unit_number]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading || !session) return;
    const userMsg: SeminarMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(''); setLoading(true);
    await appendSeminarMessage(session.id, userMsg).catch(console.error);
    try {
      const assigned = detail.readings.filter(r => r.role === 'assigned').map(r => `${r.author}, ${r.work}, ${r.locator}`).join('; ');
      const systemPrompt = SYSTEM_PROMPTS['socratic-proctor']
        .replace('{course_id}', course.id)
        .replace('{assigned_text}', assigned || course.title)
        .replace('{tier}', tier)
        + `\n\n${proctorContext(course, unit, detail)}`;
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(`${API_BASE}/api/academy/seminar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id, agentId: 'socratic-proctor', sessionId: session.id, systemPrompt,
          userId: user?.id, sessionNumber: unit.unit_number,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? data.response ?? 'The seminar room is temporarily unavailable.';
      const reply: SeminarMessage = { role: 'assistant', content: text, timestamp: Date.now() };
      setMessages(prev => [...prev, reply]);
      await appendSeminarMessage(session.id, reply).catch(console.error);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The seminar room is temporarily unavailable.', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="px-5 py-4 border-b border-academy-border">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-academy-gold">Socratic Proctor</p>
        <p className="text-academy-muted text-xs mt-1">Bring the objection the seminar leaves standing.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && <p className="text-academy-muted italic text-sm">Read, then come and defend what you think the reading shows.</p>}
        {messages.map((m, i) => <ChatMessage key={i} message={m} agentName="Proctor" />)}
        {loading && <TypingIndicator agentName="Proctor" />}
        <div ref={end} />
      </div>
      <div className="border-t border-academy-border p-4">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={3}
          placeholder="Answer the Proctor"
          className="w-full bg-academy-card border border-academy-border rounded p-3 text-sm text-academy-text resize-none focus:outline-none focus:border-academy-gold/60"
        />
        <button onClick={send} disabled={loading || !input.trim() || !session} className="mt-2 w-full text-xs font-bold tracking-widest uppercase bg-academy-gold text-academy-bg rounded py-2 disabled:opacity-40">
          Send
        </button>
      </div>
    </>
  );
}

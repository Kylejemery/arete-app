'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getEnrollment, getOrCreateSession, appendSeminarMessage } from '@/lib/db';
import { AGENT_MAP, SYSTEM_PROMPTS } from '@/lib/agents';
import { AgentSelector } from '@/components/seminar/AgentSelector';
import { ChatMessage, TypingIndicator } from '@/components/seminar/ChatMessage';
import type { AgentId, Enrollment, SeminarSession, SeminarMessage, Tier } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// ── Course data ───────────────────────────────────────────────────────────────

interface SessionItem {
  id: number;
  title: string;
  locked: boolean;
}

const COURSE_SESSIONS: Record<string, SessionItem[]> = {
  'phil-701': [
    { id: 1,  title: 'What is Philosophy For? — Hadot as Entry',            locked: false },
    { id: 2,  title: 'The Good and the Preferred — Virtue and Indifferents', locked: true },
    { id: 3,  title: 'The Discipline of Desire — Wanting Rightly',           locked: true },
    { id: 4,  title: 'The Discipline of Action — Acting with Reservation',   locked: true },
    { id: 5,  title: 'The Discipline of Assent — The Inner Citadel',         locked: true },
    { id: 6,  title: 'Marcus Aurelius as Practitioner',                      locked: true },
    { id: 7,  title: 'Epictetus as Teacher',                                 locked: true },
    { id: 8,  title: 'Seneca as Writer',                                     locked: true },
    { id: 9,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 10, title: 'Final Seminar — Synthesis and Objections',             locked: true },
    { id: 11, title: 'Qualifying Conversation with the Examiner',            locked: true },
  ],
  'phil-702': [
    { id: 1,  title: 'The Man and His Book — Introduction',                  locked: false },
    { id: 2,  title: 'Books I–II — Debts and the Practice of Memory',       locked: true },
    { id: 3,  title: 'Books III–IV — The Commanding Faculty',               locked: true },
    { id: 4,  title: 'Books V–VI — On Anger and Impermanence',              locked: true },
    { id: 5,  title: 'Books VII–VIII — Providence and Fate',                locked: true },
    { id: 6,  title: 'Books IX–X — Other People and the Social Animal',     locked: true },
    { id: 7,  title: 'Books XI–XII — Death, Time, and the View from Above', locked: true },
    { id: 8,  title: 'The Text as Spiritual Exercise',                       locked: true },
    { id: 9,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 10, title: 'Final Seminar — Synthesis and Objections',             locked: true },
  ],
  'phil-703': [
    { id: 1,  title: 'The Former Slave and His School — Introduction',       locked: false },
    { id: 2,  title: 'The Three Disciplines — Desire, Action, Assent',      locked: true },
    { id: 3,  title: 'Book I — On Freedom',                                 locked: true },
    { id: 4,  title: 'Book II — On Steadfastness',                          locked: true },
    { id: 5,  title: 'Book III — On Social Duties',                         locked: true },
    { id: 6,  title: 'Book IV — On Progress',                               locked: true },
    { id: 7,  title: 'The Enchiridion as Distillation',                     locked: true },
    { id: 8,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 9,  title: 'Final Seminar — Synthesis and Objections',            locked: true },
  ],
  'phil-704': [
    { id: 1,  title: 'How to Live with Time — Introduction',                locked: false },
    { id: 2,  title: 'Letters I–XX — On Friendship, Time, and the Self',    locked: true },
    { id: 3,  title: 'Letters XXI–XL — On Retirement and the Examined Life',locked: true },
    { id: 4,  title: 'Letters XLI–LX — On God and Nature',                 locked: true },
    { id: 5,  title: 'Letters LXI–LXXX — On Death and Dying Well',         locked: true },
    { id: 6,  title: 'On the Shortness of Life — Close Reading',            locked: true },
    { id: 7,  title: 'Seneca\'s Life as Counter-Evidence',                  locked: true },
    { id: 8,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 9,  title: 'Final Seminar — Synthesis and Objections',            locked: true },
  ],
};

interface CourseContent {
  code: string;
  shortTitle: string;
  fullTitle: string;
  assignedText: string;
  session1: {
    quote: string;
    quoteSource: string;
    intro: string[];
    readings: string[];
    prompt: string;
  };
}

const COURSE_CONTENT: Record<string, CourseContent> = {
  'phil-701': {
    code: 'PHIL 701',
    shortTitle: 'Foundations of\nStoic Ethics',
    fullTitle: 'Introduction to Stoic Philosophy',
    assignedText: 'Epictetus — Enchiridion',
    session1: {
      quote: '“Ancient philosophy proposed to mankind an art of living. By contrast, modern philosophy appears above all as the construction of a technical discourse.”',
      quoteSource: '— Pierre Hadot, Philosophy as a Way of Life',
      intro: [
        'This is the first seminar of the doctoral program. Before you encounter any primary Stoic text — before Marcus, Epictetus, or Seneca — you will encounter a question: what is philosophy for? The question is not rhetorical. How you answer it will determine what kind of reader you become.',
        'Pierre Hadot argued that modern scholarship had fundamentally misread what the Greeks and Romans were doing. Philosophy, for the ancients, was a set of exercises aimed at transforming the self — what Hadot called spiritual exercises: attention, meditation, examination of conscience, the view from above, the preparation for death.',
        'PHIL 701 begins with Hadot because his framework is the interpretive lens for everything that follows. Stoic ethics is not a doctrine you learn in order to pass an examination; it is a set of disciplines you practice in order to become a certain kind of person.',
      ],
      readings: [
        'Hadot, Philosophy as a Way of Life, Ch. 11',
        'Hadot, The Inner Citadel, Ch. 1',
      ],
      prompt: 'Hadot argues that ancient philosophy was not a body of doctrine to be learned but a set of exercises to be practiced. If he is right, what becomes of philosophy as we have inherited it in the modern university? And what would it mean to enter this program as a practitioner rather than a reader?',
    },
  },
  'phil-702': {
    code: 'PHIL 702',
    shortTitle: 'The Meditations\nof Marcus Aurelius',
    fullTitle: 'The Meditations of Marcus Aurelius',
    assignedText: 'Marcus Aurelius — Meditations',
    session1: {
      quote: '“You have power over your mind — not outside events. Realize this, and you will find strength.”',
      quoteSource: '— Marcus Aurelius, Meditations IV.3',
      intro: [
        'The Meditations are not a treatise. They were never intended to be read. Marcus wrote to himself, in private, in a language that was not his native tongue, at the edge of the empire. They are a record of a man trying — and failing, and trying again — to live according to what he believed.',
        'This course reads the Meditations as a philosophical practice, not as a body of doctrine. The central question is not what Marcus believed but what he was doing when he wrote. Hadot’s answer: he was performing spiritual exercises. We will test that thesis book by book.',
        'You are not here to summarize. You are here to argue about what the text actually says, what it means, and whether the practice it embodies is coherent.',
      ],
      readings: [
        'Marcus Aurelius, Meditations, Books I–II (Gregory Hays translation)',
        'Hadot, The Inner Citadel, Introduction',
      ],
      prompt: 'Marcus writes to himself in the second person — “You have power over your mind.” Why? What does this grammatical choice tell us about the nature of the exercise he is performing? Is he persuading himself, commanding himself, or something else entirely?',
    },
  },
  'phil-703': {
    code: 'PHIL 703',
    shortTitle: 'Epictetus and the\nDiscipline of Desire',
    fullTitle: 'Epictetus and the Discipline of Desire',
    assignedText: 'Epictetus — Discourses',
    session1: {
      quote: '“Make the best use of what is in your power, and take the rest as it happens.”',
      quoteSource: '— Epictetus, Discourses I.1',
      intro: [
        'Epictetus was a slave. This is not incidental biographical detail — it is the origin of his philosophy. His entire system is built around a single distinction: what is up to us and what is not. For a man who could not control his own body, this distinction was not abstract.',
        'The Discourses were not written by Epictetus but recorded by his student Arrian. We are reading notes from a classroom. The voice is direct, sometimes harsh, often comic. Epictetus had no patience for students who wanted to discuss philosophy rather than practice it.',
        'This course reads the Discourses as a curriculum. Each book develops a specific aspect of the three disciplines. Your task is not to agree with Epictetus but to understand exactly what he is claiming — and then to examine whether the claim holds.',
      ],
      readings: [
        'Epictetus, Discourses, Book I (Robin Hard translation)',
        'Epictetus, Enchiridion (full)',
      ],
      prompt: 'Epictetus claims that freedom is available to everyone, including slaves. This is either one of the most profound insights in the history of philosophy or a dangerous rationalization of injustice. Which is it? Defend your answer.',
    },
  },
  'phil-704': {
    code: 'PHIL 704',
    shortTitle: "Seneca’s Letters and\nthe Art of Dying Well",
    fullTitle: "Seneca’s Letters and the Art of Dying Well",
    assignedText: 'Seneca — Letters to Lucilius',
    session1: {
      quote: '“Omnia, Lucili, aliena sunt, tempus tantum nostrum est.”\n“Everything, Lucilius, belongs to others; time alone is ours.”',
      quoteSource: '— Seneca, Epistulae I.1',
      intro: [
        'Seneca was a hypocrite. He wrote about poverty while living in extraordinary wealth. He wrote about the tranquility of retirement while serving at the court of Nero. He knew it. He said so. This course takes his hypocrisy seriously — not as an excuse to dismiss him, but as the central philosophical problem of his work.',
        'The Letters to Lucilius are the product of Seneca’s final years, written in the knowledge that Nero would eventually require his death. They are one of the great documents of a man trying to get his philosophy straight before it is too late.',
        'We read Seneca not to learn what to think about time, friendship, and death, but to watch a first-rate mind struggle with questions it cannot fully resolve. That is the nature of the exercise.',
      ],
      readings: [
        'Seneca, Letters to Lucilius, Letters I–X (Margaret Graver / A. A. Long translation)',
        'Seneca, On the Shortness of Life (full)',
      ],
      prompt: 'Seneca opens the Letters by telling Lucilius to “seize” time, to “gather and save” it. But he also says that the present moment is all we truly possess. Are these claims consistent? What is Seneca’s actual theory of time?',
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROMANS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function toRoman(n: number): string { return ROMANS[n - 1] ?? String(n); }

function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-academy-muted/40 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function LockedSessionContent({ sessionId, sessions }: { sessionId: number; sessions: SessionItem[] }) {
  const s = sessions.find(x => x.id === sessionId);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full border border-academy-border flex items-center justify-center mb-6">
        <svg className="w-6 h-6 text-academy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-serif text-2xl text-academy-text mb-2">{s?.title}</h2>
      <p className="text-academy-muted text-sm">
        This session unlocks upon completing Session {toRoman(sessionId - 1)}.
      </p>
    </div>
  );
}

function Session1Content({ content, sessions }: { content: CourseContent; sessions: SessionItem[] }) {
  const { session1 } = content;
  return (
    <article>
      <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">Session I</p>
      <h1 className="font-serif text-3xl text-academy-text mb-8 leading-tight">
        {sessions[0]?.title ?? 'Introduction'}
      </h1>

      <blockquote className="border-l-4 border-academy-gold pl-6 py-1 mb-10">
        <p className="font-serif text-academy-text text-lg leading-relaxed italic whitespace-pre-line">
          {session1.quote}
        </p>
        <footer className="mt-3 text-academy-muted text-sm not-italic">{session1.quoteSource}</footer>
      </blockquote>

      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-5">Seminar Introduction</h2>
        <div className="space-y-4 text-academy-muted text-sm leading-relaxed">
          {session1.intro.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </section>

      <div className="border-t border-academy-gold/20 my-8" />

      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-4">Required Reading</h2>
        <ul className="space-y-3">
          {session1.readings.map(r => (
            <li key={r} className="flex items-start gap-3 text-academy-muted text-sm">
              <span className="text-academy-gold font-semibold leading-none mt-0.5">&rsaquo;</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-academy-gold/20 my-8" />

      <section>
        <h2 className="font-serif text-xl text-academy-text mb-4">Discussion Prompt</h2>
        <div className="bg-academy-card border border-academy-gold/20 rounded-xl p-6">
          <p className="font-serif text-academy-text leading-relaxed italic">{session1.prompt}</p>
          <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mt-5">
            Bring your response to the Socratic Proctor &rarr;
          </p>
        </div>
      </section>
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SeminarPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [session, setSession] = useState<SeminarSession | null>(null);
  const [messages, setMessages] = useState<SeminarMessage[]>([]);
  const [agentId, setAgentId] = useState<AgentId>('socratic-proctor');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [paperExpanded, setPaperExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessions = COURSE_SESSIONS[courseId] ?? COURSE_SESSIONS['phil-701'];
  const courseContent = COURSE_CONTENT[courseId] ?? COURSE_CONTENT['phil-701'];
  const agent = AGENT_MAP[agentId];
  const tier = (enrollment?.tier ?? 'auditor') as Tier;

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const enroll = await getEnrollment();
      setEnrollment(enroll);
      const sess = await getOrCreateSession(courseId, agentId);
      if (sess) { setSession(sess); setMessages(sess.messages); }
      setInitializing(false);
    }
    init();
  }, [courseId, agentId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAgentChange = async (newAgentId: AgentId) => {
    setAgentId(newAgentId);
    setMessages([]);
    setSession(null);
    setInitializing(true);
    const sess = await getOrCreateSession(courseId, newAgentId);
    if (sess) { setSession(sess); setMessages(sess.messages); }
    setInitializing(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !session) return;
    const userMsg: SeminarMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    await appendSeminarMessage(session.id, userMsg).catch(console.error);
    try {
      const systemPrompt = SYSTEM_PROMPTS[agentId]
        .replace('{course_id}', courseId)
        .replace('{assigned_text}', courseContent.assignedText)
        .replace('{tier}', enrollment?.tier ?? 'auditor');
      const res = await fetch(`${API_BASE}/api/academy/seminar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, agentId, sessionId: session.id, systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const responseText = data.content?.[0]?.text ?? data.response ?? 'The seminar room is temporarily unavailable.';
      const assistantMsg: SeminarMessage = { role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
      await appendSeminarMessage(session.id, assistantMsg).catch(console.error);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The seminar room is temporarily unavailable. Please try again.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">Preparing the seminar room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-navy" style={{ height: '100vh' }}>

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses" className="text-academy-muted hover:text-academy-gold text-sm transition-colors">
            &larr; Courses
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-gold font-serif text-sm hidden sm:inline">Arete Academy</span>
        </div>
        <Link href="/dashboard/papers" className="text-xs border border-academy-border text-academy-muted px-3 py-1.5 rounded hover:border-academy-gold hover:text-academy-text transition-all">
          &#9998; Submit Paper
        </Link>
      </header>

      {/* ── THREE COLUMNS ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT: Course Navigation */}
        <aside className="lg:w-56 lg:flex-shrink-0 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-academy-border bg-academy-card">
          <div className="p-5">
            <div className="hidden lg:block mb-5">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                {courseContent.code} &middot; Seminar
              </p>
              <h2 className="font-serif text-academy-text text-base leading-snug whitespace-pre-line">
                {courseContent.shortTitle}
              </h2>
            </div>
            <p className="lg:hidden text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">
              {courseContent.code} &mdash; Sessions
            </p>
            <nav className="space-y-0.5">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => !s.locked && setActiveSessionId(s.id)}
                  disabled={s.locked}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2.5 transition-all ${
                    s.id === activeSessionId
                      ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                      : s.locked
                      ? 'text-academy-muted/40 cursor-not-allowed'
                      : 'text-academy-muted hover:text-academy-text hover:bg-navy/50'
                  }`}
                >
                  <span className="flex-shrink-0 w-5 mt-0.5">
                    {s.locked ? (
                      <LockIcon />
                    ) : (
                      <span className={`text-xs font-mono leading-none ${s.id === activeSessionId ? 'text-academy-gold' : 'text-academy-muted'}`}>
                        {toRoman(s.id)}
                      </span>
                    )}
                  </span>
                  <span className="leading-snug">{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* CENTER: Session Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            {activeSessionId === 1 ? (
              <Session1Content content={courseContent} sessions={sessions} />
            ) : (
              <LockedSessionContent sessionId={activeSessionId} sessions={sessions} />
            )}
          </div>
        </div>

        {/* RIGHT: Proctor Chat */}
        <div className="lg:w-80 lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-academy-border min-h-[560px] lg:min-h-0">

          {/* Proctor header */}
          <div className="flex-shrink-0 px-5 py-4 border-b border-academy-border bg-academy-card">
            <div className="flex items-center gap-2.5 mb-0.5">
              <span className="text-academy-gold font-serif text-base leading-none">&Phi;</span>
              <h3 className="font-serif text-academy-text text-base">
                {agentId === 'socratic-proctor' ? 'The Socratic Proctor' : (agent?.name ?? 'The Proctor')}
              </h3>
            </div>
            <p className="text-academy-muted text-xs italic mb-3">
              {agentId === 'socratic-proctor' ? 'I do not lecture. I question.' : (agent?.role ?? '')}
            </p>
            <AgentSelector selectedId={agentId} tier={tier} onChange={handleAgentChange} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                <p className="text-4xl mb-4">&#127981;</p>
                <p className="text-academy-muted text-xs leading-relaxed italic max-w-[220px]">
                  The Proctor awaits. Bring your response to the discussion prompt, and the examination will commence.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} agentName={agent?.name ?? 'Proctor'} />
            ))}
            {isLoading && <TypingIndicator agentName={agent?.name ?? 'Proctor'} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-academy-border p-4 flex gap-2.5">
            <textarea
              className="flex-1 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none"
              rows={2}
              placeholder="Respond to the Proctor..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !session}
              className="self-end bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Submit
            </button>
          </div>

          {/* Paper Requirements */}
          <div className="flex-shrink-0 border-t border-academy-border">
            <button
              onClick={() => setPaperExpanded(x => !x)}
              className="w-full px-5 py-3 flex items-center justify-between text-academy-muted hover:text-academy-text transition-colors"
            >
              <span className="text-xs uppercase tracking-widest font-semibold">Paper Requirements</span>
              <span className="text-xs">{paperExpanded ? '▲' : '▼'}</span>
            </button>
            {paperExpanded && (
              <div className="px-5 pb-5 space-y-2">
                <p className="text-academy-text text-sm font-semibold">Seminar Paper &mdash; 5,000&ndash;7,000 words</p>
                <p className="text-academy-gold text-xs font-semibold">Due: End of Session {toRoman(sessions.length - 2)}</p>
                <p className="text-academy-muted text-xs leading-relaxed">
                  Your paper must make an original argument engaging at least two primary sources and two secondary sources. The Writing Supervisor will evaluate your draft before final submission.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

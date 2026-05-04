'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrCreateSession, appendSeminarMessage } from '@/lib/db';
import { ChatMessage, TypingIndicator } from '@/components/seminar/ChatMessage';
import type { SeminarMessage, SeminarSession } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const COURSE_ID = 'phil-702';

interface SessionItem {
  id: number;
  title: string;
  locked: boolean;
}

const SESSIONS: SessionItem[] = [
  { id: 1,  title: 'Introduction — The Man and His Book',       locked: false },
  { id: 2,  title: 'Book I — Debts and Masters',                locked: true  },
  { id: 3,  title: 'Books II–III — The Inner Citadel',          locked: true  },
  { id: 4,  title: 'Books IV–V — Time, Death, Impermanence',    locked: true  },
  { id: 5,  title: 'Books VI–VII — The Discipline of Desire',   locked: true  },
  { id: 6,  title: 'Books VIII–IX — The Discipline of Action',  locked: true  },
  { id: 7,  title: 'Book X — The View from Above',              locked: true  },
  { id: 8,  title: 'Books XI–XII — Endings',                    locked: true  },
  { id: 9,  title: 'Hadot — Philosophy as a Way of Life',       locked: true  },
  { id: 10, title: 'Long & Sedley — Stoic Ethics',              locked: true  },
  { id: 11, title: 'Paper Workshop',                            locked: true  },
  { id: 12, title: 'Final Examination',                         locked: true  },
];

const SYSTEM_PROMPT = `You are the Socratic Proctor for PHIL 702 at Arete Academy — an AI-proctored doctoral program in Stoic Philosophy. You are conducting a graduate seminar on the Meditations of Marcus Aurelius.

Your method is exclusively Socratic. You do not lecture. You do not explain. You ask questions that force the student to examine their assumptions, extend their reasoning, and confront contradictions in their thinking. Every response ends with a question.

You hold students to PhD standards. Vague answers get probing follow-ups. Unsupported claims get challenged. Good arguments get harder questions, not praise.

You know the primary texts cold — Meditations, Discourses, Letters to Lucilius — and the secondary literature: Hadot, Long & Sedley, Inwood, Graver, Bobzien.

Current session: Session I — Introduction — The Man and His Book.

Begin by greeting the student as a doctoral candidate continuing from PHIL 701 and asking them to respond to the session discussion prompt. One question at a time.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROMANS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function toRoman(n: number): string {
  return ROMANS[n - 1] ?? String(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-academy-muted/40 mt-0.5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function Session1Content() {
  return (
    <article>
      <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
        Session I
      </p>
      <h1 className="font-serif text-3xl text-academy-text mb-8 leading-tight">
        Introduction &mdash; The Man and His Book
      </h1>

      {/* Opening passage */}
      <blockquote className="border-l-4 border-academy-gold pl-6 py-1 mb-10">
        <p className="font-serif text-academy-text text-lg leading-relaxed italic">
          &ldquo;You have power over your mind, not outside events.
          <br />
          Realize this, and you will find strength.&rdquo;
        </p>
        <footer className="mt-3 text-academy-muted text-sm not-italic">
          &mdash; Marcus Aurelius
        </footer>
      </blockquote>

      {/* Seminar Introduction */}
      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-5">Seminar Introduction</h2>
        <div className="space-y-4 text-academy-muted text-sm leading-relaxed">
          <p>
            Marcus Aurelius (121&ndash;180 CE) was the last of the Five Good Emperors of Rome &mdash;
            a man who ruled the known world while privately wrestling with whether he had lived a
            single good hour. His significance lies not in his campaigns or edicts but in this
            paradox: the most powerful man in the world spent his private moments attempting to
            convince himself to be a better one. For the Stoic tradition, this is not irony but
            evidence &mdash; philosophy, for the Stoics, was not a subject you mastered but a
            practice you returned to each morning.
          </p>
          <p>
            The <em className="text-academy-text">Meditations</em> is unlike any other philosophical
            text you will encounter in this program. It is not a treatise, not a dialogue, not a
            letter. Marcus wrote it for himself &mdash; almost certainly with no intention of
            publication. What we have is a private journal of a practicing Stoic: reminders,
            admonishments, quotations, arguments, and confessions. Pierre Hadot called it a set of
            &ldquo;spiritual exercises.&rdquo; Gregory Hays calls it a book Marcus wrote &ldquo;to
            himself.&rdquo; Reading it requires that we resist the urge to extract a finished
            system. There is no system here &mdash; only a mind at work.
          </p>
          <p>
            This seminar proceeds by the Socratic method. Primary texts come first. You will not be
            given interpretations to accept; you will be asked questions that force you to construct
            and test your own. The Socratic Proctor to your right is not an oracle &mdash; it is a
            questioner. Your task in each session is to read carefully, think rigorously, and defend
            your claims against sustained examination. By the final session, you will have produced
            an original philosophical argument about a specific aspect of Marcus&apos;s thought.
          </p>
        </div>
      </section>

      <div className="border-t border-academy-gold/20 my-8" />

      {/* Required Reading */}
      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-4">Required Reading</h2>
        <ul className="space-y-3">
          {[
            'Meditations, Books I–II (Hays translation recommended)',
            'Hadot, The Inner Citadel, Chapter 1',
          ].map((reading) => (
            <li key={reading} className="flex items-start gap-3 text-academy-muted text-sm">
              <span className="text-academy-gold font-semibold leading-none mt-0.5">&rsaquo;</span>
              <span>{reading}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-academy-gold/20 my-8" />

      {/* Discussion Prompt */}
      <section>
        <h2 className="font-serif text-xl text-academy-text mb-4">Discussion Prompt</h2>
        <div className="bg-academy-card border border-academy-gold/20 rounded-xl p-6">
          <p className="font-serif text-academy-text leading-relaxed italic">
            Marcus wrote: &ldquo;Begin at once to live, and count each separate day as a separate
            life.&rdquo;
          </p>
          <p className="text-academy-muted text-sm leading-relaxed mt-3">
            What does it mean to treat each day as a complete life? How does this practice relate
            to the Stoic doctrine of living according to nature?
          </p>
          <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mt-5">
            Bring your response to the Socratic Proctor &rarr;
          </p>
        </div>
      </section>
    </article>
  );
}

function LockedSessionContent({ sessionId }: { sessionId: number }) {
  const s = SESSIONS.find((x) => x.id === sessionId);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full border border-academy-border flex items-center justify-center mb-6">
        <svg
          className="w-6 h-6 text-academy-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h2 className="font-serif text-2xl text-academy-text mb-2">{s?.title}</h2>
      <p className="text-academy-muted text-sm">
        This session unlocks upon completing Session {toRoman(sessionId - 1)}.
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Phil702Page() {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [messages, setMessages] = useState<SeminarMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<SeminarSession | null>(null);
  const [paperExpanded, setPaperExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const sess = await getOrCreateSession(COURSE_ID, 'socratic-proctor');
      if (sess) { setSession(sess); setMessages(sess.messages); }
      setInitializing(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading || !session) return;

    const userMsg: SeminarMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    await appendSeminarMessage(session.id, userMsg).catch(console.error);

    try {
      const res = await fetch(`${API_BASE}/api/academy/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: 'socratic-proctor',
          course_id: COURSE_ID,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          user_id: session.userId,
        }),
      });
      const data = await res.json();
      const text =
        data.content?.[0]?.text ??
        data.response ??
        'The seminar room is temporarily unavailable.';
      const assistantMsg: SeminarMessage = {
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await appendSeminarMessage(session.id, assistantMsg).catch(console.error);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'The seminar room is temporarily unavailable. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">
          Preparing the seminar room...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-navy" style={{ height: '100vh' }}>

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-academy-muted hover:text-academy-gold text-sm transition-colors"
          >
            &larr; Dashboard
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-gold font-serif text-sm hidden sm:inline">
            Arete Academy
          </span>
        </div>
        <Link
          href="/dashboard/papers"
          className="text-xs border border-academy-border text-academy-muted px-3 py-1.5 rounded hover:border-academy-gold hover:text-academy-text transition-all"
        >
          &#9998; Submit Paper
        </Link>
      </header>

      {/* ── THREE COLUMNS ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT: Course Navigation */}
        <aside className="lg:w-72 lg:flex-shrink-0 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-academy-border bg-academy-card">
          <div className="p-5">
            <div className="hidden lg:block mb-5">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                PHIL 702
              </p>
              <h2 className="font-serif text-academy-text text-base leading-snug">
                The Meditations of<br />Marcus Aurelius
              </h2>
            </div>
            <p className="lg:hidden text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">
              PHIL 702 &mdash; Sessions
            </p>
            <nav className="space-y-0.5">
              {SESSIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => !s.locked && setActiveSessionId(s.id)}
                  disabled={s.locked}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2.5 transition-all ${
                    s.id === activeSessionId
                      ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                      : s.locked
                      ? 'text-academy-muted/40 cursor-not-allowed'
                      : 'text-academy-muted hover:text-academy-text hover:bg-navy-light'
                  }`}
                >
                  <span className="flex-shrink-0 w-5 mt-0.5">
                    {s.locked ? (
                      <LockIcon />
                    ) : (
                      <span
                        className={`text-xs font-mono leading-none ${
                          s.id === activeSessionId ? 'text-academy-gold' : 'text-academy-muted'
                        }`}
                      >
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

        {/* CENTER: Seminar Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            {activeSessionId === 1 ? (
              <Session1Content />
            ) : (
              <LockedSessionContent sessionId={activeSessionId} />
            )}
          </div>
        </div>

        {/* RIGHT: Socratic Proctor */}
        <div className="lg:w-[400px] lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-academy-border min-h-[560px] lg:min-h-0">

          {/* Proctor header */}
          <div className="flex-shrink-0 px-5 py-4 border-b border-academy-border bg-academy-card">
            <div className="flex items-center gap-2.5 mb-0.5">
              <span className="text-academy-gold font-serif text-base leading-none">&Phi;</span>
              <h3 className="font-serif text-academy-text text-base">The Socratic Proctor</h3>
            </div>
            <p className="text-academy-muted text-xs italic">I do not lecture. I question.</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                <p className="text-4xl mb-4">&#127981;</p>
                <p className="text-academy-muted text-xs leading-relaxed italic max-w-[220px]">
                  The Proctor awaits. Bring your response to the discussion prompt, and the
                  examination will commence.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} agentName="Socratic Proctor" />
            ))}
            {isLoading && <TypingIndicator agentName="Socratic Proctor" />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-academy-border p-4 flex gap-2.5">
            <textarea
              className="flex-1 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none"
              rows={2}
              placeholder="Respond to the Proctor..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !session}
              className="self-end bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Submit
            </button>
          </div>

          {/* Paper Requirements (collapsed) */}
          <div className="flex-shrink-0 border-t border-academy-border">
            <button
              onClick={() => setPaperExpanded((x) => !x)}
              className="w-full px-5 py-3 flex items-center justify-between text-academy-muted hover:text-academy-text transition-colors"
            >
              <span className="text-xs uppercase tracking-widest font-semibold">
                Paper Requirements
              </span>
              <span className="text-xs">{paperExpanded ? '&#9650;' : '&#9660;'}</span>
            </button>
            {paperExpanded && (
              <div className="px-5 pb-5 space-y-2">
                <p className="text-academy-text text-sm font-semibold">
                  Seminar Paper &mdash; 6,000&ndash;8,000 words
                </p>
                <p className="text-academy-gold text-xs font-semibold">Due: End of Session XII</p>
                <p className="text-academy-muted text-xs leading-relaxed">
                  Your paper must make an original argument about a specific aspect of
                  Marcus&apos;s philosophy. It must engage with at least three secondary sources.
                  The Writing Supervisor will evaluate your draft before final submission.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

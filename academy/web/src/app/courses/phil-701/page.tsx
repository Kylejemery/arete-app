'use client';

import { ChatMessage, TypingIndicator } from '@/components/seminar/ChatMessage';
import { appendSeminarMessage, getOrCreateSession } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { SeminarMessage, SeminarSession } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const COURSE_ID = 'phil-701';

interface SessionItem {
  id: number;
  title: string;
  locked: boolean;
}

const SESSIONS: SessionItem[] = [
  { id: 1,  title: 'What is Philosophy For? — Hadot as Entry',          locked: false },
  { id: 2,  title: 'The Good and the Preferred — Virtue and Indifferents', locked: true },
  { id: 3,  title: 'The Discipline of Desire — Wanting Rightly',        locked: true  },
  { id: 4,  title: 'The Discipline of Action — Acting with Reservation', locked: true  },
  { id: 5,  title: 'The Discipline of Assent — The Inner Citadel',      locked: true  },
  { id: 6,  title: 'Marcus Aurelius as Practitioner',                   locked: true  },
  { id: 7,  title: 'Epictetus as Teacher',                              locked: true  },
  { id: 8,  title: 'Seneca as Writer',                                  locked: true  },
  { id: 9,  title: 'Paper Workshop with the Writing Supervisor',        locked: true  },
  { id: 10, title: 'Final Seminar — Synthesis and Objections',          locked: true  },
  { id: 11, title: 'Qualifying Conversation with the Examiner',         locked: true  },
];

const SYSTEM_PROMPT = `You are the Socratic Proctor for PHIL 701 at Arete Academy — the gateway course of the doctoral program in Stoic Philosophy. PHIL 701 is the foundational seminar every student takes first. Its subject is Stoic ethics as a system: the doctrine of virtue and indifferents, the three disciplines (desire, action, assent), and Hadot's framing of ancient philosophy as a way of life. Marcus, Epictetus, and Seneca appear in this course as illustrations of the doctrine, not the subject.

Your method is exclusively Socratic. You do not lecture. You do not explain. You ask questions that force the student to examine their assumptions and confront contradictions. Every response ends with a question.

You hold students to PhD standards. Current session: Session I — What is Philosophy For? Hadot's spiritual exercises as entry point.`;

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
        What is Philosophy For? &mdash; Hadot as Entry
      </h1>

      {/* Opening passage */}
      <blockquote className="border-l-4 border-academy-gold pl-6 py-1 mb-10">
        <p className="font-serif text-academy-text text-lg leading-relaxed italic">
          &ldquo;Ancient philosophy proposed to mankind an art of living.
          <br />
          By contrast, modern philosophy appears above all as the construction of a technical
          discourse.&rdquo;
        </p>
        <footer className="mt-3 text-academy-muted text-sm not-italic">
          &mdash; Pierre Hadot, <em>Philosophy as a Way of Life</em>
        </footer>
      </blockquote>

      {/* Seminar Introduction */}
      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-5">Seminar Introduction</h2>
        <div className="space-y-4 text-academy-muted text-sm leading-relaxed">
          <p>
            This is the first seminar of the doctoral program. Before you encounter any primary
            Stoic text &mdash; before Marcus, Epictetus, or Seneca &mdash; you will encounter a
            question: what is philosophy for? The question is not rhetorical. How you answer it
            will determine what kind of reader you become, and what kind of thinker this program
            is designed to produce.
          </p>
          <p>
            Pierre Hadot (1922&ndash;2010) was a historian of ancient philosophy who spent his
            career arguing that modern scholarship had fundamentally misread what the Greeks and
            Romans were doing. When Socrates asked how one ought to live, or when the Stoics
            developed their three disciplines, they were not primarily building theoretical systems
            &mdash; they were prescribing practices. Philosophy, for the ancients, was a set of
            exercises aimed at transforming the self. Hadot called these <em className="text-academy-text">
            spiritual exercises</em>: attention, meditation, examination of conscience, the view
            from above, the preparation for death.
          </p>
          <p>
            PHIL 701 begins with Hadot because his framework is the interpretive lens for
            everything that follows. Stoic ethics is not a doctrine you learn in order to pass an
            examination; it is a set of disciplines you practice in order to become a certain kind
            of person. By the end of this seminar, you will have a precise technical vocabulary for
            Stoic ethics and a working understanding of Hadot&apos;s thesis. More importantly, you
            will have begun to ask whether that thesis changes how you approach your own reading.
          </p>
        </div>
      </section>

      <div className="border-t border-academy-gold/20 my-8" />

      {/* Required Reading */}
      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-4">Required Reading</h2>
        <ul className="space-y-3">
          {[
            'Hadot, Philosophy as a Way of Life, Ch. 11',
            'Hadot, The Inner Citadel, Ch. 1',
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
            Hadot argues that ancient philosophy was not a body of doctrine to be learned but a
            set of exercises to be practiced. If he is right, what becomes of philosophy as we
            have inherited it in the modern university? And what would it mean to enter this
            program as a practitioner rather than a reader?
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

export default function Phil701Page() {
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
                PHIL 701 &middot; Gateway Seminar
              </p>
              <h2 className="font-serif text-academy-text text-base leading-snug">
                Foundations of<br />Stoic Ethics
              </h2>
            </div>
            <p className="lg:hidden text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">
              PHIL 701 &mdash; Sessions
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
                  Seminar Paper &mdash; 5,000&ndash;7,000 words
                </p>
                <p className="text-academy-gold text-xs font-semibold">Due: End of Session X</p>
                <p className="text-academy-muted text-xs leading-relaxed">
                  Your paper must make an original argument about an aspect of Stoic ethics as a
                  system. It must engage with at least two primary sources and two secondary
                  sources. The Writing Supervisor will evaluate your draft before final submission.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

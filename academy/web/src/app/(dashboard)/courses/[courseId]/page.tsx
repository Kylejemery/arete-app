'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getEnrollment, getOrCreateSession, appendSeminarMessage } from '@/lib/db';
import { AGENT_MAP, getAgentsForTier, SYSTEM_PROMPTS } from '@/lib/agents';
import { AgentSelector } from '@/components/seminar/AgentSelector';
import { ChatMessage, TypingIndicator } from '@/components/seminar/ChatMessage';
import type { AgentId, Enrollment, SeminarSession, SeminarMessage, Tier } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const COURSE_INFO: Record<string, { title: string; assignedText: string; excerpt: string }> = {
  'phil-701': {
    title: 'Introduction to Stoic Philosophy',
    assignedText: 'Epictetus — Enchiridion',
    excerpt: '"Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life." — Epictetus, Enchiridion §8',
  },
  'phil-702': {
    title: 'The Meditations of Marcus Aurelius',
    assignedText: 'Marcus Aurelius — Meditations',
    excerpt: '"You have power over your mind — not outside events. Realize this, and you will find strength." — Marcus Aurelius, Meditations IV.3',
  },
  'phil-703': {
    title: 'Epictetus and the Discipline of Desire',
    assignedText: 'Epictetus — Discourses',
    excerpt: '"Make the best use of what is in your power, and take the rest as it happens." — Epictetus, Discourses I.1',
  },
  'phil-704': {
    title: "Seneca's Letters and the Art of Dying Well",
    assignedText: 'Seneca — Letters to Lucilius',
    excerpt: '"Omnia, Lucili, aliena sunt, tempus tantum nostrum est." — Seneca, Epistulae I.1',
  },
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const enroll = await getEnrollment();
      setEnrollment(enroll);

      const sess = await getOrCreateSession(courseId, agentId);
      if (sess) {
        setSession(sess);
        setMessages(sess.messages);
      }
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
      const courseInfo = COURSE_INFO[courseId] ?? { assignedText: courseId, excerpt: '' };
      const systemPrompt = SYSTEM_PROMPTS[agentId]
        .replace('{course_id}', courseId)
        .replace('{assigned_text}', courseInfo.assignedText)
        .replace('{tier}', enrollment?.tier ?? 'auditor');

      const res = await fetch(`${API_BASE}/api/academy/seminar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          agentId,
          sessionId: session.id,
          systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const responseText = data.content?.[0]?.text ?? data.response ?? 'The seminar room is temporarily unavailable.';
      const assistantMsg: SeminarMessage = { role: 'assistant', content: responseText, timestamp: Date.now() };

      setMessages(prev => [...prev, assistantMsg]);
      await appendSeminarMessage(session.id, assistantMsg).catch(console.error);
    } catch {
      const errMsg: SeminarMessage = {
        role: 'assistant',
        content: 'The seminar room is temporarily unavailable. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const courseInfo = COURSE_INFO[courseId] ?? { title: courseId, assignedText: courseId, excerpt: '' };
  const agent = AGENT_MAP[agentId];
  const tier = (enrollment?.tier ?? 'auditor') as Tier;

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Preparing the seminar room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <Link href="/dashboard/courses" className="text-academy-muted hover:text-academy-text text-sm mb-3 inline-block transition-colors">
          ← Course Catalog
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl text-academy-text">{courseInfo.title}</h1>
            <p className="text-academy-muted text-sm mt-0.5">{courseInfo.assignedText}</p>
          </div>
          <Link
            href="/dashboard/papers"
            className="border border-academy-border text-academy-muted text-sm px-4 py-2 rounded-lg hover:border-academy-gold hover:text-academy-text transition-all whitespace-nowrap"
          >
            ✒️ Submit Paper
          </Link>
        </div>

        {/* Agent Selector */}
        <div className="mt-4">
          <p className="text-academy-muted text-xs uppercase tracking-wider mb-2">Proctor</p>
          <AgentSelector selectedId={agentId} tier={tier} onChange={handleAgentChange} />
        </div>
      </div>

      {/* Main: chat + reading panel */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Chat */}
        <div className="flex flex-col flex-1 min-h-0 bg-academy-surface border border-academy-border rounded-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-5xl mb-4">{agent?.emoji ?? '🏛️'}</p>
                <p className="font-serif text-xl text-academy-text mb-2">{agent?.name}</p>
                <p className="text-academy-muted text-sm italic max-w-sm mx-auto">
                  The seminar has begun. Speak your first claim about the assigned text, and the examination will commence.
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
          <div className="flex-shrink-0 border-t border-academy-border p-4 flex gap-3">
            <textarea
              className="flex-1 bg-academy-bg border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none"
              rows={2}
              placeholder="Make a claim about the text..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-academy-gold text-academy-bg font-semibold rounded-lg px-5 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed self-end text-sm"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Reading context panel — desktop only */}
        <div className="hidden lg:flex flex-col w-72 flex-shrink-0">
          <div className="bg-academy-card border border-academy-border rounded-xl p-5 mb-4">
            <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">Assigned Text</p>
            <p className="text-academy-text text-sm font-semibold mb-1">{courseInfo.assignedText}</p>
            {courseInfo.excerpt && (
              <p className="text-academy-muted text-xs leading-relaxed italic mt-3 border-l-2 border-academy-gold/40 pl-3">
                {courseInfo.excerpt}
              </p>
            )}
          </div>
          <div className="bg-academy-card border border-academy-border rounded-xl p-5">
            <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">Your Proctor</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{agent?.emoji}</span>
              <div>
                <p className="text-academy-text text-sm font-semibold">{agent?.name}</p>
                <p className="text-academy-muted text-xs">{agent?.role}</p>
              </div>
            </div>
            <p className="text-academy-muted text-xs leading-relaxed">{agent?.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

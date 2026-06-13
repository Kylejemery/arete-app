'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSettings, getUserCabinet } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendMessageToCabinet, sendMessageToCounselor, type CabinetReply } from '@/lib/claudeService';
import { loadThread, saveThread, clearThread } from '@/lib/threadService';
import type { ThreadMessage } from '@/lib/threadService';
import { COUNSELOR_LIST } from '@/lib/counselors';
import GlassCard from '@/components/GlassCard';

type Tab = 'cabinet' | 'counselors';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function parseBlocks(text: string): { type: 'quote' | 'para'; content: string }[] {
  return text
    .split(/\n\n+/)
    .map(block => {
      const t = block.trim();
      if ((t.startsWith('"') && t.endsWith('"')) || t.startsWith('> ')) {
        return { type: 'quote' as const, content: t.replace(/^> /, '').replace(/^"|"$/g, '') };
      }
      return { type: 'para' as const, content: t };
    })
    .filter(b => b.content.length > 0);
}

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cabinet');
  const [cabinetMessages, setCabinetMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);

  const [selectedCounselor, setSelectedCounselor] = useState<string | null>(null);
  const [counselorMessages, setCounselorMessages] = useState<ThreadMessage[]>([]);
  const [counselorInput, setCounselorInput] = useState('');
  const [counselorLoading, setCounselorLoading] = useState(false);
  const [activeMembers, setActiveMembers] = useState<string[]>([]);
  const [cabinetCounselors, setCabinetCounselors] = useState<{ id: string; name: string; role: string; description: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const counselorEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setInput(q);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);

      const thread = await loadThread('cabinet');
      setCabinetMessages(thread.messages);

      if (Array.isArray(settings.cabinet_members) && settings.cabinet_members.length > 0) {
        setActiveMembers(settings.cabinet_members);
      } else {
        setActiveMembers(COUNSELOR_LIST.map(c => c.id));
      }

      const fetched = await getUserCabinet();
      if (fetched.length > 0) {
        setCabinetCounselors(fetched.map(c => ({
          id: c.slug, name: c.name, role: c.category ?? 'Counselor', description: c.description ?? '',
        })));
      } else {
        setCabinetCounselors(COUNSELOR_LIST.map(c => ({ id: c.id, name: c.name, role: c.role, description: c.description })));
      }
    }
    load();
  }, [router]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [cabinetMessages]);
  useEffect(() => { counselorEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [counselorMessages]);

  const handleSendCabinet = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ThreadMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...cabinetMessages, userMsg];
    setCabinetMessages(newMessages);
    setInput('');
    setIsLoading(true);
    try {
      const replies: CabinetReply[] = await sendMessageToCabinet(newMessages);
      const assistantMsgs: ThreadMessage[] = replies.map(r => ({
        role: 'assistant',
        content: r.text,
        timestamp: Date.now(),
        counselorId: r.counselorId ?? undefined,
        counselorName: r.counselorName ?? undefined,
      }));
      const finalMessages = [...newMessages, ...assistantMsgs];
      setCabinetMessages(finalMessages);
      await saveThread({ id: 'cabinet', messages: finalMessages, lastUpdated: Date.now() });
    } catch {
      setCabinetMessages(prev => [...prev, { role: 'assistant', content: 'The Cabinet is temporarily unavailable. Please try again.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCabinet = async () => {
    if (!confirm('Clear the entire Cabinet conversation? This cannot be undone.')) return;
    await clearThread('cabinet');
    setCabinetMessages([]);
  };

  const handleSelectCounselor = async (id: string) => {
    setSelectedCounselor(id);
    const thread = await loadThread(id);
    setCounselorMessages(thread.messages);
  };

  const handleSendCounselor = async () => {
    if (!counselorInput.trim() || counselorLoading || !selectedCounselor) return;
    const userMsg: ThreadMessage = { role: 'user', content: counselorInput.trim(), timestamp: Date.now() };
    const newMessages = [...counselorMessages, userMsg];
    setCounselorMessages(newMessages);
    setCounselorInput('');
    setCounselorLoading(true);
    try {
      const response = await sendMessageToCounselor(selectedCounselor, newMessages);
      const assistantMsg: ThreadMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      const finalMessages = [...newMessages, assistantMsg];
      setCounselorMessages(finalMessages);
      await saveThread({ id: selectedCounselor, messages: finalMessages, lastUpdated: Date.now() });
    } catch {
      setCounselorMessages(prev => [...prev, { role: 'assistant', content: 'Your counselor is temporarily unavailable. Please try again.', timestamp: Date.now() }]);
    } finally {
      setCounselorLoading(false);
    }
  };

  const filteredMessages = searchQuery
    ? cabinetMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : cabinetMessages;

  const activeCounselors = cabinetCounselors.length > 0
    ? cabinetCounselors
    : COUNSELOR_LIST.filter(c => activeMembers.includes(c.id));
  const selectedCounselorMeta = activeCounselors.find(c => c.id === selectedCounselor);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0f1724' }}>

      {/* ── Glass header ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-5 pt-5 pb-4"
        style={{
          background: 'rgba(10,14,28,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          The Council Convenes
        </div>
        <h1
          className="text-[28px] font-medium leading-none tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Speak to the <em style={{ color: '#c9a84c' }}>Cabinet</em>
        </h1>

        {/* Overlapping counselor circles + Edit button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
          {activeCounselors.slice(0, 5).map((c, i) => (
            <div
              key={c.id}
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 32, height: 32,
                background: 'rgba(201,168,76,0.15)',
                border: '2px solid rgba(10,14,28,0.8)',
                marginLeft: i === 0 ? 0 : -8,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 9, fontWeight: 700,
                color: '#c9a84c',
                zIndex: activeCounselors.length - i,
                position: 'relative',
              }}
            >
              {getInitials(c.name)}
            </div>
          ))}
          {activeCounselors.length > 5 && (
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0 text-[9px]"
              style={{
                width: 32, height: 32,
                background: 'rgba(201,168,76,0.08)',
                border: '2px solid rgba(10,14,28,0.8)',
                marginLeft: -8,
                color: '#9aa0a6',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              +{activeCounselors.length - 5}
            </div>
          )}
          <span
            className="text-[11px] ml-3"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            {activeCounselors.length} counselor{activeCounselors.length !== 1 ? 's' : ''} assembled
          </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/cabinet/minds"
              className="px-3 py-1 rounded-full text-[10px] tracking-[1.2px] uppercase transition-opacity hover:opacity-80"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.06)',
              }}
            >
              Assign Minds
            </Link>
            <Link
              href="/cabinet/select"
              className="px-3 py-1 rounded-full text-[10px] tracking-[1.2px] uppercase transition-opacity hover:opacity-80"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.06)',
              }}
            >
              Edit Cabinet
            </Link>
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['cabinet', 'counselors'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase capitalize transition-all"
              style={
                tab === t
                  ? { background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }
                  : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Know Thyself nudge */}
      {knowThyselfIncomplete && (
        <div className="mx-4 mt-3 flex-shrink-0">
          <GlassCard>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-[13px]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}>
                The Cabinet&apos;s responses are generic until you complete your profile.
              </p>
              <a
                href="/profile"
                className="text-[10px] tracking-[1px] uppercase ml-3 flex-shrink-0 hover:opacity-80"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                Complete →
              </a>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Cabinet tab ──────────────────────────────────────────── */}
      {tab === 'cabinet' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search + Clear */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-shrink-0">
            {showSearch ? (
              <input
                className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#e6eef8',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                }}
                placeholder="Search messages…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            ) : (
              <div className="flex-1" />
            )}
            <button
              onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}
              className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {showSearch ? '✕' : 'Search'}
            </button>
            <button
              onClick={handleClearCabinet}
              className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 rounded-lg transition-colors hover:text-red-400"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3.5">
            {filteredMessages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                <div className="text-[40px] mb-3 opacity-15">🏛️</div>
                <p
                  className="text-[15px] italic"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                >
                  Your Cabinet awaits.
                </p>
                <p
                  className="text-[11px] tracking-[1px] uppercase mt-1"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.5)' }}
                >
                  Ask them anything.
                </p>
              </div>
            )}

            {filteredMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div
                    className="max-w-[82%] px-4 py-3 text-[15px] leading-relaxed"
                    style={{
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '18px 18px 6px 18px',
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      color: '#e6eef8',
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] flex gap-3 items-start">
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                      style={{
                        width: 32, height: 32,
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 9, fontWeight: 700,
                        color: '#c9a84c',
                      }}
                    >
                      {msg.counselorName ? getInitials(msg.counselorName) : 'TC'}
                    </div>
                    <div
                      className="flex flex-col gap-2 px-4 py-3 flex-1"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '18px 18px 18px 6px',
                      }}
                    >
                      <div
                        className="text-[10px] tracking-[1.2px] uppercase"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                      >
                        {msg.counselorName || 'The Cabinet'}
                      </div>
                      {parseBlocks(msg.content).map((block, bi) =>
                        block.type === 'quote' ? (
                          <div
                            key={bi}
                            className="pl-3 py-1 italic text-[14px] leading-relaxed"
                            style={{
                              borderLeft: '3px solid rgba(201,168,76,0.5)',
                              fontFamily: 'var(--font-serif, Georgia, serif)',
                              color: '#c9a84c',
                            }}
                          >
                            &ldquo;{block.content}&rdquo;
                          </div>
                        ) : (
                          <p
                            key={bi}
                            className="text-[14px] leading-relaxed"
                            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                          >
                            {block.content}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 items-start">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                    style={{
                      width: 32, height: 32,
                      background: 'rgba(201,168,76,0.15)',
                      border: '1px solid rgba(201,168,76,0.3)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 9, fontWeight: 700,
                      color: '#c9a84c',
                    }}
                  >
                    TC
                  </div>
                  <div
                    className="px-4 py-3 italic text-[14px]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '18px 18px 18px 6px',
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      color: '#9aa0a6',
                    }}
                  >
                    The Cabinet deliberates…
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div
            className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(10,14,28,0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <textarea
              className="flex-1 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 22,
                color: '#e6eef8',
                fontFamily: 'var(--font-serif, Georgia, serif)',
              }}
              rows={2}
              placeholder="Speak to your Cabinet…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCabinet(); }
              }}
            />
            <button
              onClick={handleSendCabinet}
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* ── Counselors tab ───────────────────────────────────────── */}
      {tab === 'counselors' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {!selectedCounselor ? (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p
                className="text-[11px] tracking-[1px] uppercase mb-4"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
              >
                Choose a counselor for a private session
              </p>
              <div className="flex flex-col gap-2.5">
                {activeCounselors.map(counselor => (
                  <button
                    key={counselor.id}
                    onClick={() => handleSelectCounselor(counselor.id)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl transition-opacity hover:opacity-80"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 40, height: 40,
                        background: 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 10, fontWeight: 700,
                        color: '#c9a84c',
                      }}
                    >
                      {getInitials(counselor.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[15px] font-medium"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {counselor.name}
                      </div>
                      <div
                        className="text-[10px] tracking-[1px] uppercase mt-0.5"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {counselor.role}
                      </div>
                    </div>
                    <span style={{ color: '#c9a84c', fontSize: 16 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Counselor header */}
              <div
                className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(10,14,28,0.4)',
                }}
              >
                <button
                  onClick={() => setSelectedCounselor(null)}
                  className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                >
                  ← Back
                </button>
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 36, height: 36,
                    background: 'rgba(201,168,76,0.12)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 10, fontWeight: 700,
                    color: '#c9a84c',
                  }}
                >
                  {selectedCounselorMeta ? getInitials(selectedCounselorMeta.name) : '?'}
                </div>
                <div className="flex-1">
                  <div
                    className="text-[15px] font-medium"
                    style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                  >
                    {selectedCounselorMeta?.name}
                  </div>
                  <div
                    className="text-[10px] tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    {selectedCounselorMeta?.role}
                  </div>
                </div>
                <button
                  onClick={() => { clearThread(selectedCounselor).then(() => setCounselorMessages([])); }}
                  className="text-[10px] tracking-[1px] uppercase transition-colors hover:text-red-400"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                >
                  Clear
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3.5">
                {counselorMessages.length === 0 && !counselorLoading && (
                  <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                    <div className="text-[40px] mb-3 opacity-15">🧠</div>
                    <p
                      className="text-[15px] italic"
                      style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                    >
                      {selectedCounselorMeta?.name} is listening.
                    </p>
                  </div>
                )}

                {counselorMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div
                        className="max-w-[82%] px-4 py-3 text-[15px] leading-relaxed"
                        style={{
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          borderRadius: '18px 18px 6px 18px',
                          fontFamily: 'var(--font-serif, Georgia, serif)',
                          color: '#e6eef8',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%] flex gap-3 items-start">
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                          style={{
                            width: 32, height: 32,
                            background: 'rgba(201,168,76,0.15)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 9, fontWeight: 700,
                            color: '#c9a84c',
                          }}
                        >
                          {selectedCounselorMeta ? getInitials(selectedCounselorMeta.name) : 'C'}
                        </div>
                        <div
                          className="flex flex-col gap-2 px-4 py-3 flex-1"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '18px 18px 18px 6px',
                          }}
                        >
                          {parseBlocks(msg.content).map((block, bi) =>
                            block.type === 'quote' ? (
                              <div
                                key={bi}
                                className="pl-3 py-1 italic text-[14px] leading-relaxed"
                                style={{
                                  borderLeft: '3px solid rgba(201,168,76,0.5)',
                                  fontFamily: 'var(--font-serif, Georgia, serif)',
                                  color: '#c9a84c',
                                }}
                              >
                                &ldquo;{block.content}&rdquo;
                              </div>
                            ) : (
                              <p
                                key={bi}
                                className="text-[14px] leading-relaxed"
                                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                              >
                                {block.content}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {counselorLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 items-start">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                        style={{
                          width: 32, height: 32,
                          background: 'rgba(201,168,76,0.15)',
                          border: '1px solid rgba(201,168,76,0.3)',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 9, fontWeight: 700,
                          color: '#c9a84c',
                        }}
                      >
                        {selectedCounselorMeta ? getInitials(selectedCounselorMeta.name) : 'C'}
                      </div>
                      <div
                        className="px-4 py-3 italic text-[14px]"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '18px 18px 18px 6px',
                          fontFamily: 'var(--font-serif, Georgia, serif)',
                          color: '#9aa0a6',
                        }}
                      >
                        {selectedCounselorMeta?.name} is thinking…
                      </div>
                    </div>
                  </div>
                )}
                <div ref={counselorEndRef} />
              </div>

              {/* Composer */}
              <div
                className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(10,14,28,0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <textarea
                  className="flex-1 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 22,
                    color: '#e6eef8',
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                  }}
                  rows={2}
                  placeholder={`Speak to ${selectedCounselorMeta?.name}…`}
                  value={counselorInput}
                  onChange={e => setCounselorInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCounselor(); }
                  }}
                />
                <button
                  onClick={handleSendCounselor}
                  disabled={counselorLoading || !counselorInput.trim()}
                  className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

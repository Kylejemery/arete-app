'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserCabinet, createConversation, appendMessage } from '@/lib/db';
import { sendMessageToCabinet } from '@/lib/claudeService';
import type { ThreadMessage } from '@/lib/threadService';

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

export default function ConversationPage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      try {
        const cabinet = await getUserCabinet();
        const slugs = cabinet.map(c => c.slug);
        const conversation = await createConversation(slugs);
        setConversationId(conversation.id);
      } catch (e) {
        console.error('Failed to initialize conversation:', e);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !conversationId) return;

    const userMsg: ThreadMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    await appendMessage(conversationId, {
      role: 'user',
      content: userMsg.content,
      timestamp: new Date().toISOString(),
    }).catch(e => console.error('appendMessage (user) error:', e));

    try {
      const replies = await sendMessageToCabinet(newMessages);
      // This structured-conversation view stores one assistant message per
      // turn, so collapse multiple counselor replies into a single labeled
      // block (matching the prior rendering here).
      const response = replies
        .map(r => (r.counselorName ? `**${r.counselorName}**\n${r.text}` : r.text))
        .join('\n\n---\n\n');
      const assistantMsg: ThreadMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      await appendMessage(conversationId, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }).catch(e => console.error('appendMessage (assistant) error:', e));
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The Cabinet is temporarily unavailable. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0f1724' }}>
        <span
          className="text-[11px] tracking-[2px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          Assembling your Cabinet…
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#0f1724' }}>

      {/* ── Glass header ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-5 pt-4 pb-4"
        style={{
          background: 'rgba(10,14,28,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <a
          href="/cabinet"
          className="text-[10px] tracking-[1.2px] uppercase mb-2 inline-block transition-opacity hover:opacity-70"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          ← Cabinet
        </a>
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          New Session
        </div>
        <h1
          className="text-[24px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Cabinet <em style={{ color: '#c9a84c' }}>Conversation</em>
        </h1>
      </div>

      {/* ── Messages ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3.5">
        {messages.length === 0 && !isLoading && (
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

        {messages.map((msg, i) => (
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
                  TC
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

      {/* ── Composer ─────────────────────────────────────────────── */}
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
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim() || !conversationId}
          className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
        >
          →
        </button>
      </div>
    </div>
  );
}

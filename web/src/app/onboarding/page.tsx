'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveOnboardingProfile, type OnboardingProfile } from '@/lib/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedProfile extends OnboardingProfile {
  good_day?: string;
  daily_practice?: string;
  reading?: string;
  physical_practice?: string;
  dependents?: string;
  completeness_score?: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [futureYears, setFutureYears] = useState<number | undefined>();
  const [complete, setComplete] = useState(false);
  const [profile, setProfile] = useState<ExtractedProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, complete]);

  // Kick off with initial greeting from Future Self
  useEffect(() => {
    sendToApi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToApi(msgs: Message[]) {
    setLoading(true);
    setError('');
    try {
      // Claude requires at least one message; inject a silent opener on the
      // very first call so Future Self generates the initial greeting.
      const apiMessages = msgs.length === 0
        ? [{ role: 'user', content: 'Hello.' }]
        : msgs.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          futureYears,
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      if (data.complete) {
        setProfile(data.profile as ExtractedProfile);
        if (data.futureYears) setFutureYears(data.futureYears);
        setComplete(true);
      } else {
        const assistantMsg: Message = { role: 'assistant', content: data.message ?? '' };
        setMessages(prev => [...prev, assistantMsg]);

        // Detect future years from early messages if not yet set
        if (!futureYears && data.message) {
          const match = (data.message as string).match(/\b(\d+)\s+year/i);
          if (match) setFutureYears(parseInt(match[1], 10));
        }
      }
    } catch (err) {
      console.error('[onboarding] API error:', err);
      setError('Connection issue — please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || complete) return;
    setInput('');

    const newMsg: Message = { role: 'user', content: text };
    const updated = [...messages, newMsg];
    setMessages(updated);
    await sendToApi(updated);
  }

  async function handleSave() {
    if (!profile || saving || saved) return;
    setSaving(true);
    try {
      await saveOnboardingProfile(profile);
      setSaved(true);
      setTimeout(() => router.replace('/'), 2000);
    } catch (err) {
      console.error('[onboarding] save error:', err);
      setSaving(false);
      setError('Failed to save. Please try again.');
    }
  }

  // Progress: 12 areas; based on assistant turns so far
  const assistantCount = messages.filter(m => m.role === 'assistant').length;
  const progress = complete ? 100 : Math.min(Math.round((assistantCount / 12) * 100), 95);
  const remaining = Math.max(12 - assistantCount, 0);

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: '#0f1724', maxWidth: 480, margin: '0 auto' }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 pt-5 pb-3"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}
      >
        <div className="flex items-center gap-3">
          {/* Future Self avatar */}
          <div
            className="rounded-full flex-shrink-0 flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.4)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11,
              fontWeight: 700,
              color: '#c9a84c',
              letterSpacing: '1px',
            }}
          >
            FS
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="text-[9.5px] tracking-[1.6px] uppercase"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              {futureYears ? `${futureYears} Years From Now` : 'Future Self'}
            </div>
            <div
              className="text-[16px] leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              Know Thyself
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs"
            style={{ color: '#9aa0a6', background: 'rgba(255,255,255,0.05)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #8a6f27, #e3c77a)',
            }}
          />
        </div>
        <div
          className="mt-1 text-[9px] tracking-[1px]"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          {complete
            ? 'Profile complete'
            : remaining > 0
            ? `${progress}% · ${remaining} area${remaining !== 1 ? 's' : ''} remaining`
            : `${progress}% · almost done`}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) =>
          msg.role === 'assistant' ? (
            /* Assistant bubble */
            <div key={i} className="flex items-start gap-2">
              <div
                className="rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#c9a84c',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}
              >
                FS
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[84%]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <p
                  className="text-[15px] leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  {msg.content}
                </p>
              </div>
            </div>
          ) : (
            /* User bubble */
            <div key={i} className="flex justify-end">
              <div
                className="px-4 py-3 max-w-[78%]"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '18px 18px 6px 18px',
                }}
              >
                <p
                  className="text-[15px] leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  {msg.content}
                </p>
              </div>
            </div>
          )
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-start gap-2">
            <div
              className="rounded-full flex-shrink-0 flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.3)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 9,
                fontWeight: 700,
                color: '#c9a84c',
              }}
            >
              FS
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p
                className="italic text-[14px]"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
              >
                Reaching back through time…
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-2">
            <p
              className="text-[12px]"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c0392b' }}
            >
              {error}
            </p>
            {!complete && (
              <button
                onClick={() => sendToApi(messages)}
                className="mt-1 text-[10px] tracking-[1px] uppercase underline"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* ── Review & Save (complete state) ─────────────────────── */}
        {complete && profile && (
          <div
            className="rounded-xl p-4 mt-2"
            style={{
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.25)',
            }}
          >
            <div
              className="text-[9.5px] tracking-[1.6px] uppercase mb-3"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              Your Profile Summary
            </div>

            {(
              [
                { label: 'Identity', value: profile.identity },
                { label: 'Goals', value: profile.goals },
                { label: 'Primary Obstacle', value: profile.obstacle },
                { label: 'Core Strengths', value: profile.virtues },
                { label: 'Work & Meaning', value: profile.work_meaning },
                { label: 'Future Vision', value: profile.future_vision },
              ] as { label: string; value: string | undefined }[]
            )
              .filter(r => r.value)
              .map(row => (
                <div key={row.label} className="mb-3">
                  <div
                    className="text-[9px] tracking-[1.2px] uppercase mb-0.5"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    {row.label}
                  </div>
                  <p
                    className="text-[14px] leading-snug"
                    style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                  >
                    {row.value}
                  </p>
                </div>
              ))}

            {saved ? (
              <div
                className="text-center py-3 text-[13px]"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
              >
                ✓ Saved. Returning home…
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl text-[12px] tracking-[1.4px] uppercase font-semibold mt-1 transition-opacity"
                style={{
                  background: saving
                    ? 'rgba(201,168,76,0.3)'
                    : 'linear-gradient(135deg, #e3c77a, #8a6f27)',
                  color: '#0f1724',
                  fontFamily: 'var(--font-mono, monospace)',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save to Know Thyself'}
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer (hidden once complete) ───────────────────────── */}
      {!complete && (
        <div
          className="flex-shrink-0 px-4 pb-6 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Speak freely…"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-[15px] leading-relaxed py-1"
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                color: '#e6eef8',
                maxHeight: 120,
                overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                background:
                  input.trim() && !loading
                    ? 'linear-gradient(135deg, #e3c77a, #8a6f27)'
                    : 'rgba(255,255,255,0.08)',
                color: input.trim() && !loading ? '#0f1724' : '#9aa0a6',
              }}
              aria-label="Send"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

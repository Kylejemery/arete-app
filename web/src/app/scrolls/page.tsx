'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getScrolls, getKnowThyselfComplete } from '@/lib/db';
import type { Scroll } from '@/lib/types';
import ChapterRule from '@/components/ChapterRule';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const COUNSELOR_LABELS: Record<string, string> = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ScrollsPage() {
  const router = useRouter();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ktComplete, setKtComplete] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState('');
  const [storedUserName, setStoredUserName] = useState('');
  const [storedUserId, setStoredUserId] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }
      const [data, ktDone] = await Promise.all([
        getScrolls(user.id),
        getKnowThyselfComplete(),
      ]);
      setScrolls(data);
      setKtComplete(ktDone);
      setUserGoal(settings.kt_goals || '');
      setStoredUserName(settings.user_name || '');
      setStoredUserId(user.id);
      setLoading(false);
    }
    load();
  }, [router]);

  async function requestScroll() {
    setRequesting(true);
    setRequestError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/api/scrolls/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          goal: userGoal || 'personal growth and virtue',
          userName: storedUserName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const { title, body, counselor } = await res.json() as { title: string; body: string; counselor: string };
      const { error: insertError } = await supabase
        .from('scrolls')
        .insert({
          user_id: storedUserId,
          title,
          body,
          counselor,
          goal_source: userGoal || null,
        });
      if (insertError) throw new Error(insertError.message);
      // Refresh list and auto-expand the newest scroll
      const updated = await getScrolls(storedUserId);
      setScrolls(updated);
      if (updated.length > 0) setExpandedId(updated[0].id);
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span
          className="text-[11px] tracking-[2px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Chapter VI · Scrolls
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Wisdom for<br />
          <em style={{ color: '#c9a84c' }}>your goals.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      {/* ── Scroll list ─────────────────────────────────────────── */}
      <div className="px-4">
        {scrolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4" style={{ opacity: 0.12 }}>📜</div>
            <p
              className="text-[15px] italic"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
            >
              No scrolls yet.
            </p>
            {ktComplete ? (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  onClick={requestScroll}
                  disabled={requesting}
                  className="px-6 py-2.5 rounded-lg text-[13px] tracking-[1px] uppercase font-medium transition-opacity"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    background: 'rgba(201,168,76,0.15)',
                    border: '1px solid rgba(201,168,76,0.5)',
                    color: '#c9a84c',
                    opacity: requesting ? 0.6 : 1,
                    cursor: requesting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {requesting ? 'Generating…' : 'Request a Scroll'}
                </button>
                {requestError && (
                  <p
                    className="text-[11px] mt-1"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#e57373' }}
                  >
                    {requestError}
                  </p>
                )}
              </div>
            ) : (
              <p
                className="text-[11px] tracking-[1px] uppercase mt-1"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.5)' }}
              >
                Complete Know Thyself to receive your first scroll.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">

            {/* ── Request button (above list) ────────────────────── */}
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={requestScroll}
                disabled={requesting}
                className="px-4 py-2 rounded-lg text-[11px] tracking-[1px] uppercase font-medium transition-opacity"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.4)',
                  color: '#c9a84c',
                  opacity: requesting ? 0.6 : 1,
                  cursor: requesting ? 'not-allowed' : 'pointer',
                }}
              >
                {requesting ? 'Generating…' : '+ Request a Scroll'}
              </button>
              {requestError && (
                <p
                  className="text-[11px]"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#e57373' }}
                >
                  {requestError}
                </p>
              )}
            </div>

            {scrolls.map(scroll => {
              const isExpanded = expandedId === scroll.id;
              return (
                <div
                  key={scroll.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Scroll header (clickable) */}
                  <button
                    className="w-full text-left px-4 py-4 flex items-start justify-between gap-3 transition-opacity hover:opacity-80"
                    onClick={() => setExpandedId(isExpanded ? null : scroll.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[16px] font-medium leading-snug mb-1.5"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {scroll.title}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] tracking-[1px] uppercase"
                          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                        >
                          {COUNSELOR_LABELS[scroll.counselor] ?? scroll.counselor}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
                        <span
                          className="text-[10px]"
                          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                        >
                          {formatDate(scroll.created_at)}
                        </span>
                        {scroll.read_count ? (
                          <>
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
                            <span
                              className="text-[10px]"
                              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                            >
                              Read {scroll.read_count}×
                            </span>
                          </>
                        ) : null}
                      </div>
                      {scroll.goal_source && (
                        <p
                          className="text-[11px] italic mt-1 truncate"
                          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                        >
                          Goal: {scroll.goal_source}
                        </p>
                      )}
                    </div>
                    <span
                      className="flex-shrink-0 mt-0.5 transition-transform duration-200"
                      style={{
                        color: '#c9a84c',
                        fontSize: 13,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▾
                    </span>
                  </button>

                  {/* Scroll body */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p
                        className="text-[15px] leading-relaxed whitespace-pre-wrap pt-4"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {scroll.body}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

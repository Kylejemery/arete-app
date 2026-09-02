'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChapterRule from '@/components/ChapterRule';
import LibraryIcon from '@/components/scrolls/LibraryIcon';
import RequestScrollModal from '@/components/scrolls/RequestScrollModal';
import ScrollCard from '@/components/scrolls/ScrollCard';
import { Spinner } from '@/components/ui';
import { useRequireUser } from '@/hooks/useRequireUser';
import { getUserScrolls } from '@/lib/scrolls';
import type { Scroll } from '@/lib/types';

export default function ScrollsPage() {
  const router = useRouter();
  const { user, settings, loading: authLoading } = useRequireUser();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);

  const load = useCallback(async (userId: string) => {
    try {
      setScrolls(await getUserScrolls(userId));
    } catch (e) {
      console.error('loadScrolls error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load(user.id);
  }, [user, load]);

  async function handleCreated(created: Scroll) {
    setShowRequest(false);
    if (user) await load(user.id);
    router.push(`/scrolls/${created.id}`);
  }

  const busy = authLoading || loading;

  return (
    <div className="min-h-screen pb-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5 flex items-end justify-between gap-4">
        <div>
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
            Your <em style={{ color: '#c9a84c' }}>Scrolls.</em>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowRequest(true)}
          className="flex-shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-semibold"
          style={{ background: '#c9a84c', color: '#0f1724' }}
        >
          + Request a Scroll
        </button>
      </div>

      <ChapterRule className="mx-5" />

      <div className="px-4 max-w-2xl">
        {/* ── The Library ───────────────────────────────────────── */}
        <Link
          href="/library"
          className="block rounded-xl px-4 py-3.5 mb-4 transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(201,168,76,0.16)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.16)';
          }}
        >
          <LibraryIcon />
          <p
            className="text-[15px] mt-1.5"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            The Library
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            Reading Room · Symposium · Observatory
          </p>
        </Link>

        {/* ── Scrolls ───────────────────────────────────────────── */}
        {busy ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={28} />
          </div>
        ) : scrolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3.5">
            <div className="text-[48px]" style={{ opacity: 0.12 }}>
              📜
            </div>
            <p
              className="text-[18px] font-semibold"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
            >
              Your scrolls will appear here.
            </p>
            <p
              className="text-[14px] leading-relaxed max-w-sm"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#6b7280' }}
            >
              Complete your Know Thyself profile to receive your first scroll, written for you by your
              Counselor.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {scrolls.map((scroll) => (
              <ScrollCard key={scroll.id} scroll={scroll} />
            ))}
          </div>
        )}
      </div>

      <RequestScrollModal
        open={showRequest}
        onClose={() => setShowRequest(false)}
        userName={settings?.user_name ?? null}
        onCreated={handleCreated}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FlameIcon from '@/components/scrolls/FlameIcon';
import ScrollBody from '@/components/scrolls/ScrollBody';
import { counselorLabel } from '@/components/scrolls/counselors';
import { useToast } from '@/components/ui';
import { useRequireUser } from '@/hooks/useRequireUser';
import { getScroll, logScrollRead } from '@/lib/scrolls';
import type { Scroll } from '@/lib/types';

const MILESTONES: Record<number, string> = {
  3: "You've read this 3 times. The words are starting to root.",
  7: "You've read this 7 times. The words are becoming yours.",
  10: "You've read this 10 times. This is now part of you.",
  21: '21 readings. The philosopher would be proud.',
};

const READ_THRESHOLD_MS = 60_000;
/** How close to the bottom counts as "finished reading". */
const BOTTOM_SLACK_PX = 40;

function Header() {
  return (
    <div
      className="flex items-center px-4 py-3.5"
      style={{ borderBottom: '1px solid rgba(201,168,76,0.16)' }}
    >
      <Link
        href="/scrolls"
        aria-label="Back to your scrolls"
        className="px-1.5 py-1 text-[20px] leading-none"
        style={{ color: '#c9a84c' }}
      >
        ←
      </Link>
    </div>
  );
}

function CentredNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[15px]" style={{ color: '#6b7280' }}>
        {children}
      </p>
    </div>
  );
}

export default function ScrollDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { user, loading: authLoading } = useRequireUser();
  const toast = useToast();

  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [loading, setLoading] = useState(true);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const readLoggedRef = useRef(false);

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await getScroll(id);
        if (!cancelled) setScroll(data);
      } catch (e) {
        console.error('loadScroll error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Read tracking ─────────────────────────────────────────────
  // A read is logged once per visit, whichever comes first: a minute on the
  // page, or scrolling to within 40px of the bottom.
  const recordRead = useCallback(async () => {
    if (readLoggedRef.current || !id || !user) return;
    readLoggedRef.current = true;
    try {
      const newCount = await logScrollRead(id, user.id);
      const milestone = MILESTONES[newCount];
      if (milestone) toast.show(milestone);
      setScroll((prev) => (prev ? { ...prev, read_count: newCount } : prev));
    } catch (e) {
      console.error('recordRead error:', e);
      readLoggedRef.current = false;
    }
  }, [id, user, toast]);

  useEffect(() => {
    if (!id || !user) return;
    const timer = setTimeout(() => {
      void recordRead();
    }, READ_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [id, user, recordRead]);

  useEffect(() => {
    if (!id || !user || !scroll) return;
    // The app shell's <main> is the scroll container on every page.
    const container = rootRef.current?.closest('main') as HTMLElement | null;
    const target: HTMLElement | Window = container ?? window;

    const onScroll = () => {
      if (readLoggedRef.current) return;
      const el = container ?? document.documentElement;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_SLACK_PX) {
        void recordRead();
      }
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [id, user, scroll, recordRead]);

  const busy = authLoading || loading;
  const readCount = scroll?.read_count ?? 0;

  if (busy) {
    return (
      <div ref={rootRef} className="min-h-screen">
        <Header />
        <CentredNote>Loading scroll...</CentredNote>
      </div>
    );
  }

  if (!scroll) {
    return (
      <div ref={rootRef} className="min-h-screen">
        <Header />
        <CentredNote>Scroll not found.</CentredNote>
      </div>
    );
  }

  const author = counselorLabel(scroll.counselor);

  return (
    <div ref={rootRef} className="min-h-screen">
      <Header />

      <article className="px-6 md:px-7 pt-8 pb-20">
        <div style={{ maxWidth: '65ch', marginLeft: 'auto', marginRight: 'auto' }}>
          <p
            className="text-[11px] font-semibold tracking-[2px] uppercase text-center mb-3"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            {author}
          </p>
          <h1
            className="text-center mb-2"
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              color: '#fff',
              fontSize: 26,
              lineHeight: '34px',
              fontWeight: 600,
            }}
          >
            {scroll.title}
          </h1>
          <p
            className="text-[13px] italic text-center"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6', marginBottom: 28 }}
          >
            {`Written for you by ${author}`}
          </p>

          <div style={{ height: 1, background: 'rgba(201,168,76,0.16)', marginBottom: 28 }} />
        </div>

        <ScrollBody body={scroll.body} />

        <div
          className="flex items-center justify-center gap-1.5 mt-6 pt-5"
          style={{
            maxWidth: '65ch',
            marginLeft: 'auto',
            marginRight: 'auto',
            borderTop: '1px solid rgba(201,168,76,0.09)',
          }}
        >
          {readCount > 0 && <FlameIcon size={15} color="rgba(201,168,76,0.4)" />}
          <span className="text-[13px] italic" style={{ color: '#4b5563' }}>
            {readCount > 0
              ? `You've read this ${readCount} ${readCount === 1 ? 'time' : 'times'}`
              : 'Reading now...'}
          </span>
        </div>
      </article>
    </div>
  );
}

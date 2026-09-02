'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import CabinetReplay from '@/components/CabinetReplay';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';

/**
 * Dual-mode entry point: the marketing landing for guests, the daily
 * dashboard for signed-in users. The dashboard loads its own data — this
 * component only decides which of the two to render.
 */
export default function HomePage() {
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'authenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setAuthState(user ? 'authenticated' : 'guest');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Guest: marketing landing page ────────────────────────────────
  if (authState === 'guest') {
    return (
      <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
        {/* Nav */}
        <nav
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}
        >
          <span
            className="text-xl tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
          >
            Arete
          </span>
          <div className="flex items-center gap-5">
            <a
              href="https://academy.pursuearete.com/library"
              className="text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
              style={{
                color: 'rgba(201,168,76,0.75)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              The Library
            </a>
            <Link
              href="/login"
              className="px-4 py-2 rounded-full text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
              style={{
                border: '1px solid rgba(201,168,76,0.4)',
                color: '#c9a84c',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* Cabinet Replay hero */}
        <CabinetReplay />

        {/* CTA */}
        <div className="text-center py-16 px-6">
          <a
            href="https://apps.apple.com/app/id6762371595"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-sm tracking-wide transition-opacity hover:opacity-85"
            style={{ background: '#c9a84c', color: '#0a0a0f', fontFamily: 'var(--font-mono, monospace)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Download on the App Store
          </a>
        </div>

        {/* Footer */}
        <footer
          className="text-center py-6 text-xs tracking-widest"
          style={{ borderTop: '1px solid rgba(201,168,76,0.1)', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}
        >
          <span className="flex items-center justify-center gap-6">
            <a
              href="https://academy.pursuearete.com/library"
              className="hover:opacity-60 transition-opacity"
              style={{ color: 'rgba(201,168,76,0.4)' }}
            >
              The Library
            </a>
            <Link href="/privacy" className="hover:opacity-60 transition-opacity" style={{ color: 'rgba(201,168,76,0.4)' }}>
              Privacy Policy
            </Link>
          </span>
        </footer>
      </div>
    );
  }

  // ── Checking auth ────────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span
          className="text-[11px] tracking-[2px] uppercase"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            color: '#9aa0a6',
          }}
        >
          Loading…
        </span>
      </div>
    );
  }

  // ── Signed in: the daily dashboard ───────────────────────────────
  return <AuthenticatedHome />;
}

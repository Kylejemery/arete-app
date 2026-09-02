'use client';

import { useRouter } from 'next/navigation';

export interface PaywallOverlayProps {
  open: boolean;
  title: string;
  body: string;
  /** Attribution for the upgrade page (`/upgrade?src=…`). */
  src: string;
  onDismiss?: () => void;
}

/** The single full-screen paywall. Replaces the two byte-similar copies. */
export default function PaywallOverlay({ open, title, body, src, onDismiss }: PaywallOverlayProps) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="rounded-xl p-8 max-w-sm mx-4 text-center"
        style={{ background: '#16213e', border: '1px solid rgba(201,168,76,0.33)' }}
      >
        <p
          className="text-lg mb-3"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          {title}
        </p>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#9aa0a6' }}>
          {body}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/upgrade?src=${encodeURIComponent(src)}`)}
          className="w-full font-semibold px-6 py-3 rounded-lg hover:opacity-90 mb-3"
          style={{ background: '#c9a84c', color: '#0f1724' }}
        >
          Upgrade
        </button>
        <button
          type="button"
          onClick={() => (onDismiss ? onDismiss() : router.back())}
          className="w-full text-sm py-2 hover:opacity-80"
          style={{ color: '#9aa0a6' }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}

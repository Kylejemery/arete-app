'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui';
import { getItem, setItem } from '@/lib/storage';
import { useSubscription } from '@/lib/useSubscription';

// One-time "What's New" announcement, mirroring the mobile mechanism: it is
// keyed on a version string and shows nothing unless that exact version has an
// entry in WHATS_NEW and has not been marked seen. To announce a future
// release, bump WHATS_NEW_VERSION and add its entry — versions without one
// stay quiet.
//
// The mobile 1.4.0 entry announces Screen Time / Apple Health / calendar,
// none of which exist on the web, so the web's first entry is its own.

const SEEN_KEY = 'whats_new_seen_version';

export const WHATS_NEW_VERSION = 'web-1.0.0';

interface WhatsNewContent {
  title: string;
  intro: string;
  rows: { icon: string; title: string; body: string }[];
}

const WHATS_NEW: Record<string, WhatsNewContent> = {
  'web-1.0.0': {
    title: 'The Cabinet Sees More',
    intro:
      'The Cabinet now sees your routines, journal, reading and focus sessions — so your counselors can speak to the day you actually lived.',
    rows: [
      {
        icon: '☀️',
        title: 'Your routines',
        body: 'What you set out to do this morning, and what you made of the evening.',
      },
      {
        icon: '📓',
        title: 'Your journal and goals',
        body: 'Recent entries and the goals you are carrying, held beside what you ask.',
      },
      {
        icon: '📚',
        title: 'Reading and focus',
        body: 'What you are reading, and the focus sessions you finished today.',
      },
    ],
  },
};

/**
 * Self-deciding announcement. Mount it and it works out whether to appear.
 * `suppressed` hides it while the name prompt is up — a brand-new user does
 * not need "what's new".
 */
export default function WhatsNewModal({ suppressed = false }: { suppressed?: boolean }) {
  const router = useRouter();
  const { tier } = useSubscription();
  const [content, setContent] = useState<WhatsNewContent | null>(null);

  useEffect(() => {
    const entry = WHATS_NEW[WHATS_NEW_VERSION];
    if (!entry) return;
    if (getItem(SEEN_KEY) === WHATS_NEW_VERSION) return;
    setContent(entry);
  }, []);

  const dismiss = (then?: () => void) => {
    setContent(null);
    setItem(SEEN_KEY, WHATS_NEW_VERSION);
    then?.();
  };

  if (!content) return null;

  const free = tier === 'free';

  return (
    <Modal open={!suppressed} onClose={() => dismiss()} maxWidth={460}>
      <div
        className="text-[12px] tracking-[2px] uppercase"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        New in Arete
      </div>

      <h2
        className="text-[26px] mt-1.5 leading-tight"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#E0D5B5' }}
      >
        {content.title}
      </h2>

      <p className="text-[14px] leading-relaxed mt-2 mb-5" style={{ color: '#8A9BB0' }}>
        {content.intro}
      </p>

      {content.rows.map((row) => (
        <div key={row.title} className="flex gap-3 mb-4">
          <span className="text-[20px] leading-none mt-0.5">{row.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold" style={{ color: '#E0D5B5' }}>
              {row.title}
            </div>
            <div className="text-[13px] leading-snug mt-0.5" style={{ color: '#8A9BB0' }}>
              {row.body}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          dismiss(() => {
            router.push(free ? '/upgrade?src=whats_new_cabinet_sight' : '/cabinet');
          })
        }
        className="w-full mt-2 py-3.5 rounded-lg text-[15px] font-semibold hover:opacity-90"
        style={{ background: '#c9a84c', color: '#0f1724' }}
      >
        {free ? 'See what Premium unlocks' : 'Open the Cabinet'}
      </button>

      <button
        type="button"
        onClick={() => dismiss()}
        className="w-full py-3 text-[14px] hover:opacity-80"
        style={{ color: '#8A9BB0' }}
      >
        Later
      </button>
    </Modal>
  );
}

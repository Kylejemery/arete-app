'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import { logEvent } from '@/lib/events';
import { seedYesterdayLineIntoCabinet, type YesterdayCard as Card } from '@/lib/yesterday';

// Home, top position, when yesterday has a check-in (retention plan R8):
// the user's own intention in quotes, then a counselor's line holding them
// to it, then Answer, which opens the Cabinet with that line in the thread.
export default function YesterdayCard({ card }: { card: Card }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logEvent('home_yesterday_card_viewed', { counselor: card.counselorId, has_intention: !!card.intention });
  }, [card.counselorId, card.intention]);

  const answer = async () => {
    if (busy) return;
    setBusy(true);
    await seedYesterdayLineIntoCabinet(card);
    router.push('/cabinet?focus=1');
  };

  return (
    <div className="px-4 pt-4">
      <GlassCard>
        <div className="p-4 flex flex-col gap-2" style={{ borderLeft: '3px solid #c9a84c' }}>
          {card.intention ? (
            <>
              <div className="text-[10px] tracking-[1.6px] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
                Yesterday you wrote
              </div>
              <p className="text-[15px] italic leading-relaxed" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
                &ldquo;{card.intention}&rdquo;
              </p>
            </>
          ) : (
            <div className="text-[10px] tracking-[1.6px] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
              Yesterday
            </div>
          )}
          <p className="text-[14px] leading-relaxed mt-1" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
            {card.line}
          </p>
          <div className="flex items-center justify-between gap-3 mt-1">
            <span className="text-[10px] tracking-[1.2px] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.75)' }}>
              {card.counselorName}
            </span>
            <button
              onClick={answer}
              disabled={busy}
              className="px-4 py-2 rounded-full text-[10px] tracking-[1.4px] uppercase font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {busy ? 'Opening…' : 'Answer'}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_CABINET_SLUGS, FUTURE_SELF_SLUG, getRandomCabinetQuote } from '@/lib/db';
import { DAILY_QUOTES } from '@/lib/quotes';
import { getItem, setItem } from '@/lib/storage';

const QUOTE_CACHE_KEY = 'home_quote_cache';

interface Quote {
  text: string;
  author: string;
}

/**
 * `Y-M-D-morning|evening`, flipping at 18:00 — byte-identical to the mobile
 * slot key (month is 0-based there too), so a shared cache would agree.
 */
export function getSlotKey(d: Date = new Date()): string {
  const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return `${dateStr}-${d.getHours() < 18 ? 'morning' : 'evening'}`;
}

function fallbackQuote(): Quote {
  return DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length];
}

export interface HomeQuoteCardProps {
  /** `user_settings.cabinet_members`; null while the settings are loading. */
  cabinetMembers: string[] | null;
}

/**
 * One line from the user's own cabinet, held for the slot. A cached quote for
 * the current slot paints immediately; only a new slot hits the network.
 */
export default function HomeQuoteCard({ cabinetMembers }: HomeQuoteCardProps) {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const slot = getSlotKey();

    try {
      const cached = getItem(QUOTE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { slot?: string; quote?: Quote };
        if (parsed?.slot === slot && parsed.quote?.text) {
          setQuote(parsed.quote);
          return;
        }
      }
    } catch {
      /* corrupt cache — fall through and refetch */
    }

    if (!cabinetMembers) return;

    let cancelled = false;
    void (async () => {
      const slugs = cabinetMembers.filter((s) => s !== FUTURE_SELF_SLUG);
      let next: Quote;
      try {
        const result = await getRandomCabinetQuote(slugs.length > 0 ? slugs : DEFAULT_CABINET_SLUGS);
        next = result ? { text: result.quote, author: result.counselor } : fallbackQuote();
      } catch {
        next = fallbackQuote();
      }
      if (cancelled) return;
      setQuote(next);
      setItem(QUOTE_CACHE_KEY, JSON.stringify({ slot, quote: next }));
    })();

    return () => {
      cancelled = true;
    };
  }, [cabinetMembers]);

  if (!quote) {
    return (
      <div
        className="rounded-xl"
        style={{
          height: 96,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeft: '3px solid rgba(201,168,76,0.5)',
          opacity: 0.4,
        }}
      />
    );
  }

  return (
    <div
      className="rounded-xl p-4 flex gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: '3px solid rgba(201,168,76,0.5)',
      }}
    >
      <span
        aria-hidden
        className="text-[40px] leading-none select-none"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c', marginTop: -2 }}
      >
        &ldquo;
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="italic text-[15px] leading-relaxed opacity-90"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          {quote.text}
        </p>
        <p
          className="text-[9.5px] tracking-[1.4px] uppercase mt-2"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          — {quote.author}
        </p>
      </div>
    </div>
  );
}

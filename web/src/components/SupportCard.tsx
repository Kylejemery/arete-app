'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/claudeService';

// A quiet support card for the Journal page. The server decides whether it
// shows (GET /api/user/support-card: a 7 day window, a key, nothing else);
// the card never says why it is showing and makes no promises about privacy.
// Dismissal is remembered per key. Web port of components/SupportCard.tsx.
const DISMISS_KEY = 'arete_support_card_dismissed_key';

export default function SupportCard() {
  const [cardKey, setCardKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${API_BASE_URL}/api/user/support-card`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!data?.show || !data?.key || (data.until && Date.parse(data.until) < Date.now())) return;
        let dismissed: string | null = null;
        try { dismissed = window.localStorage.getItem(DISMISS_KEY); } catch {}
        if (!cancelled && dismissed !== data.key) setCardKey(data.key);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!cardKey) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, cardKey); } catch {}
    setCardKey(null);
  };

  return (
    <div
      className="mx-4 mt-4 mb-4 px-5 py-4"
      style={{
        background: 'rgba(143,179,201,0.08)',
        border: '1px solid rgba(143,179,201,0.35)',
        borderRadius: 16,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="text-[17px] leading-snug mb-1"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          If things feel heavy right now, you don&apos;t have to carry it alone.
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-[16px] leading-none" style={{ color: '#9aa0a6' }}>
          ×
        </button>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: '#9aa0a6' }}>
        Talking with someone can help. In the US you can call or text 988 any time.
      </p>
      <div className="flex gap-2 mt-3">
        <a href="tel:988" className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ border: '1px solid #8fb3c9', color: '#cfe3ef' }}>
          Call 988
        </a>
        <a href="sms:988" className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ border: '1px solid #8fb3c9', color: '#cfe3ef' }}>
          Text 988
        </a>
      </div>
      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[12px] mt-3 underline"
        style={{ color: '#8fb3c9' }}
      >
        Outside the US? Find a helpline at findahelpline.com
      </a>
    </div>
  );
}

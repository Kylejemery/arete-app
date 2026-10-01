'use client';

import { useState } from 'react';
import { GOLD, MONO } from '@/app/library/theme';

// Copy the piece's link. Uses the native share sheet where there is one
// (phones), the clipboard otherwise.
export default function ShareLink({ url, title }: { url: string; title: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* dismissed or blocked: nothing to do */
    }
  };
  return (
    <button onClick={share} style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, background: 'none', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, padding: '9px 14px' }}>
      {done ? '✓ Link copied' : 'Share'}
    </button>
  );
}

'use client';

import CounselorMarkdown from '@/components/CounselorMarkdown';
import type { LiveVoice } from '@/lib/cabinetStream';

// The Cabinet's reply while it is being written (retention plan R13): one
// bubble per voice, styled like a finished counselor message, with a soft
// cursor on the voice still speaking. When the turn completes, the page
// swaps these for the saved messages.

function initials(name: string | null): string {
  if (!name) return 'TC';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || 'TC';
}

export default function LiveVoiceBubbles({ voices, fallbackName = 'The Cabinet' }: { voices: LiveVoice[]; fallbackName?: string }) {
  const shown = voices.filter(v => v.text.trim().length > 0);
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((v, i) => (
        <div key={`${v.counselorId ?? 'voice'}-${i}`} className="flex justify-start">
          <div className="max-w-[90%] flex gap-3 items-start">
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
              style={{
                width: 32, height: 32,
                background: 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.3)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 9, fontWeight: 700,
                color: '#c9a84c',
              }}
            >
              {initials(v.counselorName)}
            </div>
            <div
              className="flex flex-col gap-2 px-4 py-3 flex-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px 18px 18px 6px',
              }}
              aria-live="polite"
              aria-busy={!v.done}
            >
              <div
                className="text-[10px] tracking-[1.2px] uppercase"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                {v.counselorName || fallbackName}
              </div>
              <CounselorMarkdown text={v.text} />
              {!v.done && (
                <span className="inline-block w-1.5 h-4 -mt-1 animate-pulse" style={{ background: 'rgba(201,168,76,0.6)' }} aria-hidden />
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

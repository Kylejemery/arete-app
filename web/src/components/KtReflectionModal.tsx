'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/events';
import { requestKtReflection, seedReflectionIntoCabinet, type KtReflection } from '@/lib/ktReflection';
import CounselorMarkdown from '@/components/CounselorMarkdown';

// Shown once right after a Know Thyself save that completed the profile
// (retention plan R6). Asks the server for the chair's reflection, shows it,
// and offers to answer it in the Cabinet. Web twin of app/kt-reflection.tsx.
export default function KtReflectionModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reflection, setReflection] = useState<KtReflection | null>(null);
  const [answering, setAnswering] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    (async () => {
      const r = await requestKtReflection();
      if (r) {
        setReflection(r);
        setState('ready');
        logEvent('kt_reflection_viewed', { counselor: r.counselorId });
      } else {
        setState('failed');
      }
    })();
  }, []);

  const answer = async () => {
    if (!reflection || answering) return;
    setAnswering(true);
    await seedReflectionIntoCabinet(reflection);
    router.push('/cabinet?focus=1');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#161f2e', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div>
          <div className="text-[10px] tracking-[1.6px] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
            {reflection?.counselorName ?? 'Your Cabinet'}
          </div>
          <h2 className="text-[22px] leading-tight mt-1" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
            What your Cabinet now sees.
          </h2>
        </div>

        {state === 'loading' && (
          <p className="text-[14px] italic" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}>
            {reflection?.counselorName ?? 'The chair of your Cabinet'} is reading what you wrote…
          </p>
        )}
        {state === 'failed' && (
          <p className="text-[14px]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}>
            The Cabinet could not answer just now. Your profile is saved, and your counselors will use it from your next message.
          </p>
        )}
        {state === 'ready' && reflection && (
          <div className="flex flex-col gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CounselorMarkdown text={reflection.reflection} className="text-[15px] leading-relaxed" />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{ color: '#9aa0a6' }}>
            Later
          </button>
          {state === 'ready' && (
            <button
              onClick={answer}
              disabled={answering}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-60"
              style={{ background: '#c9a84c', color: '#0f1724' }}
            >
              {answering ? 'Opening…' : 'Answer in the Cabinet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

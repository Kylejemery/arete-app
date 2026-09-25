'use client';

// The card under a Cabinet reply that carries an offer (activation Parts 6
// and 9). Web port of components/OfferCard.tsx. Nothing is created until the
// person clicks Yes.
import { useState } from 'react';
import { respondToCabinetOffer, type CabinetOffer } from '@/lib/claudeService';

const CATEGORIES = ['GENERAL', 'PHYSICAL', 'BEHAVIORAL', 'HEALTH', 'FINANCIAL', 'MENTAL', 'CAREER', 'RELATIONSHIPS'];

export default function OfferCard({ offer, onClose }: { offer: CabinetOffer; onClose: () => void }) {
  const [title, setTitle] = useState(offer.title ?? '');
  const [category, setCategory] = useState(offer.category ?? 'GENERAL');
  const [targetDate, setTargetDate] = useState(offer.target_date ?? '');
  const [state, setState] = useState<'open' | 'saving' | 'done' | 'error'>('open');

  const answer = async (accept: boolean) => {
    if (!accept) {
      void respondToCabinetOffer(offer.id, { accept: false });
      onClose();
      return;
    }
    setState('saving');
    const r = await respondToCabinetOffer(offer.id, offer.kind === 'goal'
      ? { accept: true, title: title.trim(), category, target_date: targetDate || null }
      : { accept: true });
    setState(r.ok ? 'done' : 'error');
  };

  const box = { background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16 };
  const mono = { fontFamily: 'var(--font-mono, monospace)' };

  if (state === 'done') {
    return (
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={box}>
        <p className="text-[14px]" style={{ color: '#e6eef8' }}>
          {offer.kind === 'goal' ? 'Saved to your goals.' : 'Your scroll is being written. It will appear in Scrolls.'}
        </p>
        <button onClick={onClose} className="text-[12px]" style={{ ...mono, color: '#9aa0a6' }}>Close</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-3" style={box}>
      {offer.kind === 'goal' ? (
        <>
          <div className="text-[10px] tracking-[1.4px] uppercase" style={{ ...mono, color: '#c9a84c' }}>Save as a goal</div>
          <input
            className="w-full px-3 py-2 rounded-xl text-[14px] outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6eef8' }}
            value={title}
            maxLength={120}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-2.5 py-1 rounded-lg text-[11px]"
                style={category === c
                  ? { background: '#c9a84c', color: '#0f1724', fontWeight: 700 }
                  : { border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}
              >
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <label className="text-[12px] flex items-center gap-2" style={{ ...mono, color: '#9aa0a6' }}>
            Target date
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="px-2 py-1 rounded-lg text-[13px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6eef8' }}
            />
          </label>
        </>
      ) : (
        <p className="text-[15px]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
          Would you like a scroll on this?
        </p>
      )}
      {state === 'error' && <p className="text-[12px]" style={{ color: '#e57373' }}>That did not go through. Try again.</p>}
      <div className="flex items-center gap-4">
        <button
          onClick={() => answer(true)}
          disabled={state === 'saving' || (offer.kind === 'goal' && !title.trim())}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50"
          style={{ background: '#c9a84c', color: '#0f1724' }}
        >
          {offer.kind === 'goal' ? 'Save goal' : 'Yes'}
        </button>
        <button onClick={() => answer(false)} disabled={state === 'saving'} className="text-[13px]" style={{ color: '#9aa0a6' }}>
          Not now
        </button>
      </div>
    </div>
  );
}

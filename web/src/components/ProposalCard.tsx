'use client';

// The card under a Cabinet reply when a counselor proposes a practice
// (personalization run C, Part C2). Web port of components/ProposalCard.tsx.
// Yes turns it on and pins it to Home, with an Undo that puts things back
// exactly; Not now declines it for 30 days.
import { useState } from 'react';
import { respondToFeatureRequest, respondToProposal, undoProposal, type CabinetProposal } from '@/lib/practices';

type State = 'open' | 'saving' | 'done' | 'undone' | 'unavailable' | 'error';

export default function ProposalCard({ proposal, onClose }: { proposal: CabinetProposal; onClose: () => void }) {
  const [state, setState] = useState<State>('open');

  const isRequest = proposal.kind === 'feature_request';
  const answer = async (accept: boolean) => {
    if (!accept) {
      void (isRequest ? respondToFeatureRequest(proposal.id, false) : respondToProposal(proposal.id, false));
      onClose();
      return;
    }
    setState('saving');
    const r = isRequest ? await respondToFeatureRequest(proposal.id, true) : await respondToProposal(proposal.id, true);
    if (r.ok) setState('done');
    else if (r.data?.error === 'no_longer_available') setState('unavailable');
    else setState('error');
  };

  const undo = async () => {
    setState('saving');
    const r = await undoProposal(proposal.id);
    setState(r.ok ? 'undone' : 'done');
  };

  const box = { background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16 };
  const mono = { fontFamily: 'var(--font-mono, monospace)' };

  if (state === 'done' || state === 'undone' || state === 'unavailable') {
    return (
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={box}>
        <p className="text-[14px]" style={{ color: '#e6eef8' }}>
          {state === 'done'
            ? (isRequest ? 'Passed along. Thank you for the idea.' : `${proposal.label} is on. You'll find it under Your practices on Home.`)
            : state === 'undone'
              ? 'Undone. Everything is as it was.'
              : 'That practice is not available on your account right now.'}
        </p>
        <div className="flex items-center gap-4 flex-shrink-0">
          {state === 'done' && !isRequest && (
            <button onClick={undo} className="text-[13px] font-semibold" style={{ color: '#c9a84c' }}>Undo</button>
          )}
          <button onClick={onClose} className="text-[13px]" style={{ color: '#9aa0a6' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2" style={box}>
      <div className="text-[10px] tracking-[1.4px] uppercase" style={{ ...mono, color: '#c9a84c' }}>
        {isRequest ? 'An idea for Arete' : proposal.source === 'feature_shipped' ? 'You asked for this' : 'A practice for Home'}
      </div>
      {isRequest ? (
        <p className="text-[15px]" style={{ color: '#e6eef8' }}>Want me to pass this idea along to the person who builds Arete?</p>
      ) : (
        <>
          <p className="text-[15px] font-semibold" style={{ color: '#e6eef8' }}>{proposal.label}</p>
          {proposal.description && <p className="text-[14px]" style={{ color: '#c9d1d9' }}>{proposal.description}</p>}
          {proposal.note && <p className="text-[14px] italic" style={{ color: '#e6eef8' }}>For: {proposal.note}</p>}
        </>
      )}
      {state === 'error' && <p className="text-[12px]" style={{ color: '#e57373' }}>That did not go through. Try again.</p>}
      <div className="flex items-center gap-4">
        <button
          onClick={() => answer(true)}
          disabled={state === 'saving'}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50"
          style={{ background: '#c9a84c', color: '#0f1724' }}
        >
          {isRequest ? 'Yes, pass it along' : 'Yes, add it'}
        </button>
        <button onClick={() => answer(false)} disabled={state === 'saving'} className="text-[13px]" style={{ color: '#9aa0a6' }}>
          Not now
        </button>
      </div>
    </div>
  );
}

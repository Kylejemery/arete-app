'use client';

import { checkInChipText, type CheckInSummary } from '@/lib/checkinMessage';
import { MessageTime } from '@/components/MessageDates';

// What the thread shows in place of the synthetic check-in prompt: a small
// centered chip saying a check-in was sent and what it carried.
export default function CheckInChip({ summary, timestamp }: { summary: CheckInSummary; timestamp?: number }) {
  return (
    <div className="w-full flex flex-col items-center gap-1 my-1">
      <div
        className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.5px] text-center max-w-[90%]"
        style={{
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.25)',
          color: 'rgba(201,168,76,0.85)',
          fontFamily: 'var(--font-mono, monospace)',
        }}
        title="Sent to your Cabinet when you finished the routine"
      >
        {summary.kind === 'morning' ? '☀ ' : '☾ '}{checkInChipText(summary)}
      </div>
      {timestamp ? <MessageTime timestamp={timestamp} align="right" /> : null}
    </div>
  );
}

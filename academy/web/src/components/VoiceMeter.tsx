'use client';

// A reading of the prose itself, next to the word count: the two mechanical
// signals that make writing sound machine-made (uniform sentence rhythm,
// predictable diction) plus the dash count and a cliché list. Numbers alone
// would be a scoreboard, so every count is a button that paints its own
// passages in the document. What it measures is deterministic and local, which
// is the point: this is the half of the critique that needs no Interlocutor.

import { computeVoiceMetrics, type MetricKind } from '@/lib/scribe/voice-metrics';

const GOOD = '#6BBF8A';
const OK = '#C9A84C';
const BAD = '#E06B6B';

export function VoiceMeter({
  text,
  active,
  onToggle,
}: {
  text: string;
  active: MetricKind | null;
  onToggle: (m: MetricKind) => void;
}) {
  if (!text.trim()) return null;
  const m = computeVoiceMetrics(text);

  const chip = (metric: MetricKind, label: string, value: number, color: string, title: string) => (
    <button
      key={metric}
      onClick={() => onToggle(metric)}
      title={`${title} Click to show them in the draft.`}
      className={`px-1.5 rounded transition-colors hover:text-academy-text ${
        active === metric ? 'bg-academy-gold/20 text-academy-text' : ''
      }`}
    >
      {label} <span style={{ color }}>{value}</span>
    </button>
  );

  return (
    <>
      <span
        title="Standard deviation of sentence length in words. Human prose varies a lot; uniform sentences are the loudest machine tell."
      >
        rhythm{' '}
        <span style={{ color: m.burstinessLabel === 'good' ? GOOD : m.burstinessLabel === 'ok' ? OK : BAD }}>
          {m.burstiness}
        </span>
      </span>
      <span title="Average words per sentence.">avg {m.meanSentenceLen}w</span>
      {chip('adverb', 'adverbs', m.adverbRate, m.adverbRate > 4 ? OK : GOOD, '-ly adverbs per 100 words. Lower is usually tighter.')}
      {chip('tobe', 'to-be', m.toBeRate, m.toBeRate > 10 ? OK : GOOD, 'to-be verbs per 100 words. High means flatter prose.')}
      {chip('dash', 'dashes', m.dashes, m.dashes === 0 ? GOOD : m.dashLabel === 'some' ? OK : BAD, 'Dashes standing between clauses or around an aside.')}
      {chip('tell', 'tells', m.tellTotal, m.tellTotal === 0 ? GOOD : BAD, m.tellHits.map(h => `${h.phrase} x${h.count}`).join(', ') || 'No cliché tells found.')}
    </>
  );
}

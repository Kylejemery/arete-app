'use client';

import { useState } from 'react';
import type { PolymarketMarket } from '@/lib/types';
import { analyzeMarket } from '@/lib/marketService';
import SignalBadge from './SignalBadge';

interface MarketCardProps {
  market: PolymarketMarket;
}

/** Maps signal level to Tailwind colour classes for the confidence badge. */
const levelStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH: {
    bg: 'bg-red-900/40',
    text: 'text-red-400',
    border: 'border-red-700',
    label: 'HIGH RISK',
  },
  MEDIUM: {
    bg: 'bg-yellow-900/40',
    text: 'text-yellow-400',
    border: 'border-yellow-700',
    label: 'MEDIUM RISK',
  },
  LOW: {
    bg: 'bg-green-900/40',
    text: 'text-green-400',
    border: 'border-green-700',
    label: 'LOW RISK',
  },
};

/**
 * MarketCard — displays a single Polymarket prediction market with:
 * - Composite confidence score (0–100) prominently in the corner
 * - Signal level badge (HIGH / MEDIUM / LOW)
 * - Row of firing signal badges (only signals that are active)
 * - AI analysis button that calls /api/analyze via the market service
 */
export default function MarketCard({ market }: MarketCardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = levelStyles[market.signalLevel] ?? levelStyles.LOW;

  const firingSignals = Object.values(market.signals).filter(s => s.firing);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await analyzeMarket(market);
      setAnalysis(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const formattedVolume = (() => {
    const v = parseFloat(market.volume);
    if (isNaN(v)) return market.volume;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  })();

  const formattedEndDate = market.endDate
    ? new Date(market.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div
      className={`bg-arete-surface rounded-lg border ${style.border} p-5 flex flex-col gap-4`}
    >
      {/* Header: question + confidence score */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-arete-text font-semibold text-sm leading-snug flex-1">
          {market.question}
        </p>

        {/* Composite confidence score ring */}
        <div
          className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${style.border} ${style.bg}`}
        >
          <span className={`text-xl font-bold ${style.text}`}>
            {market.confidenceScore}
          </span>
          <span className="text-arete-muted text-[9px] uppercase tracking-wider leading-tight">
            score
          </span>
        </div>
      </div>

      {/* Signal level badge + meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${style.bg} ${style.text} border ${style.border}`}
        >
          {style.label}
        </span>
        <span className="text-arete-muted text-xs">Vol: {formattedVolume}</span>
        <span className="text-arete-muted text-xs">Resolves: {formattedEndDate}</span>
      </div>

      {/* Firing signal badges */}
      {firingSignals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.values(market.signals).map((signal) => (
            <SignalBadge key={signal.label} signal={signal} />
          ))}
        </div>
      )}

      {/* Signal score breakdown bar */}
      <div className="grid grid-cols-5 gap-1 text-center">
        {[
          { key: 'uvr', label: 'UVR', signal: market.signals.uvr },
          { key: 'pi', label: 'PI', signal: market.signals.priceImpact },
          { key: 'ofi', label: 'OFI', signal: market.signals.ofi },
          { key: 'tp', label: 'TP', signal: market.signals.timeProximity },
          { key: 'hhi', label: 'HHI', signal: market.signals.hhi },
        ].map(({ key, label, signal }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <div className="w-full bg-arete-bg rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${signal.firing ? 'bg-red-500' : 'bg-arete-border'}`}
                style={{ width: `${signal.score}%` }}
              />
            </div>
            <span className="text-arete-muted text-[9px] uppercase">{label}</span>
            <span className={`text-[10px] font-bold ${signal.firing ? 'text-red-400' : 'text-arete-muted'}`}>
              {signal.score}
            </span>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      {!analysis && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="self-start text-xs text-arete-gold hover:text-arete-text border border-arete-border hover:border-arete-gold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Analysing…' : '🤖 AI Analysis'}
        </button>
      )}

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {analysis && (
        <div className="bg-arete-bg rounded p-3 border border-arete-border">
          <p className="text-arete-muted text-xs font-semibold mb-1 uppercase tracking-wide">
            AI Analysis
          </p>
          <p className="text-arete-text text-xs leading-relaxed">{analysis}</p>
        </div>
      )}
    </div>
  );
}

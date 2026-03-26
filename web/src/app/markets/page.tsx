'use client';

import { useEffect, useState } from 'react';
import type { PolymarketMarket, SignalLevel } from '@/lib/types';
import { fetchMarkets } from '@/lib/marketService';
import MarketCard from '@/components/MarketCard';

/** Counts how many markets are at each signal level. */
function countByLevel(markets: PolymarketMarket[], level: SignalLevel): number {
  return markets.filter(m => m.signalLevel === level).length;
}

/**
 * Markets page — Polymarket insider trading detection dashboard.
 *
 * Fetches active prediction markets from the backend /api/markets endpoint
 * and displays them sorted by composite confidence score (highest first).
 * Each card shows the 5-signal breakdown and allows AI-powered analysis.
 */
export default function MarketsPage() {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SignalLevel | 'ALL'>('ALL');

  useEffect(() => {
    fetchMarkets()
      .then(data => {
        // Sort by confidence score descending — highest risk first
        const sorted = [...data].sort((a, b) => b.confidenceScore - a.confidenceScore);
        setMarkets(sorted);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const displayed = filter === 'ALL'
    ? markets
    : markets.filter(m => m.signalLevel === filter);

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔍</span>
          <h1 className="text-2xl font-bold text-arete-text">Insider Detection</h1>
        </div>
        <p className="text-arete-muted text-sm">
          Multi-signal analysis of Polymarket prediction markets. Composite score 0–100.
        </p>
      </div>

      {/* Summary stats */}
      {!loading && !error && markets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-center">
            <p className="text-red-400 text-2xl font-bold">{countByLevel(markets, 'HIGH')}</p>
            <p className="text-red-300 text-xs uppercase tracking-wide">High Risk</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-center">
            <p className="text-yellow-400 text-2xl font-bold">{countByLevel(markets, 'MEDIUM')}</p>
            <p className="text-yellow-300 text-xs uppercase tracking-wide">Medium Risk</p>
          </div>
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-center">
            <p className="text-green-400 text-2xl font-bold">{countByLevel(markets, 'LOW')}</p>
            <p className="text-green-300 text-xs uppercase tracking-wide">Low Risk</p>
          </div>
        </div>
      )}

      {/* Filter buttons */}
      {!loading && !error && markets.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
                filter === level
                  ? 'bg-arete-gold text-arete-bg'
                  : 'bg-arete-surface text-arete-muted border border-arete-border hover:border-arete-gold hover:text-arete-text'
              }`}
            >
              {level === 'ALL' ? `All (${markets.length})` : level}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-3xl animate-pulse">🔍</div>
          <p className="text-arete-muted text-sm">Fetching markets and computing signals…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-5 text-center">
          <p className="text-red-400 font-semibold mb-1">Failed to load markets</p>
          <p className="text-red-300 text-sm">{error}</p>
          <p className="text-arete-muted text-xs mt-2">
            Make sure the backend server is running on{' '}
            <code className="text-arete-gold">localhost:3000</code>.
          </p>
        </div>
      )}

      {/* Market grid */}
      {!loading && !error && (
        <>
          {displayed.length === 0 ? (
            <p className="text-arete-muted text-sm text-center py-12">
              No markets found for the selected filter.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayed.map(market => (
                <MarketCard key={market.id ?? market.conditionId} market={market} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Methodology footnote */}
      <div className="mt-10 border-t border-arete-border pt-6">
        <p className="text-arete-muted text-xs leading-relaxed">
          <span className="text-arete-gold font-semibold">Signal methodology: </span>
          Composite score = UVR (25%) + Price Impact (20%) + OFI (20%) + Time Proximity (15%) + HHI (20%).
          Signals fire at score ≥ 60. HIGH ≥ 70 · MEDIUM 40–69 · LOW &lt; 40.
          All computations are server-side from Polymarket&apos;s Gamma and CLOB APIs.
        </p>
      </div>
    </div>
  );
}

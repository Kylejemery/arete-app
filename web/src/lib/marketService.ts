import type { MarketsApiResponse, PolymarketMarket } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * Fetch all active Polymarket markets with computed insider-trading signals.
 * Calls GET /api/markets on the Express backend, which in turn fetches
 * from Polymarket's Gamma and CLOB APIs and computes the statistical signals.
 */
export async function fetchMarkets(): Promise<PolymarketMarket[]> {
  const res = await fetch(`${API_BASE_URL}/api/markets`);
  if (!res.ok) {
    throw new Error(`Failed to fetch markets: ${res.status} ${res.statusText}`);
  }
  const data: MarketsApiResponse = await res.json();
  return data.markets;
}

/**
 * Request a Claude AI analysis of a market's insider-trading signals.
 * Calls POST /api/analyze on the Express backend with the full signals
 * breakdown so Claude has rich statistical context to reason from.
 */
export async function analyzeMarket(market: PolymarketMarket): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market }),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // Extract text from Claude's response format
  return data?.content?.[0]?.text ?? 'No analysis returned.';
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
console.log('Key starts with:', CLAUDE_API_KEY?.slice(0, 15));

app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================
// POLYMARKET INSIDER TRADING DETECTION — HELPER FUNCTIONS
// ============================================================

/**
 * calculateUVR — Unusual Volume Ratio (weight: 25%)
 *
 * Compares the last 24h trading volume against a 6-day historical daily
 * average (days 1–7 before now). A spike of 3x or more is suspicious;
 * 5x or more scores 100. Informed traders often accumulate positions
 * quietly and then trade heavily once they have high conviction.
 *
 * @param {Array} trades - Array of trade objects from the CLOB API
 * @returns {number} Normalized score 0–100
 */
function calculateUVR(trades) {
  if (!trades || trades.length === 0) return 0;

  const now = Date.now() / 1000; // unix seconds
  const oneDayAgo = now - 86400;
  const sevenDaysAgo = now - 7 * 86400;

  // Recent 24h volume
  const recentVolume = trades
    .filter(t => t.timestamp >= oneDayAgo)
    .reduce((sum, t) => sum + (parseFloat(t.size) || 0), 0);

  // Historical daily average over the prior 6 days
  const historicalVolume = trades
    .filter(t => t.timestamp >= sevenDaysAgo && t.timestamp < oneDayAgo)
    .reduce((sum, t) => sum + (parseFloat(t.size) || 0), 0);

  const historicalDailyAvg = historicalVolume / 6;

  if (historicalDailyAvg === 0) {
    // No historical baseline — moderate score if there is any recent volume
    return recentVolume > 0 ? 50 : 0;
  }

  const ratio = recentVolume / historicalDailyAvg;
  // 1x = 20, 3x = 60, 5x = 100 (capped)
  const score = Math.min(100, Math.round((ratio / 5) * 100));
  return score;
}

/**
 * calculatePriceImpact — Price Impact Score (weight: 20%)
 *
 * Measures price movement per dollar of volume traded (Δprice / volume).
 * High price movement per dollar indicates directional, informed trading
 * where a relatively small amount of capital moves the market significantly.
 *
 * @param {Array} trades - Array of trade objects from the CLOB API
 * @returns {number} Normalized score 0–100
 */
function calculatePriceImpact(trades) {
  if (!trades || trades.length < 2) return 0;

  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const prices = sorted.map(t => parseFloat(t.price) || 0).filter(p => p > 0);

  if (prices.length < 2) return 0;

  const deltaPrice = Math.abs(prices[prices.length - 1] - prices[0]);
  const totalVolume = trades.reduce((sum, t) => sum + (parseFloat(t.size) || 0), 0);

  if (totalVolume === 0) return 0;

  // Impact ratio: probability change per $1,000 traded
  const impactRatio = deltaPrice / (totalVolume / 1000);
  // Full probability swing ($1 change) per $1k traded = score 100
  const score = Math.min(100, Math.round(impactRatio * 100));
  return score;
}

/**
 * calculateOFI — Order Flow Imbalance (weight: 20%)
 *
 * Measures the imbalance between buy-side and sell-side volume.
 * When 80%+ of activity is one-directional, it suggests informed traders
 * are all positioning the same way — a hallmark of insider-driven flow.
 *
 * @param {Array} trades - Array of trade objects from the CLOB API
 * @returns {number} Normalized score 0–100 (50 = balanced, 100 = fully one-sided)
 */
function calculateOFI(trades) {
  if (!trades || trades.length === 0) return 0;

  let buyVolume = 0;
  let sellVolume = 0;

  for (const trade of trades) {
    const size = parseFloat(trade.size) || 0;
    if (trade.side === 'BUY') {
      buyVolume += size;
    } else {
      sellVolume += size;
    }
  }

  const totalVolume = buyVolume + sellVolume;
  if (totalVolume === 0) return 0;

  const dominantSide = Math.max(buyVolume, sellVolume);
  const imbalanceRatio = dominantSide / totalVolume; // 0.5 = balanced, 1.0 = fully one-sided

  // Linear scale: ratio 0.5 → score 0, ratio 1.0 → score 100
  const score = Math.max(0, Math.round((imbalanceRatio - 0.5) * 200));
  return Math.min(100, score);
}

/**
 * calculateTimeProximity — Time-to-Resolution Proximity (weight: 15%)
 *
 * Detects heavy trading volume concentrated in the 24–72 hour window
 * before market resolution. Insiders trade when their edge is most
 * valuable: close to the resolution date but before the event is public.
 * This signal amplifies all others when present.
 *
 * @param {Array} trades  - Array of trade objects from the CLOB API
 * @param {string} endDate - ISO date string of market resolution
 * @returns {number} Normalized score 0–100
 */
function calculateTimeProximity(trades, endDate) {
  if (!trades || trades.length === 0 || !endDate) return 0;

  const resolutionTs = new Date(endDate).getTime() / 1000;
  if (isNaN(resolutionTs)) return 0;

  const now = Date.now() / 1000;
  const windowStart = resolutionTs - 72 * 3600; // 72h before resolution
  const windowEnd = resolutionTs - 24 * 3600;   // 24h before resolution

  const totalVolume = trades.reduce((sum, t) => sum + (parseFloat(t.size) || 0), 0);
  if (totalVolume === 0) return 0;

  const windowVolume = trades
    .filter(t => t.timestamp >= windowStart && t.timestamp <= windowEnd)
    .reduce((sum, t) => sum + (parseFloat(t.size) || 0), 0);

  // Add a bonus if we are currently within the critical proximity window
  const proximityBonus = now >= windowStart ? 20 : 0;

  // Base score from fraction of total volume in the 48h proximity window
  const baseScore = Math.round((windowVolume / totalVolume) * 80);
  return Math.min(100, baseScore + proximityBonus);
}

/**
 * calculateHHI — Trade Size Concentration / Herfindahl-Hirschman Index (weight: 20%)
 *
 * The HHI is an economics measure of market concentration. Applied here to
 * individual trade sizes: a market dominated by a few very large trades
 * scores near 100 (whale/insider behavior), while many small retail trades
 * score near 0. HHI = Σ(market_share²), ranging from 1/n (equal trades)
 * to 1.0 (single dominant trade).
 *
 * @param {Array} trades - Array of trade objects from the CLOB API
 * @returns {number} Normalized score 0–100
 */
function calculateHHI(trades) {
  if (!trades || trades.length === 0) return 0;

  const sizes = trades.map(t => parseFloat(t.size) || 0).filter(s => s > 0);
  if (sizes.length === 0) return 0;
  if (sizes.length === 1) return 100; // single trade = maximum concentration

  const totalVolume = sizes.reduce((sum, s) => sum + s, 0);
  if (totalVolume === 0) return 0;

  // Raw HHI: sum of squared market shares
  const hhi = sizes.reduce((sum, size) => {
    const share = size / totalVolume;
    return sum + share * share;
  }, 0);

  // Minimum possible HHI for n equal-sized trades
  const minHHI = 1 / sizes.length;

  // Normalize to 0–1 range, then scale to 0–100
  const normalizedHHI = (hhi - minHHI) / (1 - minHHI);
  return Math.min(100, Math.round(normalizedHHI * 100));
}

/**
 * calculateCompositeScore — Weighted composite confidence score (0–100)
 *
 * Combines all 5 signals using their statistical weights:
 *   UVR: 25% | PriceImpact: 20% | OFI: 20% | TimeProximity: 15% | HHI: 20%
 *
 * @param {{ uvr, priceImpact, ofi, timeProximity, hhi }} signals - Raw scores 0–100
 * @returns {number} Composite score 0–100 (integer)
 */
function calculateCompositeScore(signals) {
  const { uvr, priceImpact, ofi, timeProximity, hhi } = signals;
  const score =
    (uvr * 0.25) +
    (priceImpact * 0.20) +
    (ofi * 0.20) +
    (timeProximity * 0.15) +
    (hhi * 0.20);
  return Math.round(score);
}

/**
 * getSignalLevel — Maps a composite score to a human-readable severity level.
 * HIGH (≥70): Strong multi-signal insider pattern
 * MEDIUM (40–69): Moderate suspicion warranting attention
 * LOW (<40): No significant pattern detected
 */
function getSignalLevel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

// ============================================================
// END HELPER FUNCTIONS
// ============================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { system, messages, max_tokens, model } = req.body;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  if (max_tokens !== undefined && (typeof max_tokens !== 'number' || max_tokens < 1)) {
    return res.status(400).json({ error: 'max_tokens must be a positive integer' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: max_tokens || 1500,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

/**
 * GET /api/markets
 *
 * Fetches active prediction markets from Polymarket's Gamma API, then
 * retrieves individual trade-level data from the CLOB API for each market.
 * Computes all 5 statistical insider-trading signals and a composite
 * confidence score (0–100) for each market.
 */
app.get('/api/markets', async (req, res) => {
  try {
    // Fetch active markets from the Polymarket Gamma API
    const gammaRes = await fetch('https://gamma-api.polymarket.com/markets?active=true&limit=20');
    if (!gammaRes.ok) {
      throw new Error(`Gamma API error: ${gammaRes.status}`);
    }
    const rawMarkets = await gammaRes.json();
    const marketsArray = Array.isArray(rawMarkets)
      ? rawMarkets
      : (rawMarkets.markets || []);

    // Process each market: fetch trades, compute signals
    const markets = await Promise.all(
      marketsArray.slice(0, 20).map(async (market) => {
        let trades = [];
        const conditionId = market.conditionId || market.condition_id;

        if (conditionId) {
          try {
            const clobRes = await fetch(
              `https://clob.polymarket.com/trades?market=${conditionId}`
            );
            if (clobRes.ok) {
              const clobData = await clobRes.json();
              trades = Array.isArray(clobData) ? clobData : (clobData.trades || []);
            }
          } catch (err) {
            console.warn(`Failed to fetch trades for ${conditionId}:`, err.message);
          }
        }

        // Compute all 5 insider-trading signals
        const uvrScore = calculateUVR(trades);
        const priceImpactScore = calculatePriceImpact(trades);
        const ofiScore = calculateOFI(trades);
        const timeProximityScore = calculateTimeProximity(
          trades,
          market.endDate || market.end_date_iso
        );
        const hhiScore = calculateHHI(trades);

        const rawSignals = {
          uvr: uvrScore,
          priceImpact: priceImpactScore,
          ofi: ofiScore,
          timeProximity: timeProximityScore,
          hhi: hhiScore,
        };

        const confidenceScore = calculateCompositeScore(rawSignals);
        const signalLevel = getSignalLevel(confidenceScore);

        return {
          id: market.id || conditionId,
          question: market.question,
          volume: market.volume || market.volumeNum || '0',
          endDate: market.endDate || market.end_date_iso,
          conditionId,
          confidenceScore,
          signalLevel,
          signals: {
            uvr: {
              score: uvrScore,
              label: 'Volume Spike',
              firing: uvrScore >= 60,
            },
            priceImpact: {
              score: priceImpactScore,
              label: 'Price Impact',
              firing: priceImpactScore >= 60,
            },
            ofi: {
              score: ofiScore,
              label: 'High OFI',
              firing: ofiScore >= 60,
            },
            timeProximity: {
              score: timeProximityScore,
              label: 'Near Resolution',
              firing: timeProximityScore >= 60,
            },
            hhi: {
              score: hhiScore,
              label: 'Whale Concentration',
              firing: hhiScore >= 60,
            },
          },
        };
      })
    );

    return res.json({ markets });
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return res.status(502).json({
      error: 'Failed to fetch market data',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze
 *
 * Passes a market's full signals breakdown to Claude, giving it rich
 * statistical context to reason about potential insider trading activity.
 *
 * Request body:
 *   { market: MarketObject, signals: SignalsObject, messages: ClaudeMessages[] }
 */
app.post('/api/analyze', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { market, messages } = req.body;

  if (!market) {
    return res.status(400).json({ error: 'Missing required field: market' });
  }

  const signals = market.signals || {};

  const signalsSummary = `
Statistical Insider-Trading Signals:
- Unusual Volume Ratio (UVR):          ${signals.uvr?.score ?? 'N/A'}/100 — ${signals.uvr?.firing ? 'FIRING ⚠️' : 'normal'}
- Price Impact Score:                  ${signals.priceImpact?.score ?? 'N/A'}/100 — ${signals.priceImpact?.firing ? 'FIRING ⚠️' : 'normal'}
- Order Flow Imbalance (OFI):          ${signals.ofi?.score ?? 'N/A'}/100 — ${signals.ofi?.firing ? 'FIRING ⚠️' : 'normal'}
- Time-to-Resolution Proximity:        ${signals.timeProximity?.score ?? 'N/A'}/100 — ${signals.timeProximity?.firing ? 'FIRING ⚠️' : 'normal'}
- Trade Size Concentration (HHI):      ${signals.hhi?.score ?? 'N/A'}/100 — ${signals.hhi?.firing ? 'FIRING ⚠️' : 'normal'}
- Composite Confidence Score:          ${market.confidenceScore ?? 'N/A'}/100 (${market.signalLevel ?? 'UNKNOWN'})`.trim();

  const systemPrompt = `You are an expert financial analyst specialising in prediction market surveillance and insider trading detection on Polymarket.

Market: "${market.question}"
Resolution Date: ${market.endDate || 'Unknown'}
Total Volume: $${market.volume || 0}

${signalsSummary}

Analyse whether this market shows credible signs of insider trading based on the statistical signals above. Reference the specific signals that are firing and explain what each suggests about the nature of the suspected informed activity. Keep your analysis concise (3–5 sentences).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 600,
        system: systemPrompt,
        messages: messages || [
          { role: 'user', content: 'Analyse this market for insider trading signals.' },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (CLAUDE_API_KEY) {
    console.log('CLAUDE_API_KEY is configured');
  } else {
    console.warn('WARNING: CLAUDE_API_KEY is not set');
  }
});

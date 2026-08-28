// server/agents/stoic-scout.js
//
// Stoic Reply Pipeline, stage 1: Scout. Pulls recent public posts matching
// distress-adjacent phrasings and writes them to reply_candidates as 'raw'.
// No LLM in this stage — it is a fetcher and a regex filter. Everything it
// writes still has to pass the Haiku safety gate and Sonnet scoring before a
// draft is ever attempted, and a human before anything is posted.
//
// v1 source: Hacker News (Algolia, free, no auth). The registry shape is here
// so Bluesky and Reddit land as additional adapters without touching the flow.
// Query list and filter bounds live in config/stoic-queries.yaml, not in code.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { createClient } = require('@supabase/supabase-js');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'stoic-queries.yaml');

function loadConfig() {
  const parsed = YAML.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) || {};
  return {
    queries: parsed.queries || [],
    filters: {
      min_age_hours: 2,
      max_age_days: 7,
      min_body_chars: 200,
      max_body_chars: 4000,
      max_comments: 50,
      ...(parsed.filters || {}),
    },
    limits: {
      max_new_candidates_per_run: 40,
      max_triage_per_run: 40,
      max_drafts_per_run: 8,
      ...(parsed.limits || {}),
    },
    reddit_allowlist: parsed.reddit_allowlist || [],
  };
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// HN bodies arrive HTML-encoded with <p> and <a> markup. Decode before the
// length filters so bounds apply to what a human would actually read.
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#x2F;|&#47;/g, '/')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// Algolia's match is fuzzy; require the phrase to literally appear, tolerating
// curly apostrophes/quotes and flexible whitespace.
function phrasePresent(phrase, text) {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/'/g, "['’]")
    .replace(/\s+/g, '\\s+');
  return new RegExp(escaped, 'i').test(text);
}

// --- Hacker News adapter -----------------------------------------------------

async function fetchHn(query, filters) {
  const nowSec = Math.floor(Date.now() / 1000);
  const newest = nowSec - filters.min_age_hours * 3600;
  const oldest = nowSec - filters.max_age_days * 86400;
  // Unquoted on purpose: HN Algolia ignores phrase quoting (no advancedSyntax)
  // and quoted queries return near-zero recall. Fetch loosely here; the
  // phrasePresent regex below does the exact-phrase filtering locally.
  // Stories AND comments: the distress phrasings live almost entirely in
  // comments (a week of story bodies yielded zero exact matches).
  const params = new URLSearchParams({
    query,
    tags: '(story,comment)',
    hitsPerPage: '50',
    numericFilters: `created_at_i>${oldest},created_at_i<${newest}`,
  });
  const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?${params}`);
  if (!res.ok) throw new Error(`HN Algolia ${res.status}`);
  const json = await res.json();

  const rows = [];
  for (const hit of json.hits || []) {
    const isComment = hit.comment_text != null;
    const body = stripHtml(isComment ? hit.comment_text : hit.story_text || '');
    const title = isComment ? '' : hit.title || '';
    if (body.length < filters.min_body_chars || body.length > filters.max_body_chars) continue;
    // Crowded-thread filter, when thread size is known (story hits only —
    // a reply to a comment nests under it, so crowding matters less there).
    if (hit.num_comments != null && hit.num_comments >= filters.max_comments) continue;
    if (!phrasePresent(query, `${title}\n${body}`)) continue;
    rows.push({
      platform: 'hn',
      platform_post_id: String(hit.objectID),
      author_handle: hit.author || 'unknown',
      permalink: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      body: title ? `${title}\n\n${body}` : body,
      parent_context: isComment && hit.story_title ? `HN thread: ${hit.story_title}` : null,
      comment_count: hit.num_comments ?? null,
      matched_query: query,
      posted_at: new Date(hit.created_at_i * 1000).toISOString(),
    });
  }
  return rows;
}

// Adapter registry. Bluesky and Reddit are v2 — add a fetcher here and (for
// Reddit) honor reddit_allowlist from the config before writing any row.
const SOURCES = {
  hn: fetchHn,
};

// --- Run ---------------------------------------------------------------------

async function runStoicScout(config = loadConfig()) {
  const supabase = getSupabase();
  const summary = { fetched: 0, inserted: 0, perQuery: {}, errors: [] };
  const seenThisRun = new Set();
  let candidates = [];

  for (const [sourceName, fetcher] of Object.entries(SOURCES)) {
    for (const query of config.queries) {
      try {
        const rows = await fetcher(query, config.filters);
        summary.fetched += rows.length;
        summary.perQuery[`${sourceName}:${query}`] = rows.length;
        for (const row of rows) {
          const key = `${row.platform}:${row.platform_post_id}`;
          if (seenThisRun.has(key)) continue; // same post can match two phrases
          seenThisRun.add(key);
          candidates.push(row);
        }
      } catch (err) {
        console.error(`[stoic-scout] ${sourceName} "${query}" failed:`, err.message);
        summary.errors.push(`${sourceName} "${query}": ${err.message}`);
      }
    }
  }

  candidates = candidates.slice(0, config.limits.max_new_candidates_per_run);

  if (candidates.length > 0) {
    // ignoreDuplicates makes re-runs idempotent: anything already in
    // reply_candidates (whatever its status) is silently skipped.
    const { data, error } = await supabase
      .from('reply_candidates')
      .upsert(candidates, { onConflict: 'platform,platform_post_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(`reply_candidates upsert: ${error.message}`);
    summary.inserted = (data || []).length;
  }

  console.log(`[stoic-scout] fetched ${summary.fetched}, inserted ${summary.inserted} new candidates`);
  return summary;
}

module.exports = { runStoicScout, loadConfig, stripHtml, phrasePresent };

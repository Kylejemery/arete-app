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
    bluesky: parsed.bluesky || {},
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

// --- Bluesky adapter ---------------------------------------------------------
//
// app.bsky.feed.searchPosts requires auth (the public AppView 403s search).
// Reuses the Content Scheduler's env vars: BLUESKY_HANDLE + BLUESKY_APP_PASSWORD
// (+ optional BLUESKY_SERVICE for a custom PDS). Without them the adapter
// skips quietly so an HN-only deployment keeps working.

async function createBskySession() {
  const identifier = process.env.BLUESKY_HANDLE?.trim().replace(/^@+/, '');
  const password = process.env.BLUESKY_APP_PASSWORD?.trim();
  if (!identifier || !password) return null;
  const service = process.env.BLUESKY_SERVICE || 'https://bsky.social';
  const res = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`Bluesky auth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return { service, accessJwt: json.accessJwt };
}

// One session per run, shared across queries via ctx; a failed login logs once
// and turns every Bluesky query into a no-op instead of ten repeated errors.
async function getBskySession(ctx) {
  if (ctx.bskySession === undefined) {
    try {
      ctx.bskySession = await createBskySession();
      if (!ctx.bskySession) console.log('[stoic-scout] bluesky skipped: BLUESKY_HANDLE / BLUESKY_APP_PASSWORD not set');
    } catch (err) {
      console.error('[stoic-scout] bluesky auth failed:', err.message);
      ctx.bskySession = null;
    }
  }
  return ctx.bskySession;
}

function bskyPermalink(uri, handle) {
  const rkey = String(uri).split('/').pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

// For kept rows that are replies, hydrate the parent post so triage and the
// drafter see what the person was responding to. Batched (getPosts caps at 25).
async function hydrateBskyParents(session, rows, parentUris) {
  const uris = [...new Set(parentUris.values())].slice(0, 25);
  if (uris.length === 0) return;
  const params = new URLSearchParams();
  uris.forEach(u => params.append('uris', u));
  const res = await fetch(`${session.service}/xrpc/app.bsky.feed.getPosts?${params}`, {
    headers: { Authorization: `Bearer ${session.accessJwt}` },
  });
  if (!res.ok) return; // parent context is best-effort
  const byUri = new Map(((await res.json()).posts || []).map(p => [p.uri, p]));
  for (const row of rows) {
    const parent = byUri.get(parentUris.get(row.platform_post_id));
    if (parent?.record?.text) {
      row.parent_context = `@${parent.author?.handle ?? 'unknown'}: ${parent.record.text}`;
    }
  }
}

async function fetchBluesky(query, filters, ctx) {
  const session = await getBskySession(ctx);
  if (!session) return [];

  const now = Date.now();
  const params = new URLSearchParams({
    q: `"${query}"`, // searchPosts honors quoted phrases (unlike HN Algolia)
    sort: 'latest',
    limit: '50',
    since: new Date(now - filters.max_age_days * 86400000).toISOString(),
    until: new Date(now - filters.min_age_hours * 3600000).toISOString(),
  });
  const res = await fetch(`${session.service}/xrpc/app.bsky.feed.searchPosts?${params}`, {
    headers: { Authorization: `Bearer ${session.accessJwt}` },
  });
  if (!res.ok) throw new Error(`Bluesky search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();

  const rows = [];
  const parentUris = new Map();
  for (const post of json.posts || []) {
    const record = post.record || {};
    const body = (record.text || '').trim();
    const handle = post.author?.handle;
    if (!handle) continue;
    if (Array.isArray(record.langs) && record.langs.length && !record.langs.includes('en')) continue;
    if (body.length < filters.min_body_chars || body.length > filters.max_body_chars) continue;
    if ((post.replyCount ?? 0) >= filters.max_comments) continue;
    if (!phrasePresent(query, body)) continue;
    const row = {
      platform: 'bluesky',
      platform_post_id: post.uri,
      author_handle: handle,
      permalink: bskyPermalink(post.uri, handle),
      body,
      parent_context: null,
      comment_count: post.replyCount ?? 0,
      matched_query: query,
      posted_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
    };
    if (record.reply?.parent?.uri) parentUris.set(post.uri, record.reply.parent.uri);
    rows.push(row);
  }

  try {
    await hydrateBskyParents(session, rows, parentUris);
  } catch { /* best-effort */ }
  return rows;
}

// Adapter registry. Reddit is v2 — add a fetcher here and honor
// reddit_allowlist from the config before writing any row.
const SOURCES = {
  hn: fetchHn,
  bluesky: fetchBluesky,
};

// --- Run ---------------------------------------------------------------------

async function runStoicScout(config = loadConfig()) {
  const supabase = getSupabase();
  const summary = { fetched: 0, inserted: 0, perQuery: {}, errors: [] };
  const seenThisRun = new Set();
  const ctx = {}; // per-run shared state (e.g. the Bluesky session)
  let candidates = [];

  for (const [sourceName, fetcher] of Object.entries(SOURCES)) {
    // Sources can override filter bounds (Bluesky caps posts at 300 chars,
    // so the global 200-char floor would exclude nearly everything).
    const filters = { ...config.filters, ...(config[sourceName] || {}) };
    for (const query of config.queries) {
      try {
        const rows = await fetcher(query, filters, ctx);
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

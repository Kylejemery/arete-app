// academy/corpus-ingestion/seed-queue.js
// Seeds corpus_ingestion_queue with the starter list of public-domain texts.
// Idempotent: checks (author, work) before inserting, so re-running never
// duplicates a row or resets the status of one already processed.
//
// Each source URL is fetched and sanity-checked before insert. A URL that
// clearly 404s / returns an HTML error page is inserted as status 'failed'
// with an error_message, so a dead Gutenberg id surfaces for Kyle to fix
// rather than silently vanishing. If the fetch can't run (network-restricted
// sandbox), the row is still inserted as 'pending' — the real fetch happens at
// runtime on Railway, which has open egress.
//
// Usage: node seed-queue.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STARTER_SOURCES = [
  // --- Eastern philosophy (public domain translations) ---
  { author: 'Confucius', work: 'The Analects', language: 'en',
    source_url: 'https://www.gutenberg.org/cache/epub/3330/pg3330.txt',
    source_type: 'public_domain', priority: 10,
    notes: 'Legge translation, 1861. New domain — Eastern virtue ethics.' },
  { author: 'Laozi', work: 'Tao Te Ching', language: 'en',
    source_url: 'https://www.gutenberg.org/cache/epub/216/pg216.txt',
    source_type: 'public_domain', priority: 10,
    notes: 'Legge translation.' },
  { author: 'Sun Tzu', work: 'The Art of War', language: 'en',
    source_url: 'https://www.gutenberg.org/cache/epub/132/pg132.txt',
    source_type: 'public_domain', priority: 20,
    notes: 'Giles translation, 1910. Strategy / leadership domain.' },

  // --- Stoic / classical gaps ---
  { author: 'Michel de Montaigne', work: 'Essays', language: 'en',
    source_url: 'https://www.gutenberg.org/cache/epub/3600/pg3600.txt',
    source_type: 'public_domain', priority: 30,
    notes: 'Cotton translation. Already flagged for ingestion in roadmap.' },
  { author: 'Adam Smith', work: 'The Theory of Moral Sentiments', language: 'en',
    source_url: 'https://www.gutenberg.org/cache/epub/58559/pg58559.txt',
    source_type: 'public_domain', priority: 40,
    notes: 'Moral philosophy, sympathy, impartial spectator.' },
];

const MIN_BODY_BYTES = 4096; // a real text body is far larger than this

/**
 * Verifies a URL returns plausible plaintext.
 * Returns { ok: true } | { ok: false, reason } | { ok: null, reason }
 * where ok:null means verification could not run (network restricted) and the
 * row should still be queued as 'pending'.
 */
async function verifyUrl(url) {
  if (typeof fetch !== 'function') {
    return { ok: null, reason: 'fetch unavailable in this runtime' };
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AreteCorpusAgent/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status} for ${url}` };
    }
    const body = await res.text();
    if (body.length < MIN_BODY_BYTES) {
      return { ok: false, reason: `body too small (${body.length} bytes) — likely an error page` };
    }
    // A Gutenberg plaintext file should not be an HTML document.
    const head = body.slice(0, 500).toLowerCase();
    if (head.includes('<!doctype html') || head.includes('<html')) {
      return { ok: false, reason: 'response looks like an HTML page, not plaintext' };
    }
    return { ok: true };
  } catch (err) {
    // Network blocked (sandbox) or timeout — can't determine; queue as pending.
    return { ok: null, reason: err.message || String(err) };
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  let inserted = 0, skipped = 0, verified = 0, failed = 0, unverified = 0;

  for (const src of STARTER_SOURCES) {
    // Check-before-insert keeps this idempotent and never resets progress.
    const { data: existing, error: lookupErr } = await supabase
      .from('corpus_ingestion_queue')
      .select('id, status')
      .eq('author', src.author)
      .eq('work', src.work)
      .maybeSingle();
    if (lookupErr) {
      console.error(`  lookup error for ${src.author} / ${src.work}: ${lookupErr.message}`);
      continue;
    }
    if (existing) {
      console.log(`[SKIP] ${src.author} / ${src.work} — already queued (status: ${existing.status})`);
      skipped++;
      continue;
    }

    const check = await verifyUrl(src.source_url);
    let status = 'pending';
    let error_message = null;
    if (check.ok === true) {
      verified++;
      console.log(`[OK]   ${src.author} / ${src.work} — URL verified`);
    } else if (check.ok === false) {
      status = 'failed';
      error_message = `URL verification failed: ${check.reason}`;
      failed++;
      console.log(`[BAD]  ${src.author} / ${src.work} — ${check.reason} (queued as failed)`);
    } else {
      unverified++;
      console.log(`[?]    ${src.author} / ${src.work} — verification skipped (${check.reason}); queued as pending`);
    }

    const { error: insertErr } = await supabase
      .from('corpus_ingestion_queue')
      .insert({
        source_url: src.source_url,
        author: src.author,
        work: src.work,
        language: src.language || 'en',
        course_relevance: src.course_relevance ?? null,
        difficulty: src.difficulty ?? null,
        source_type: src.source_type || 'public_domain',
        status,
        priority: src.priority ?? 100,
        notes: src.notes ?? null,
        error_message,
      });
    if (insertErr) {
      console.error(`  insert error for ${src.author} / ${src.work}: ${insertErr.message}`);
      continue;
    }
    inserted++;
  }

  console.log('\n=== Seed summary ===');
  console.log(`Inserted: ${inserted} | Skipped (already queued): ${skipped}`);
  console.log(`URL verified: ${verified} | URL bad (failed): ${failed} | Verification skipped: ${unverified}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});

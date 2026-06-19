// server/coverage-gap-agent.js
//
// Weekly Coverage Gap Agent — the third autonomous agent in the Arete AI Agent
// System. It detects two kinds of gaps and writes a single weekly report:
//
//   1. STRUCTURAL gaps — works the significance map says matter (by tier +
//      chunk threshold) but that the corpus covers thinly or not at all.
//   2. DEMAND gaps — themes users actually bring up (from journal_analysis)
//      that the corpus answers poorly. Before running a fresh semantic search
//      it consults the concept_passage_map learning layer, so Kyle's prior
//      approvals/rejections steer the verdict.
//
// It then recommends sources to queue (public-domain structural gaps that have
// a URL can auto-queue; summary-only and demand-driven gaps need a human).
//
// Standalone script (its own Railway cron service, Monday 05:00 ET). Mirrors
// journal-analysis-agent.js: raw fetch to OpenAI for embeddings, no SDKs.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DAY = 24 * 60 * 60 * 1000;

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the other agents.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// Embed a short string with text-embedding-3-small (same model the rest of the
// system uses). Returns the vector, or null on failure.
async function embed(text) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      console.error(`  embedding failed (${res.status}) for "${text}"`);
      return null;
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    console.error(`  embedding error for "${text}":`, e.message);
    return null;
  }
}

// --- 3a. Structural gap detection ------------------------------------------

async function detectStructuralGaps() {
  // Significance map is the source of truth after seeding.
  const { data: sigMap } = await supabase
    .from('corpus_significance_map')
    .select('*')
    .eq('active', true)
    .order('tier', { ascending: true });

  // Actual chunk counts per author+work, via the corpus_work_counts() RPC.
  // A plain select('author, work') is capped at 1000 rows by PostgREST and
  // undercounts the ~7,000-row corpus, producing false "absent" gaps.
  const { data: actualCounts } = await supabase.rpc('corpus_work_counts');

  const countMap = {};
  for (const row of actualCounts || []) {
    const key = `${row.author}|||${row.work}`;
    countMap[key] = Number(row.cnt);
  }

  const gaps = [];
  for (const entry of sigMap || []) {
    const key = `${entry.author}|||${entry.work}`;
    const actual = countMap[key] || 0;
    const deficit = entry.chunk_threshold - actual;
    if (deficit <= 0) continue;

    gaps.push({
      author: entry.author,
      work: entry.work,
      tier: entry.tier,
      actual_chunks: actual,
      threshold: entry.chunk_threshold,
      deficit,
      source_type: entry.source_type,
      notes: entry.notes,
      recommended_url: entry.recommended_url || null,
      severity: actual === 0
        ? 'absent'
        : deficit > entry.chunk_threshold * 0.5 ? 'critical' : 'low',
    });
  }

  // Absent first, then by tier, then by deficit.
  return gaps.sort((a, b) => {
    if (a.severity === 'absent' && b.severity !== 'absent') return -1;
    if (b.severity === 'absent' && a.severity !== 'absent') return 1;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.deficit - a.deficit;
  });
}

// --- 3b. Demand gap detection ----------------------------------------------

// Pull this concept's passages from the learning layer (excluding explicit
// rejections), in a consistent shape.
async function getConceptPassages(concept) {
  const { data } = await supabase
    .from('concept_passage_map')
    .select('chunk_id, author, work, chunk_text, approved, similarity_score')
    .eq('concept', concept)
    .not('approved', 'is', false);
  return data || [];
}

async function detectDemandGaps() {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const { data: analyses } = await supabase
    .from('journal_analysis')
    .select('themes, dominant_theme')
    .gte('created_at', since);

  if (!analyses || analyses.length === 0) {
    console.log('No journal analysis data in the last 30 days — skipping demand gap detection');
    return [];
  }

  // Aggregate theme frequencies across all users.
  const themeCounts = {};
  for (const analysis of analyses) {
    const themes = Array.isArray(analysis.themes) ? analysis.themes : [];
    for (const t of themes) {
      const theme = (t.theme || '').toLowerCase().trim();
      if (!theme) continue;
      themeCounts[theme] = (themeCounts[theme] || 0) + (t.count || 1);
    }
  }

  const topThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([theme, count]) => ({ theme, count }));

  const demandGaps = [];

  for (const { theme, count } of topThemes) {
    // Consult the learning layer first.
    let passages = await getConceptPassages(theme);
    let searchedFresh = false;

    // If fewer than 3 approved passages, run a fresh semantic search.
    if (passages.filter(p => p.approved === true).length < 3) {
      const embedding = await embed(theme);
      if (embedding) {
        const { data: retrieved } = await supabase.rpc('match_rag_corpus_ids', {
          query_embedding: embedding,
          match_count: 8,
        });
        searchedFresh = true;

        // Upsert newly retrieved passages as unreviewed (don't clobber prior
        // approvals — onConflict only fills the row if it's new).
        for (const chunk of retrieved || []) {
          const exists = passages.find(p => p.chunk_id === chunk.id);
          if (!exists) {
            await supabase
              .from('concept_passage_map')
              .upsert({
                concept: theme,
                chunk_id: chunk.id,
                author: chunk.author,
                work: chunk.work,
                chunk_text: chunk.chunk_text,
                similarity_score: chunk.similarity,
                approved: null,
              }, { onConflict: 'concept,chunk_id', ignoreDuplicates: true });
          }
        }

        // Re-read so the verdict uses a consistent shape including the new rows.
        passages = await getConceptPassages(theme);
      }
    }

    const approvedCount = passages.filter(p => p.approved === true).length;
    const highSimilarity = passages.filter(p => (p.similarity_score || 0) > 0.78).length;
    const coverageWeak = approvedCount < 2 || (searchedFresh && highSimilarity < 2);

    if (coverageWeak) {
      demandGaps.push({
        theme,
        user_frequency: count,
        approved_passages: approvedCount,
        total_retrieved: passages.length,
        passages_for_review: passages
          .slice()
          .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
          .slice(0, 6)
          .map(p => ({
            chunk_id: p.chunk_id,
            author: p.author,
            work: p.work,
            chunk_text: (p.chunk_text || '').substring(0, 200) + '...',
            similarity_score: p.similarity_score,
            approved: p.approved ?? null,
          })),
        coverage_verdict: approvedCount === 0 ? 'absent' : 'thin',
      });
    }

    // Gentle rate limit on the embedding endpoint.
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return demandGaps.sort((a, b) => b.user_frequency - a.user_frequency);
}

// --- 3c. Recommended additions ---------------------------------------------

async function generateRecommendations(structuralGaps, demandGaps) {
  // Don't re-recommend anything already in the ingestion queue.
  const { data: queued } = await supabase
    .from('corpus_ingestion_queue')
    .select('author, work')
    .in('status', ['pending', 'processing', 'done']);

  const queuedKeys = new Set((queued || []).map(r => `${r.author}|||${r.work}`));

  const recommendations = [];

  // Structural gaps — public_domain with a URL can auto-queue; others flagged
  // for manual handling (summary_only sources go through the admin corpus page).
  for (const gap of structuralGaps.slice(0, 8)) {
    const key = `${gap.author}|||${gap.work}`;
    if (queuedKeys.has(key)) continue;

    recommendations.push({
      author: gap.author,
      work: gap.work,
      reason: `Tier ${gap.tier} work — ${gap.severity === 'absent'
        ? 'completely absent from corpus'
        : `${gap.deficit} chunks below threshold`}`,
      source_type: gap.source_type,
      url: gap.recommended_url || null,
      priority: gap.tier * 10 + (gap.severity === 'absent' ? 0 : 5),
      can_auto_queue: gap.source_type === 'public_domain' && !!gap.recommended_url,
      approved: null,
      queued: false,
    });
  }

  // Demand gaps — a human has to pick the right source text.
  for (const gap of demandGaps.slice(0, 5)) {
    recommendations.push({
      theme: gap.theme,
      reason: `User demand: "${gap.theme}" appeared ${gap.user_frequency} times in user sessions — corpus coverage ${gap.coverage_verdict}`,
      source_type: 'demand_driven',
      url: null,
      priority: 50,
      can_auto_queue: false,
      approved: null,
      queued: false,
      suggested_action: `Find and queue primary source texts covering "${gap.theme}"`,
    });
  }

  return recommendations;
}

// --- 3d. Main loop ---------------------------------------------------------

async function runCoverageGapAgent() {
  const startTime = Date.now();
  console.log(`=== Coverage Gap Agent — ${new Date().toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set — demand gap detection will be skipped.');
  }

  const [structuralGaps, demandGaps] = await Promise.all([
    detectStructuralGaps(),
    detectDemandGaps(),
  ]);

  const recommendations = await generateRecommendations(structuralGaps, demandGaps);

  const reportWeek = getMondayOfCurrentWeek();

  const { error } = await supabase
    .from('corpus_gap_reports')
    .upsert({
      report_week: reportWeek,
      structural_gaps: structuralGaps,
      demand_gaps: demandGaps,
      recommended_additions: recommendations,
      status: 'pending_review',
      run_duration_ms: Date.now() - startTime,
    }, { onConflict: 'report_week' });

  if (error) {
    console.error('Failed to write gap report:', error.message);
    process.exit(1);
  }

  // Stdout summary — Railway logs double as the Monday-morning brief.
  console.log(`\n=== Gap Report — Week of ${reportWeek} ===`);
  console.log(`Structural gaps: ${structuralGaps.length} (${structuralGaps.filter(g => g.severity === 'absent').length} absent)`);
  console.log(`Demand gaps: ${demandGaps.length}`);
  console.log(`Recommendations: ${recommendations.length} (${recommendations.filter(r => r.can_auto_queue).length} auto-queueable)`);
  console.log(`\nTop structural gaps:`);
  structuralGaps.slice(0, 5).forEach(g =>
    console.log(`  ${g.severity.toUpperCase()} — ${g.author} / ${g.work} (${g.actual_chunks}/${g.threshold} chunks)`)
  );
  console.log(`\nTop demand gaps:`);
  demandGaps.slice(0, 5).forEach(g =>
    console.log(`  "${g.theme}" — ${g.user_frequency} user sessions, coverage: ${g.coverage_verdict}`)
  );
  console.log(`\nRun time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`======================================`);
}

runCoverageGapAgent().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

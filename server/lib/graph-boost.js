// ---------------------------------------------------------------------------
// Learning System Phase B — graph-boosted retrieval.
//
// After vector search returns its candidates, expand through the Hebbian
// graph: for each retrieved rag_corpus chunk, pull its strongest edges
// (weight >= EDGE_THRESHOLD) and add the connected chunks as candidates with
// boosted_score = source_similarity * edge_weight. Merge, dedupe, re-sort,
// truncate — passages that have proven useful ALONGSIDE what cosine found,
// even when cosine alone would miss them.
//
// Feature-flagged: GRAPH_BOOST=true. Callers log retrieval_mode so pure
// vector and graph-boosted requests are A/B comparable in retrieval_log.
// Fail-open: any error returns the original rows untouched.
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js');

const EDGE_THRESHOLD = 0.3;
const EDGES_PER_SOURCE = 3;

let _supabase = null;
function getSupabase() {
  if (!_supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

function graphBoostEnabled() {
  return process.env.GRAPH_BOOST === 'true';
}

/**
 * Expand match_rag_corpus-shaped rows ({ id, chunk_text, author, work,
 * similarity, ... }) through concept_edges. Returns { rows, boosted }:
 * rows re-sorted by score and truncated to k; boosted = how many
 * graph-sourced rows made the cut (0 means the output equals pure vector
 * search). Added rows carry _graphBoosted: true and their boosted score as
 * `similarity` so downstream mapping and logging treat them uniformly.
 */
async function expandCandidates(rows, k) {
  if (!graphBoostEnabled()) return { rows, boosted: 0 };
  try {
    const supabase = getSupabase();
    const sources = (rows ?? []).filter(r => r?.id && typeof r.similarity === 'number');
    if (!supabase || sources.length === 0) return { rows, boosted: 0 };
    const sourceIds = sources.map(r => r.id);

    // Edges touching any retrieved chunk, strongest first. chunk_a < chunk_b
    // is canonical, so match both columns.
    const { data: edges, error } = await supabase
      .from('concept_edges')
      .select('chunk_a, chunk_b, weight')
      .gte('weight', EDGE_THRESHOLD)
      .or(`chunk_a.in.(${sourceIds.join(',')}),chunk_b.in.(${sourceIds.join(',')})`)
      .order('weight', { ascending: false })
      .limit(sourceIds.length * EDGES_PER_SOURCE * 4);
    if (error || !edges || edges.length === 0) return { rows, boosted: 0 };

    const simById = new Map(sources.map(r => [r.id, r.similarity]));
    const already = new Set(sourceIds);
    const perSource = new Map();   // source id -> edges taken
    const candidates = new Map();  // neighbour id -> best boosted score
    for (const e of edges) {
      const src = simById.has(e.chunk_a) ? e.chunk_a : e.chunk_b;
      const neighbour = src === e.chunk_a ? e.chunk_b : e.chunk_a;
      if (!simById.has(src) || already.has(neighbour)) continue;
      const taken = perSource.get(src) ?? 0;
      if (taken >= EDGES_PER_SOURCE) continue;
      perSource.set(src, taken + 1);
      const score = simById.get(src) * e.weight;
      if (score > (candidates.get(neighbour) ?? -1)) candidates.set(neighbour, score);
    }
    if (candidates.size === 0) return { rows, boosted: 0 };

    const { data: chunkRows, error: cErr } = await supabase
      .from('rag_corpus')
      .select('id, chunk_text, author, work, language, section_label, text_type, source_url')
      .in('id', [...candidates.keys()]);
    if (cErr || !chunkRows) return { rows, boosted: 0 };

    const merged = [
      ...rows,
      ...chunkRows.map(c => ({ ...c, similarity: candidates.get(c.id), _graphBoosted: true })),
    ];
    merged.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
    const out = merged.slice(0, k);
    return { rows: out, boosted: out.filter(r => r._graphBoosted).length };
  } catch (err) {
    console.warn('[graph-boost] expansion failed, serving pure vector results:', err?.message);
    return { rows, boosted: 0 };
  }
}

module.exports = { expandCandidates, graphBoostEnabled };

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
// The walk runs `depth` times (GRAPH_BOOST_DEPTH, default 1 = the original
// single hop). Depth is the retrieval-space analogue of recurrent depth: the
// same block applied n times to a growing candidate set, so a hard question
// can be given more search without more parameters. Each hop is a pair of
// round trips, so the ceiling is low on purpose — this buys reach, not
// latency.
//
// Feature-flagged: GRAPH_BOOST=true. Callers log retrievalMode() so vector
// and each depth are A/B comparable in retrieval_log.retrieval_mode
// ('vector' | 'graph_boost' | 'graph_boost_n2' | ...).
// Fail-open: any error returns the original rows untouched.
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js');

// An edge qualifies once it has been co-retrieved enough times to be more
// than coincidence. apply_hebbian_edge EMAs weight toward the response's
// outcome score, so weight_n = score * (1 - (1 - learning_rate)^n) and the
// score is the ceiling, not a waypoint. At the observed mean outcome score
// (0.42) and learning_rate 0.1 that puts the old 0.3 about twelve repeat
// co-retrievals of the same pair away — no edge had come close after a month
// of firing, and a pair whose responses average below 0.3 could never have
// qualified at all. 0.1 is ~3 repeats, which is the bar
// decay_concept_edges already uses (min_co_retrievals) to call an edge
// established rather than prune it, so the read gate and the prune gate now
// agree. Lower would admit single co-retrievals, which is the noise that bar
// exists to exclude.
const EDGE_THRESHOLD = 0.1;
const EDGES_PER_SOURCE = 3;
// Each hop costs an edge query plus a chunk query. Past a few hops the walk
// has left the neighbourhood of the question anyway: scores decay
// multiplicatively, so a depth-5 row is a rounding error next to a vector hit.
const MAX_DEPTH = 4;

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

function clampDepth(n) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_DEPTH);
}

/** Configured hop count. GRAPH_BOOST_DEPTH unset or junk means 1. */
function graphBoostDepth() {
  return clampDepth(Number.parseInt(process.env.GRAPH_BOOST_DEPTH ?? '1', 10));
}

/**
 * The retrieval_log.retrieval_mode label for the current configuration, so a
 * depth change is visible in the A/B rather than hiding inside 'graph_boost'.
 * The column is free text — new labels need no migration.
 */
function retrievalMode() {
  if (!graphBoostEnabled()) return 'vector';
  const depth = graphBoostDepth();
  return depth > 1 ? `graph_boost_n${depth}` : 'graph_boost';
}

/**
 * One hop. Takes the frontier rows, returns the rows newly reached from them
 * — already fenced, already free of deprecated rows. Mutates `visited` with
 * every id considered, so no later hop pays for it again.
 *
 * Returns null when the hop never got as far as a chunk set (no edges, no
 * unvisited neighbours, or a failed query) and an array — possibly empty
 * after the fence — when it did. The caller needs the difference: on hop 1
 * null is what makes this fail open exactly where the single-hop version
 * did, handing back the caller's rows untouched.
 *
 * The fence is applied HERE rather than at the end because a fenced row that
 * survives a hop would seed the next one: the final filter would drop it and
 * keep everything it dragged in. At depth 1 filtering here and filtering at
 * the end agree; past that they do not, and only this is a fence.
 */
async function walkOnce(supabase, frontier, visited, fence) {
  const frontierIds = frontier.map(r => r.id);
  const scoreById = new Map(frontier.map(r => [r.id, r.similarity]));

  // Edges touching any frontier chunk, strongest first. chunk_a < chunk_b
  // is canonical, so match both columns.
  const { data: edges, error } = await supabase
    .from('concept_edges')
    .select('chunk_a, chunk_b, weight')
    .gte('weight', EDGE_THRESHOLD)
    .or(`chunk_a.in.(${frontierIds.join(',')}),chunk_b.in.(${frontierIds.join(',')})`)
    .order('weight', { ascending: false })
    .limit(frontierIds.length * EDGES_PER_SOURCE * 4);
  if (error || !edges || edges.length === 0) return null;

  const perSource = new Map();   // source id -> edges taken
  const candidates = new Map();  // neighbour id -> best boosted score
  for (const e of edges) {
    const src = scoreById.has(e.chunk_a) ? e.chunk_a : e.chunk_b;
    const neighbour = src === e.chunk_a ? e.chunk_b : e.chunk_a;
    if (!scoreById.has(src) || visited.has(neighbour)) continue;
    const taken = perSource.get(src) ?? 0;
    if (taken >= EDGES_PER_SOURCE) continue;
    perSource.set(src, taken + 1);
    // A hop never scores above the row it came from. Edge weight is an EMA
    // toward a 0..1 outcome score so it is <= 1 in practice and this is a
    // no-op, but nothing in the schema enforces that, and an unbounded weight
    // would make score climb with depth instead of decay — the walk would
    // wander away from the question and outrank the vector hits.
    const score = Math.min(scoreById.get(src) * e.weight, scoreById.get(src));
    if (score > (candidates.get(neighbour) ?? -1)) candidates.set(neighbour, score);
  }
  if (candidates.size === 0) return null;
  for (const id of candidates.keys()) visited.add(id);

  const { data: chunkRows, error: cErr } = await supabase
    .from('rag_corpus')
    .select('id, chunk_text, author, work, language, section_label, text_type, source_url')
    .eq('deprecated', false)
    .in('id', [...candidates.keys()]);
  if (cErr || !chunkRows) return null;

  return chunkRows
    .map(c => ({ ...c, similarity: candidates.get(c.id), _graphBoosted: true }))
    .filter(fence);
}

/**
 * Expand match_rag_corpus-shaped rows ({ id, chunk_text, author, work,
 * similarity, ... }) through concept_edges. Returns { rows, boosted, depth }:
 * rows re-sorted by score and truncated to k; boosted = how many
 * graph-sourced rows made the cut (0 means the output equals pure vector
 * search); depth = hops actually configured for this call. Added rows carry
 * _graphBoosted: true, the hop that found them as _graphHop, and their
 * boosted score as `similarity` so downstream mapping and logging treat them
 * uniformly.
 *
 * Neighbours come straight from rag_corpus rather than through
 * match_rag_corpus, so the two guarantees that RPC carries have to be
 * restated here:
 *
 *   deprecated  filtered in the neighbour query. Without it a superseded
 *               ingest re-enters retrieval through an edge to its own
 *               replacement — the near-duplicate text that makes a strong
 *               edge is exactly what deprecation is meant to retire.
 *   fence       opts.fence is the caller's text_type fence
 *               (server/lib/corpus-fence.js), applied per hop and again
 *               before truncation. Filtering only after the slice lets a
 *               fenced neighbour hold a top-k slot and then vanish, so the
 *               caller gets fewer than k rows and loses the eligible row it
 *               displaced. Concordance chunks are retrieval bridges and so
 *               are the likeliest thing an edge walk surfaces, which makes
 *               this worst on the counselor fence that excludes them.
 *
 * Callers keep their own post-filter. It is what fences the untouched rows
 * the early returns hand back whenever boosting is off or the walk finds
 * nothing, and it keeps the fence visible at the call site.
 *
 * @param {Array} rows candidate rows from vector search
 * @param {number} k max rows to return, and the width of each hop's frontier
 * @param {object} [opts]
 * @param {(row: object) => boolean} [opts.fence] row predicate. Defaults to
 *   allowing everything, which is only correct for an unfenced research
 *   caller — every fenced surface passes its own.
 * @param {number} [opts.depth] hops to walk, clamped to 1..MAX_DEPTH.
 *   Defaults to GRAPH_BOOST_DEPTH. depth 1 is the original single hop.
 */
async function expandCandidates(rows, k, opts = {}) {
  const depth = opts.depth == null ? graphBoostDepth() : clampDepth(opts.depth);
  if (!graphBoostEnabled()) return { rows, boosted: 0, depth };
  try {
    const supabase = getSupabase();
    const sources = (rows ?? []).filter(r => r?.id && typeof r.similarity === 'number');
    if (!supabase || sources.length === 0) return { rows, boosted: 0, depth };

    const fence = typeof opts.fence === 'function' ? opts.fence : () => true;
    const visited = new Set(sources.map(r => r.id));
    const reached = [];
    let frontier = sources;

    for (let hop = 1; hop <= depth && frontier.length > 0; hop++) {
      const next = await walkOnce(supabase, frontier, visited, fence);
      // Hop 1 found nothing to build on: fail open with the caller's rows
      // untouched, as the single-hop version did. A later hop coming back
      // empty just ends the walk — hop 1's rows are still worth returning.
      if (next === null) {
        if (hop === 1) return { rows, boosted: 0, depth };
        break;
      }
      for (const row of next) reached.push({ ...row, _graphHop: hop });
      // Bound the frontier the way k bounds the output. Unbounded, hop 2
      // would fan out over everything hop 1 touched; scores decay anyway, so
      // the rows that would not have made the cut are not worth walking from.
      next.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
      frontier = next.slice(0, k);
    }

    const eligible = [...rows, ...reached].filter(fence);
    eligible.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
    const out = eligible.slice(0, k);
    return { rows: out, boosted: out.filter(r => r._graphBoosted).length, depth };
  } catch (err) {
    console.warn('[graph-boost] expansion failed, serving pure vector results:', err?.message);
    return { rows, boosted: 0, depth };
  }
}

module.exports = { expandCandidates, graphBoostEnabled, graphBoostDepth, retrievalMode, MAX_DEPTH };

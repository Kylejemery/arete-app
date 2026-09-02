// server/lib/corpus-fence.js
//
// The counselor fence: which rag_corpus text_types a counselor voice may never
// retrieve. A counselor voice is anything that speaks as a person or as the
// tradition and attributes what it says: the Cabinet (parallel and single),
// the Oracle, the /ask and OpenAI-compatible endpoints, the library debate,
// and the reader margin note. Editorial apparatus written in 2026 must not be
// quoted or attributed by Marcus, and once the modern philosophy of mind
// layer lands (docs/corpus/MODERN_LAYER_PROPOSAL.md) neither may Russell.
//
// The Synthesis, Inquiry, Tension, Dreaming, Dispatch, World, Convergence and
// Coverage Gap agents, the Scribe, the eval harness, and the corpus MCP tools
// are research surfaces and see everything.
//
// Chronology filtering (author_chronology, epistemic_cutoff_year) is not
// deployed (docs/corpus/EPISTEMIC_BOUNDARY_STATUS.md), so the fence is built
// on text_type. Add a value here and every counselor call site follows.

const COUNSELOR_EXCLUDED_TEXT_TYPES = Object.freeze([
  'concordance', // Arete Concordance entries: retrieval bridges, not sources
]);

// Parameters to spread into a match_rag_corpus RPC call on a counselor path.
function counselorRetrievalParams() {
  return { exclude_text_types: [...COUNSELOR_EXCLUDED_TEXT_TYPES] };
}

// Post-filter for rows that arrive by another route (graph-boost expansion,
// the library shelf, cached catalog lines) and carry a text_type.
function isCounselorVisible(row) {
  const t = row && row.text_type;
  return !t || !COUNSELOR_EXCLUDED_TEXT_TYPES.includes(t);
}

module.exports = { COUNSELOR_EXCLUDED_TEXT_TYPES, counselorRetrievalParams, isCounselorVisible };

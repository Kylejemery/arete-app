// server/lib/corpus-fence.js
//
// Which rag_corpus text_types a given surface may never retrieve. Chronology
// filtering (author_chronology, epistemic_cutoff_year) is not deployed
// (docs/corpus/EPISTEMIC_BOUNDARY_STATUS.md), so every fence is built on
// text_type. The value set is locked by rag_corpus_text_type_check:
//
//   primary         the philosophers' own texts and their ancient doxographers
//   scholarship     public-domain secondary scholarship, verbatim
//   paper_summary   Mode 2 summaries of copyrighted scholarship
//   synthesis       Arete Synthesis documents
//   concordance     editorial retrieval bridges (academy/corpus-ingestion/concordance/)
//   modern_primary  verbatim public-domain modern philosophy of mind
//   modern_summary  Mode 2 summaries of copyrighted modern philosophy of mind
//
// Three fences, from strictest to loosest:
//
//   counselor  anything that speaks as a person or as the tradition and
//              attributes what it says: the Cabinet (parallel and single),
//              the Oracle, /ask, /v1/chat/completions, the library debate,
//              the reader margin note, and the counselor source catalog.
//              Excludes editorial apparatus and the modern layer.
//   modern     user-facing surfaces that are not a historical voice but must
//              not carry contemporary philosophy of mind: the Daily Dispatch,
//              the World Agent (Dispatch includes its passages), the Journal
//              agent, the Academy seminar and the Socratic Proctor. The
//              concordance is allowed here; a professor may use apparatus.
//   none       research surfaces see everything: Synthesis, Inquiry, Tension,
//              Dreaming, Convergence, Coverage Gap, the Scribe, the eval
//              harness, the corpus MCP tools, the Observatory.
//
// Add a value to the right list and every call site on that fence follows.

const EDITORIAL_TEXT_TYPES = Object.freeze(['concordance']);
const MODERN_TEXT_TYPES = Object.freeze(['modern_primary', 'modern_summary']);

const COUNSELOR_EXCLUDED_TEXT_TYPES = Object.freeze([...EDITORIAL_TEXT_TYPES, ...MODERN_TEXT_TYPES]);
const MODERN_EXCLUDED_TEXT_TYPES = Object.freeze([...MODERN_TEXT_TYPES]);

// Parameters to spread into a match_rag_corpus / match_rag_corpus_ids call.
function counselorRetrievalParams() {
  return { exclude_text_types: [...COUNSELOR_EXCLUDED_TEXT_TYPES] };
}
function modernFenceParams() {
  return { exclude_text_types: [...MODERN_EXCLUDED_TEXT_TYPES] };
}

// Post-filters for rows that arrive by another route (graph-boost expansion,
// the library shelf, cached catalog lines) and carry a text_type. A row with
// no text_type (an RPC that does not return it) passes; the RPC-level
// exclusion is the primary fence and these are the belt to its braces.
function isCounselorVisible(row) {
  const t = row && row.text_type;
  return !t || !COUNSELOR_EXCLUDED_TEXT_TYPES.includes(t);
}
function isModernFenced(row) {
  const t = row && row.text_type;
  return !!t && MODERN_EXCLUDED_TEXT_TYPES.includes(t);
}
function passesModernFence(row) {
  return !isModernFenced(row);
}

module.exports = {
  EDITORIAL_TEXT_TYPES,
  MODERN_TEXT_TYPES,
  COUNSELOR_EXCLUDED_TEXT_TYPES,
  MODERN_EXCLUDED_TEXT_TYPES,
  counselorRetrievalParams,
  modernFenceParams,
  isCounselorVisible,
  isModernFenced,
  passesModernFence,
};

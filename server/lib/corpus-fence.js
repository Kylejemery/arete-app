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
//   synthesis       AI-written documents: the Synthesis agent's ('Arete
//                   Synthesis') and the reviewed AI-assisted documents in
//                   academy/corpus-ingestion/synthesis/ ('Arete
//                   (AI-assisted)'). Teaching material, never evidence.
//   concordance     editorial retrieval bridges (academy/corpus-ingestion/concordance/)
//   modern_primary  verbatim public-domain modern philosophy of mind
//   modern_summary  Mode 2 summaries of copyrighted modern philosophy of mind
//
// Two retrieval profiles sit over these fences
// (academy/corpus-ingestion/synthesis/README.md):
//
//   teaching   the counselor and modern fences below. Synthesis is visible
//              there, and a synthesis chunk carries its own label (layer,
//              document, section, verification_status) at the top of its
//              chunk_text, so the model sees the label wherever it sees the
//              chunk. The Socratic Proctor, the Cabinet counselors, Scrolls,
//              and the Moltbook agent (through the corpus MCP server, which it
//              asks for every layer) are teaching surfaces.
//   research   evidence and citation work: the Themata ledger and harness,
//              the gap finder (Coverage Gap agent, admin gap run), the
//              citation surfaces (the Scribe's chat, book drafting and claim
//              pipeline, composer grounding, the stoic drafter, all through
//              match_rag_corpus_cited), and the agents that write new derived
//              material from the corpus (Synthesis, Inquiry, Tension,
//              Dreaming, Convergence), so that no synthesis is ever read back
//              as a source. Synthesis is excluded in the query:
//              researchRetrievalParams() here, RESEARCH_EXCLUDED_TEXT_TYPES in
//              academy/web/src/lib/corpus-fence.ts.
//
// The corpus MCP server takes a `layers` parameter (LAYERS below) that
// defaults to canon only; a caller opts in to synthesis explicitly.
//
// Fences, from strictest to loosest:
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
//   research   the research profile above: synthesis excluded.
//   none       the remaining internal surfaces see everything: the eval
//              harness, the Observatory.
//
// Add a value to the right list and every call site on that fence follows.

const EDITORIAL_TEXT_TYPES = Object.freeze(['concordance']);
const MODERN_TEXT_TYPES = Object.freeze(['modern_primary', 'modern_summary']);

const SYNTHESIS_TEXT_TYPES = Object.freeze(['synthesis']);

const COUNSELOR_EXCLUDED_TEXT_TYPES = Object.freeze([...EDITORIAL_TEXT_TYPES, ...MODERN_TEXT_TYPES]);
const MODERN_EXCLUDED_TEXT_TYPES = Object.freeze([...MODERN_TEXT_TYPES]);
const RESEARCH_EXCLUDED_TEXT_TYPES = Object.freeze([...SYNTHESIS_TEXT_TYPES]);

// Every author that writes synthesis rows. Rows that arrive without a
// text_type (match_rag_corpus_ids, concept_passage_map) are fenced by author.
const SYNTHESIS_AUTHORS = Object.freeze(['Arete Synthesis', 'Arete (AI-assisted)']);
// The same list as a PostgREST in-list, for .not('author', 'in', ...). Values
// are double-quoted because one of them holds parentheses.
const SYNTHESIS_AUTHORS_IN_LIST = `(${SYNTHESIS_AUTHORS.map(a => `"${a}"`).join(',')})`;

// Layers a corpus MCP caller can ask for, by text_type. Canon is the texts
// themselves; scholarship is published secondary work, verbatim or as a Mode 2
// summary; apparatus is editorial; synthesis is Arete's own AI-assisted
// writing.
const LAYERS = Object.freeze({
  canon: Object.freeze(['primary', 'modern_primary']),
  scholarship: Object.freeze(['scholarship', 'paper_summary', 'modern_summary']),
  apparatus: Object.freeze([...EDITORIAL_TEXT_TYPES]),
  synthesis: Object.freeze([...SYNTHESIS_TEXT_TYPES]),
});
const DEFAULT_MCP_LAYERS = Object.freeze(['canon']);

// Parameters to spread into a match_rag_corpus / match_rag_corpus_ids call.
function counselorRetrievalParams() {
  return { exclude_text_types: [...COUNSELOR_EXCLUDED_TEXT_TYPES] };
}
function modernFenceParams() {
  return { exclude_text_types: [...MODERN_EXCLUDED_TEXT_TYPES] };
}
function researchRetrievalParams() {
  return { exclude_text_types: [...RESEARCH_EXCLUDED_TEXT_TYPES] };
}

// The exclude_text_types that leave only the named layers. Throws on a layer
// name it does not know, so a typo narrows nothing silently.
function excludeTextTypesForLayers(layers) {
  const wanted = new Set();
  for (const name of layers) {
    if (!LAYERS[name]) throw new Error(`unknown layer "${name}" (known: ${Object.keys(LAYERS).join(', ')})`);
    for (const t of LAYERS[name]) wanted.add(t);
  }
  return Object.values(LAYERS).flat().filter(t => !wanted.has(t));
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
function isSynthesisAuthor(author) {
  return SYNTHESIS_AUTHORS.includes(author);
}
// Research post-filter: by text_type where the row has one, else by author.
function isResearchVisible(row) {
  if (!row) return false;
  if (row.text_type) return !RESEARCH_EXCLUDED_TEXT_TYPES.includes(row.text_type);
  return !isSynthesisAuthor(row.author);
}

module.exports = {
  EDITORIAL_TEXT_TYPES,
  MODERN_TEXT_TYPES,
  SYNTHESIS_TEXT_TYPES,
  SYNTHESIS_AUTHORS,
  SYNTHESIS_AUTHORS_IN_LIST,
  COUNSELOR_EXCLUDED_TEXT_TYPES,
  MODERN_EXCLUDED_TEXT_TYPES,
  RESEARCH_EXCLUDED_TEXT_TYPES,
  LAYERS,
  DEFAULT_MCP_LAYERS,
  counselorRetrievalParams,
  modernFenceParams,
  researchRetrievalParams,
  excludeTextTypesForLayers,
  isCounselorVisible,
  isModernFenced,
  passesModernFence,
  isSynthesisAuthor,
  isResearchVisible,
};

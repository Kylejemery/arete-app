// The research retrieval profile, for the academy's server routes.
//
// Mirrors server/lib/corpus-fence.js, which holds the full set of fences and
// the reasons for them. Research and citation work (the Scribe, composer
// grounding, the gap finder) must never read Arete's own AI-written synthesis
// back as a source, so synthesis is excluded in the query itself: pass
// RESEARCH_EXCLUDED_TEXT_TYPES as exclude_text_types to match_rag_corpus_cited
// or match_rag_corpus_ids.

export const RESEARCH_EXCLUDED_TEXT_TYPES: string[] = ['synthesis']

// Every author that writes synthesis rows, for tables that carry an author but
// no text_type (concept_passage_map). Quoted for PostgREST because one holds
// parentheses.
export const SYNTHESIS_AUTHORS = ['Arete Synthesis', 'Arete (AI-assisted)']
export const SYNTHESIS_AUTHORS_IN_LIST = `(${SYNTHESIS_AUTHORS.map(a => `"${a}"`).join(',')})`

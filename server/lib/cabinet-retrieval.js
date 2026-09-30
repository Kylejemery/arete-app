// server/lib/cabinet-retrieval.js
//
// The similarity floor for the Cabinet's shared corpus retrieval (the
// parallel, multi-counselor branch of POST /api/chat/counselor).
// match_rag_corpus always returns its k nearest rows, so a turn with no
// philosophical content ("I will send the guidance by 1pm") still pulled
// seven passages, at similarities around 0.30, that the counselors were then
// invited to draw on. retrieval_log shows the bands are well separated:
// substantive questions retrieve above 0.5 on every row, conversational turns
// below 0.36. The floor matches MATCH_THRESHOLD in server/retrieval.js and
// RESERVED_MIN_SIMILARITY in server/lib/author-mentions.js, which already
// guards the named-author rows this branch reserves.

const CABINET_MIN_SIMILARITY = 0.4;

// Rows at or above the floor, in the order given. Rows with no numeric
// similarity are dropped: every row from match_rag_corpus carries one.
function aboveSimilarityFloor(rows, min = CABINET_MIN_SIMILARITY) {
  return (Array.isArray(rows) ? rows : []).filter(r => typeof r?.similarity === 'number' && r.similarity >= min);
}

module.exports = { CABINET_MIN_SIMILARITY, aboveSimilarityFloor };

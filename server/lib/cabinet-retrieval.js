// server/lib/cabinet-retrieval.js
//
// The similarity floor for the Cabinet's corpus retrieval (both branches of
// POST /api/chat/counselor). match_rag_corpus always returns its k nearest
// rows, so a turn with no philosophical content ("I will send the guidance
// by 1pm") still pulled seven passages, at similarities around 0.30, that the
// counselors were then invited to draw on. retrieval_log shows the bands are
// well separated: substantive questions retrieve above 0.5 on every row,
// conversational turns below 0.36. The floor matches MATCH_THRESHOLD in
// server/retrieval.js. scripts/probe-retrieval.js applies the same value, so
// what it prints is what the Cabinet sees.

const CABINET_MIN_SIMILARITY = 0.4;

// Rows at or above the floor, in the order given. Rows with no numeric
// similarity are dropped: every row from match_rag_corpus carries one.
function aboveSimilarityFloor(rows, min = CABINET_MIN_SIMILARITY) {
  return (rows ?? []).filter(r => typeof r?.similarity === 'number' && r.similarity >= min);
}

module.exports = { CABINET_MIN_SIMILARITY, aboveSimilarityFloor };

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
//
// A turn the floor empties used to leave no retrieval_log row at all, which
// hid exactly the questions the corpus could not answer. It now logs one
// below_floor row (belowFloorLogRow).

const CABINET_MIN_SIMILARITY = 0.4;

// Rows at or above the floor, in the order given. Rows with no numeric
// similarity are dropped: every row from match_rag_corpus carries one.
function aboveSimilarityFloor(rows, min = CABINET_MIN_SIMILARITY) {
  return (Array.isArray(rows) ? rows : []).filter(r => typeof r?.similarity === 'number' && r.similarity >= min);
}

// The one retrieval_log row for a turn the floor emptied: the best match it
// had, so the turn and its top similarity stay in the log. Its key carries a
// below_floor: prefix, so logRetrieval stores no chunk_id (nothing that
// counts retrieved or used chunks sees it) and it can never match a row
// attributeUsage marks. Null when the floor kept anything, or there was
// nothing scored to keep.
function belowFloorLogRow(rows, min = CABINET_MIN_SIMILARITY) {
  if (aboveSimilarityFloor(rows, min).length) return null;
  const scored = (Array.isArray(rows) ? rows : []).filter(r => typeof r?.similarity === 'number' && r?.id != null);
  if (!scored.length) return null;
  const best = scored.reduce((a, b) => (b.similarity > a.similarity ? b : a));
  return { id: `below_floor:${best.id}`, similarity: best.similarity };
}

module.exports = { CABINET_MIN_SIMILARITY, aboveSimilarityFloor, belowFloorLogRow };

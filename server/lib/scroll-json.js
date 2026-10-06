// server/lib/scroll-json.js
//
// Reads the { title, body } a scroll generation returns. The request enables
// web_search, so the reply arrives as several content blocks: the model may
// write a sentence, search, write another, and only then give the JSON. Taking
// the first text block (the old behaviour) parsed that opening sentence and
// failed with a 500 after the full model call had been paid for. Here every
// text block is joined, as the Cabinet does since R13, and the last JSON
// object carrying a string title and body is taken.
//
// readScrollJson(content, stopReason) → { scroll, diag }
//   scroll: { title, body } or null
//   diag:   shape only (block types, lengths, stop_reason), never the text,
//           so it is safe to log.

// Every balanced {...} in the text, in order, skipping braces inside strings.
function jsonObjectSpans(text) {
  const spans = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '{') { i++; continue; }
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { end = j; break; }
    }
    if (end === -1) { i++; continue; }
    spans.push([i, end + 1]);
    i = end + 1;
  }
  return spans;
}

function readScrollJson(content, stopReason) {
  const blocks = Array.isArray(content) ? content : [];
  const text = blocks
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');

  const blockTypes = {};
  for (const b of blocks) blockTypes[b?.type || 'unknown'] = (blockTypes[b?.type || 'unknown'] || 0) + 1;

  let scroll = null;
  let candidates = 0;
  const spans = jsonObjectSpans(text);
  for (let k = spans.length - 1; k >= 0; k--) {
    let obj;
    try { obj = JSON.parse(text.slice(spans[k][0], spans[k][1])); } catch { continue; }
    candidates++;
    if (obj && typeof obj.title === 'string' && typeof obj.body === 'string' && obj.body.trim()) {
      scroll = { title: obj.title, body: obj.body };
      break;
    }
  }

  const firstText = blocks.find((b) => b?.type === 'text' && typeof b.text === 'string')?.text || '';
  return {
    scroll,
    diag: {
      stop_reason: stopReason || null,
      blocks: blockTypes,
      text_chars: text.length,
      first_text_chars: firstText.length,
      first_text_starts_json: /^\s*(```(?:json)?\s*)?\{/i.test(firstText),
      json_objects: spans.length,
      json_parsed: candidates,
    },
  };
}

module.exports = { readScrollJson, jsonObjectSpans };

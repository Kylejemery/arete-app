// pd-ingest/chunk.js — chunk by canonical citation, never by token window.
//
// A parser hands over sections in reading order:
//
//   { cite: '3.22.4', parent: '3.22', text, pages: ['201'], label? }
//
// `cite` is the smallest canonical division (Epictetus section, Moralia page
// and letter, Gellius paragraph, DL section, printed page for Tier 2);
// `parent` is the unit an argument does not cross (a discourse, a Moralia
// essay, a Gellius chapter, a DL life or book). Chunks are built by adding
// whole sections until the next one would pass the target size, and never
// cross a parent. A section is never split: one longer than the maximum
// becomes a chunk of its own and is reported, not cut.

const { countWords } = require('./lib');

const DEFAULTS = { targetWords: 350, maxWords: 700, minWords: 60 };

function locatorOf(first, last) {
  return first === last ? first : `${first}–${last}`;
}

function pageRange(pages) {
  const ps = [...new Set(pages.filter(Boolean))];
  if (!ps.length) return null;
  return ps.length === 1 ? ps[0] : `${ps[0]}–${ps[ps.length - 1]}`;
}

function chunkSections(sections, opts = {}) {
  const { targetWords, maxWords, minWords } = { ...DEFAULTS, ...opts };
  const chunks = [];
  const warnings = [];
  let cur = null;

  const flush = () => {
    if (!cur) return;
    const first = cur.sections[0];
    const last = cur.sections[cur.sections.length - 1];
    const text = cur.sections.map((s) => s.text).join('\n\n');
    chunks.push({
      locator: first.cite == null ? null : locatorOf(first.cite, last.cite),
      parent: first.parent,
      section_label: first.label || null,
      chunk_text: text,
      word_count: countWords(text),
      printed_pages: pageRange(cur.sections.flatMap((s) => s.pages || [])),
      cites: cur.sections.map((s) => s.cite),
    });
    cur = null;
  };

  for (const s of sections) {
    const w = countWords(s.text);
    if (!w) continue;
    if (w > maxWords) {
      warnings.push(`section ${s.cite} has ${w} words (over ${maxWords}); kept whole as its own chunk`);
    }
    const crossesParent = cur && cur.parent !== s.parent;
    const overTarget = cur && cur.words + w > targetWords && cur.words >= minWords;
    if (crossesParent || overTarget || (cur && w > maxWords)) flush();
    if (!cur) cur = { parent: s.parent, sections: [], words: 0 };
    cur.sections.push(s);
    cur.words += w;
  }
  flush();

  // A short tail (under minWords) joins the chunk before it when both share a
  // parent and the result stays under the maximum.
  for (let i = chunks.length - 1; i > 0; i--) {
    const c = chunks[i];
    const p = chunks[i - 1];
    if (c.word_count < minWords && c.parent === p.parent && p.word_count + c.word_count <= maxWords) {
      const cites = p.cites.concat(c.cites);
      const text = `${p.chunk_text}\n\n${c.chunk_text}`;
      chunks.splice(i - 1, 2, {
        ...p,
        locator: p.locator == null ? null : locatorOf(cites[0], cites[cites.length - 1]),
        chunk_text: text,
        word_count: countWords(text),
        printed_pages: pageRange([p.printed_pages, c.printed_pages].flatMap((x) => (x ? x.split('–') : []))),
        cites,
      });
    }
  }

  return { chunks, warnings };
}

module.exports = { chunkSections, locatorOf, pageRange, DEFAULTS };

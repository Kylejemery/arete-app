// pd-ingest/build.js — from fetched files to staging rows, with no database
// and no network: parse, check structure, chunk by citation, attach notes,
// and align an original to its translation. stage.js does the I/O around it,
// and the tests drive it directly.

const { chunkSections } = require('./chunk');
const { checkStructure, compareCites } = require('./parsers/common');
const { countWords } = require('./lib');

const PARSERS = {
  lacuscurtius: require('./parsers/lacuscurtius'),
  numbered: require('./parsers/numbered'),
  'ia-ocr': require('./parsers/ia-ocr'),
};

function parseFiles(source, files) {
  const parser = PARSERS[source.parser];
  if (!parser) throw new Error(`no parser "${source.parser}"`);
  const out = { front: '', sections: [], notes: [], licenseEvidence: [], rawText: '', reasons: [], warnings: [], ocr: null };
  for (const f of files) {
    const text = f.body.toString('utf8');
    // leafRange counts scan leaves, blanks included, so the parser applies it
    // before empty leaves drop out.
    const options = source.parser === 'ia-ocr' && source.leafRange
      ? { ...(source.parse || {}), leafRange: source.leafRange }
      : (source.parse || {});
    const r = parser.parse(text, options);
    out.front += r.front ? `${r.front}\n\n` : '';
    out.sections.push(...r.sections);
    out.notes.push(...(r.notes || []));
    out.licenseEvidence.push(...(r.licenseEvidence || []));
    out.rawText += `${r.rawText}\n`;
    out.reasons.push(...(r.reasons || []));
    out.warnings.push(...(r.warnings || []));
    if (r.ocr) out.ocr = r.ocr;
  }
  out.licenseEvidence = [...new Set(out.licenseEvidence)];
  return out;
}

function fallbackEvidence(source) {
  return `${source.translator === 'original' ? source.author : source.translator}, ${source.work}, ${source.edition || 'edition not recorded'}, ${source.edition_year}. Published before 1931: public domain in the United States. The source page carries no public-domain statement of its own.`;
}

// Group an original's sections by the translation's chunk ranges, so parallel
// chunks cover the same citations and pair one to one.
function groupByRanges(sections, ranges) {
  return ranges.map(({ locator, first, last }) => {
    const inside = sections.filter((s) => compareCites(s.cite, first) >= 0 && compareCites(s.cite, last) <= 0);
    const text = inside.map((s) => s.text).join('\n\n');
    return inside.length ? {
      locator, parallel_locator: locator, chunk_text: text, word_count: countWords(text),
      section_label: inside[0].label || null,
      printed_pages: [...new Set(inside.flatMap((s) => s.pages || []))].join('–') || null,
    } : null;
  }).filter(Boolean);
}

function rangeOf(locator) {
  const [first, last] = String(locator).split('–');
  return { locator, first, last: last || first };
}

// Returns { ok, reasons, chunks, stats, licenseEvidence, ocr, warnings }.
// `translationChunks` (staged locators of the source this one is parallel
// to) switches chunking to alignment.
function build(source, files, { translationChunks = null } = {}) {
  const parsed = parseFiles(source, files);
  const structure = source.parser === 'ia-ocr'
    ? { ok: parsed.reasons.length === 0 && parsed.sections.length > 0, reasons: parsed.reasons.length ? parsed.reasons : (parsed.sections.length ? [] : ['no pages recovered']), bodyWords: parsed.sections.reduce((n, s) => n + countWords(s.text), 0), frontWords: 0 }
    : checkStructure({ sections: parsed.sections, front: parsed.front, rawText: parsed.rawText, order: compareCites });
  const expectMissing = (source.expect || []).filter((e) => !parsed.rawText.includes(e));
  const reasons = [...structure.reasons, ...expectMissing.map((e) => `expected "${e}" in the source (translator or edition check) and did not find it`)];
  if (reasons.length) return { ok: false, reasons, parsed };

  let chunks;
  let warnings = [...parsed.warnings];
  if (translationChunks) {
    chunks = groupByRanges(parsed.sections, translationChunks.map(rangeOf));
  } else {
    const r = chunkSections(parsed.sections);
    warnings.push(...r.warnings);
    chunks = r.chunks.map((c) => ({
      // Tier 2 has no canonical citation: the page is carried in printed_pages
      // and the label, and locator stays null (ACQUISITION_PLAN Part 5, rule 3).
      locator: source.tier === 2 ? null : c.locator,
      section_label: source.tier === 2 ? (c.printed_pages ? `pp. ${c.printed_pages}` : c.section_label) : c.section_label,
      chunk_text: c.chunk_text,
      word_count: c.word_count,
      printed_pages: c.printed_pages,
      parallel_locator: source.tier === 1 ? c.locator : null,
      cites: c.cites,
    }));
  }

  // A translator's note becomes its own chunk, linked to the chunk holding
  // the passage that calls it.
  const noteChunks = parsed.notes.map((n) => {
    const home = chunks.find((c) => c.cites && c.cites.includes(n.annotates));
    return {
      kind: 'note', locator: null, section_label: `Note ${n.id.replace(/\D+/g, '')}`,
      chunk_text: n.text, word_count: countWords(n.text), printed_pages: null,
      annotates_locator: home ? home.locator : null,
    };
  });
  const orphanNotes = noteChunks.filter((n) => !n.annotates_locator).length;
  if (orphanNotes) warnings.push(`${orphanNotes} note(s) not called from any recognised passage`);

  const rows = [
    ...chunks.map((c) => ({ kind: 'body', ...c })),
    ...noteChunks,
  ].map(({ cites, ...c }, i) => ({ chunk_index: i, ...c }));

  return {
    ok: true,
    reasons: [],
    chunks: rows,
    warnings,
    licenseEvidence: parsed.licenseEvidence.length ? parsed.licenseEvidence.join('\n') : fallbackEvidence(source),
    ocr: parsed.ocr,
    stats: {
      words: rows.filter((r) => r.kind === 'body').reduce((n, r) => n + r.word_count, 0),
      bodyChunks: rows.filter((r) => r.kind === 'body').length,
      noteChunks: noteChunks.length,
      frontWordsDropped: structure.frontWords,
    },
  };
}

module.exports = { build, parseFiles, groupByRanges, fallbackEvidence, PARSERS };

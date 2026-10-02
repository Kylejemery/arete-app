// server/lib/synthesis-markdown.js
//
// Renders a structured synthesis draft as a <doc_key>.v<N>.md file in the
// format academy/corpus-ingestion/ingest-synthesis.js loads (see
// academy/corpus-ingestion/synthesis/README.md). The agent cannot write into
// the repo from Railway, so the rendered text is stored on a synthesis_drafts
// row; once Kyle approves, export-synthesis-drafts.js writes the file, a PR
// commits it, and the nightly sync loads it.
//
// The parser lives in academy/corpus-ingestion, which the server does not
// deploy with. tests/synthesis-markdown.test.js runs every rendering through
// the real parseSynthesis, so the two cannot drift.
//
// Every section carries an explicit status. A status the parser does not know
// fails here, at render time, rather than at export.

const STATUSES = Object.freeze(['corpus_verified', 'via_summary', 'unverified', 'interpretive']);

// Headings become section_label paths and section_status keys. Emphasis is
// stripped by the parser, so it is stripped here too, and the two characters
// the front matter uses as syntax (" => " and a line break) cannot appear.
function cleanHeading(s) {
  return String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^#+\s*/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)_([^_]+?)_(?=\s|$)/g, '$1$2')
    .replace(/[*`]/g, '')
    .replace(/=>/g, '→')
    .replace(/\s+/g, ' ')
    .trim();
}

// A body line that starts with # would become a heading (or, at level one,
// vanish as a document title). Demote it to plain text.
function cleanBody(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/^\s*#{1,6}\s+/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function oneLine(s) {
  return String(s || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function checkStatuses(list, where) {
  if (!Array.isArray(list) || !list.length) throw new Error(`${where}: no verification status`);
  for (const s of list) {
    if (!STATUSES.includes(s)) throw new Error(`${where}: unknown verification status "${s}"`);
  }
  return list;
}

// Kebab-case slug for doc_key: ascii letters, digits and single hyphens.
function slugify(s, max = 60) {
  const slug = String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, max).replace(/-+$/g, '') || 'untitled';
}

/**
 * @param {object} d
 * @param {string} d.doc_key          kebab-case
 * @param {number} [d.version=1]
 * @param {string} d.title
 * @param {string} d.created_at       YYYY-MM-DD
 * @param {string} d.generated_with
 * @param {string|null} [d.reviewed_by]   left out until Kyle signs off (the export sets it)
 * @param {string|null} [d.review_by]     YYYY-MM-DD
 * @param {string[]} d.sources_used   "Author | Work"
 * @param {string[]} [d.regenerate_when]
 * @param {{body: string, status: string[]}|null} [d.introduction]
 * @param {{heading: string, body: string, status: string[]}[]} d.sections
 * @returns {string} the file's text
 */
function renderSynthesisMarkdown(d) {
  const version = d.version == null ? 1 : Number(d.version);
  if (!/^[a-z0-9-]+$/.test(d.doc_key || '')) throw new Error(`doc_key "${d.doc_key}" must be kebab-case`);
  if (!Number.isInteger(version) || version < 1 || version >= 1000) throw new Error('version must be an integer from 1 to 999');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.created_at || '')) throw new Error('created_at must be YYYY-MM-DD');
  if (d.review_by && !/^\d{4}-\d{2}-\d{2}$/.test(d.review_by)) throw new Error('review_by must be YYYY-MM-DD');
  const title = oneLine(d.title);
  if (!title) throw new Error('title is empty');
  const sources = (d.sources_used || []).map(oneLine).filter(Boolean);
  if (!sources.length) throw new Error('sources_used is empty');
  const sections = (d.sections || []).filter(s => cleanBody(s.body));
  if (!sections.length) throw new Error('a document needs at least one section');

  // Unique headings: two sections with the same heading would share one
  // section_status key.
  const seen = new Map();
  const rendered = sections.map((s, i) => {
    let heading = cleanHeading(s.heading) || `Section ${i + 1}`;
    if (heading === 'Introduction') heading = 'Introduction (continued)';
    const n = (seen.get(heading) || 0) + 1;
    seen.set(heading, n);
    if (n > 1) heading = `${heading} (${n})`;
    return { heading, body: cleanBody(s.body), status: checkStatuses(s.status, `section "${heading}"`) };
  });

  const intro = d.introduction && cleanBody(d.introduction.body)
    ? { body: cleanBody(d.introduction.body), status: checkStatuses(d.introduction.status, 'introduction') }
    : null;

  // default_status is the most common status set; every other section is
  // named in section_status.
  const all = [...(intro ? [{ heading: 'Introduction', status: intro.status }] : []), ...rendered];
  const key = s => s.status.join(', ');
  const counts = new Map();
  for (const s of all) counts.set(key(s), (counts.get(key(s)) || 0) + 1);
  const defaultStatus = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const explicit = all.filter(s => key(s) !== defaultStatus);

  const fm = [
    '---',
    `doc_key: ${d.doc_key}`,
    `title: ${title}`,
    `version: ${version}`,
    `created_at: ${d.created_at}`,
    `generated_with: ${oneLine(d.generated_with)}`,
  ];
  if (d.reviewed_by) fm.push(`reviewed_by: ${oneLine(d.reviewed_by)}`);
  if (d.review_by) fm.push(`review_by: ${d.review_by}`);
  fm.push(`default_status: ${defaultStatus}`);
  if (explicit.length) {
    fm.push('section_status:');
    for (const s of explicit) fm.push(`  - ${s.heading} => ${key(s)}`);
  }
  fm.push('sources_used:');
  for (const s of sources) fm.push(`  - ${s}`);
  const regen = (d.regenerate_when || []).map(oneLine).filter(Boolean);
  if (regen.length) {
    fm.push('regenerate_when:');
    for (const r of regen) fm.push(`  - ${r}`);
  }
  fm.push('---');

  const out = [fm.join('\n'), '', `# ${title}`, ''];
  if (intro) out.push(intro.body, '');
  for (const s of rendered) out.push(`## ${s.heading}`, '', s.body, '');
  return out.join('\n').replace(/\n+$/, '\n');
}

module.exports = { STATUSES, renderSynthesisMarkdown, slugify, cleanHeading, cleanBody };

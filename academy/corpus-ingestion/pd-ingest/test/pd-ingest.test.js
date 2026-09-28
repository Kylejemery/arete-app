// pd-ingest/test/pd-ingest.test.js
//
// The fixtures here are SYNTHETIC: written to the markup each parser is
// configured for, not copied from the live sites (no route to them from the
// session that wrote this). They pin the pipeline's behaviour (chunks never
// split a section or cross a parent, notes leave the body and link back,
// page numbers leave the text, a misread structure is refused), not the
// sites' real markup, which --inspect is for.
//
//   cd academy/corpus-ingestion && node --test pd-ingest/test/

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { chunkSections } = require('../chunk');
const { build, groupByRanges } = require('../build');
const { robotsDisallows, fileNameFor } = require('../fetch');
const { garbleEstimate, ocrQuality, isGarbled, htmlToText } = require('../lib');
const { compareCites } = require('../parsers/common');
const numbered = require('../parsers/numbered');
const { SOURCES } = require('../sources');
const { pendingReason } = require('../stage');

const file = (body, url = 'https://example.test/x') => ({ body: Buffer.from(body), url });
const words = (n, w = 'word') => Array.from({ length: n }, () => w).join(' ');

test('chunks group whole sections, never split one, never cross a parent', () => {
  const sections = [
    { cite: '3.22.1', parent: '3.22', text: words(200) },
    { cite: '3.22.2', parent: '3.22', text: words(200) },
    { cite: '3.22.3', parent: '3.22', text: words(100) },
    { cite: '3.23.1', parent: '3.23', text: words(900) },
    { cite: '3.23.2', parent: '3.23', text: words(100) },
  ];
  const { chunks, warnings } = chunkSections(sections, { targetWords: 350, maxWords: 700, minWords: 60 });
  assert.deepEqual(chunks.map((c) => c.locator), ['3.22.1', '3.22.2–3.22.3', '3.23.1', '3.23.2']);
  assert.ok(chunks.every((c) => c.cites.every((x) => x.startsWith(c.parent))));
  assert.match(warnings[0], /3\.23\.1 has 900 words/);
});

test('a short tail joins the chunk before it within the same parent', () => {
  const { chunks } = chunkSections([
    { cite: '1.1.1', parent: '1.1', text: words(340) },
    { cite: '1.1.2', parent: '1.1', text: words(20) },
  ]);
  assert.deepEqual(chunks.map((c) => c.locator), ['1.1.1–1.1.2']);
});

const MORALIA_HTML = `
<html><body>
<table class="header"><tr><td><a href="../home.html">Home</a> Previous Next</td></tr></table>
<p>Frank Cole Babbitt, Loeb Classical Library, 1927.</p>
<p><a id="37C"></a>So, my dear Nicander, <span class="pagenum"><a id="p201">p201</a></span>I send you what I said about listening.<a class="ref" href="#note1">1</a></p>
<p><a id="37D"></a>${words(120, 'hearing')}</p>
<p><a id="37E"></a>${words(120, 'reason')}</p>
<p><a id="38A"></a>The listener must ask whether he has been improved.</p>
<hr>
<p id="note1">1 Nicander is otherwise unknown.</p>
<p>The text is in the public domain.</p>
</body></html>`;

const deAuditu = { ...SOURCES.find((s) => s.slug === 'plutarch-de-auditu-babbitt-1927') };

test('LacusCurtius: sections by page and letter, pages and notes out of the text, license kept verbatim', () => {
  const r = build(deAuditu, [file(MORALIA_HTML)]);
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  const body = r.chunks.filter((c) => c.kind === 'body');
  const note = r.chunks.find((c) => c.kind === 'note');
  assert.equal(body[0].locator.split('–')[0], '37C');
  assert.ok(body.some((c) => /whether he has been improved/.test(c.chunk_text)));
  assert.ok(body.every((c) => !/p201|Previous|Home/.test(c.chunk_text)), 'navigation and page markers stay out of the text');
  assert.equal(body[0].printed_pages, '201');
  assert.equal(note.chunk_text, 'Nicander is otherwise unknown.');
  assert.equal(note.annotates_locator, body[0].locator);
  assert.equal(r.licenseEvidence, 'The text is in the public domain.');
});

test('a page with no recognised citation anchors is refused, not staged', () => {
  const r = build(deAuditu, [file(`<p>Babbitt</p><p>${words(500)}</p>`)]);
  assert.equal(r.ok, false);
  assert.match(r.reasons.join(' '), /no citation markers/);
});

test('the translator check refuses a source that does not name the translator', () => {
  const r = build(deAuditu, [file(MORALIA_HTML.replace('Frank Cole Babbitt', 'Someone Else'))]);
  assert.equal(r.ok, false);
  assert.match(r.reasons.join(' '), /expected "Babbitt"/);
});

const DL6_WIKITEXT = `{{header|title=Lives of the Eminent Philosophers|translator=Robert Drew Hicks}}
== ANTISTHENES ==
{{anchor|1}} Antisthenes, the son of Antisthenes, was an Athenian.<ref>A Hicks note on birth.</ref> ${words(60, 'life')}
{{anchor|2}} ${words(60, 'teaching')}
{{anchor|3}} ${words(60, 'sayings')}
== DIOGENES ==
{{anchor|20}} Diogenes was a native of Sinope. ${words(60, 'exile')}
{{anchor|21}} ${words(60, 'tub')}`;

test('Wikisource wikitext: the numbering form is detected, lives are parents, refs become notes', () => {
  const source = SOURCES.find((s) => s.slug === 'dl-lives-book6-hicks-1925');
  const r = build(source, [file(DL6_WIKITEXT)]);
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  const body = r.chunks.filter((c) => c.kind === 'body');
  assert.deepEqual(body.map((c) => c.locator), ['6.1–6.3', '6.20–6.21']);
  assert.deepEqual(body.map((c) => c.section_label), ['Life of Antisthenes', 'Life of Diogenes']);
  const note = r.chunks.find((c) => c.kind === 'note');
  assert.equal(note.chunk_text, 'A Hicks note on birth.');
  assert.equal(note.annotates_locator, '6.1–6.3');
  assert.ok(!/anchor|header|<ref>/.test(body[0].chunk_text));
});

test('numbered: the candidate with the longest consecutive run wins', () => {
  const s = numbered.scoreCandidates('[1] a [2] b [3] c [4] d see note [99]');
  assert.equal(s[0].name, 'bracket');
  assert.equal(s[0].score, 4);
});

test('an original is chunked to its translation’s ranges so the pair is one to one', () => {
  const latin = [
    { cite: '1.15', text: 'Socrates mihi videtur' },
    { cite: '1.16', text: 'primus a rebus occultis' },
    { cite: '1.17', text: 'avocavisse philosophiam' },
  ];
  const out = groupByRanges(latin, [{ locator: '1.15–1.16', first: '1.15', last: '1.16' }, { locator: '1.17', first: '1.17', last: '1.17' }]);
  assert.deepEqual(out.map((c) => [c.locator, c.parallel_locator, c.chunk_text]), [
    ['1.15–1.16', '1.15–1.16', 'Socrates mihi videtur\n\nprimus a rebus occultis'],
    ['1.17', '1.17', 'avocavisse philosophiam'],
  ]);
});

test('IA OCR: printed page is the unit, locator null, OCR quality recorded', () => {
  const source = { ...SOURCES.find((s) => s.slug === 'bonhoeffer-epictet-und-die-stoa-1890'), leafRange: undefined };
  const leaf = (n, t) => `${n}\n${t}\n`;
  const text = [
    'EPICTET UND DIE STOA\n',
    leaf(12, `Die Lehre des Epictet von der Vernunft ist ${words(80, 'klar')}`),
    leaf(13, `und das Gute liegt allein im rich-\ntigen Gebrauch der Vorstellungen ${words(80, 'gut')}`),
    leaf(14, `${words(80, 'Stoa')}`),
  ].join('\f');
  const r = build(source, [file(text)]);
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  const body = r.chunks.filter((c) => c.kind === 'body');
  assert.ok(body.every((c) => c.locator === null));
  assert.match(body[0].section_label, /^pp?\. /);
  assert.ok(body.some((c) => /richtigen Gebrauch/.test(c.chunk_text)), 'line-break hyphenation rejoined');
  assert.equal(r.ocr.quality, 'good');
});

test('OCR without leaf breaks is refused rather than paged by guesswork', () => {
  const source = SOURCES.find((s) => s.slug === 'bonhoeffer-epictet-und-die-stoa-1890');
  const r = build(source, [file(`Epictet ${words(400)}`)]);
  assert.equal(r.ok, false);
  assert.match(r.reasons.join(' '), /form-feed/);
});

test('garble estimate: script mismatches and vowel-less runs count, clean text does not', () => {
  assert.equal(isGarbled('Vorstellungen', 'german'), false);
  assert.equal(isGarbled('Vorst3llungen', 'german'), true);
  assert.equal(isGarbled('xzqrtk', 'german'), true);
  assert.equal(isGarbled('λόγος', 'ancient_greek'), false);
  assert.equal(isGarbled('λόgος', 'ancient_greek'), true);
  const est = garbleEstimate(`${words(95, 'Stoa')} ${words(5, 'St0a')}`, 'german', { sampleSize: 100 });
  assert.equal(est.sampled, 100);
  assert.equal(ocrQuality(est.rate), 'fair');
  assert.equal(ocrQuality(0.06), 'poor');
});

test('robots.txt: the * group disallows by prefix', () => {
  const robots = 'User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/\n';
  assert.equal(robotsDisallows(robots, '/private/x.html'), true);
  assert.equal(robotsDisallows(robots, '/Thayer/E/Roman/Texts/x.html'), false);
});

test('cache file names are stable and filesystem-safe', () => {
  assert.equal(
    fileNameFor('https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Moralia/De_auditu*.html'),
    'Thayer_E_Roman_Texts_Plutarch_Moralia_De_auditu_.html',
  );
});

test('citation order: Moralia letters and dotted sections', () => {
  assert.ok(compareCites('37C', '37D') < 0);
  assert.ok(compareCites('37F', '38A') < 0);
  assert.ok(compareCites('3.22.9', '3.22.10') < 0);
  assert.ok(compareCites('6.20', '6.3') > 0);
});

test('htmlToText keeps Greek and diacritics, NFC', () => {
  const decomposed = 'λόγος';
  assert.equal(htmlToText(`<p>${decomposed} &amp; Bonh&ouml;ffer</p>`), 'λόγος & Bonhöffer');
});

test('every source definition is complete, and quotable only where the rules allow', () => {
  const slugs = new Set();
  for (const s of SOURCES) {
    assert.ok(!slugs.has(s.slug), `duplicate slug ${s.slug}`);
    slugs.add(s.slug);
    for (const k of ['tier', 'author', 'work', 'language', 'translator', 'text_type', 'license_status', 'parser']) {
      assert.ok(s[k] != null, `${s.slug}: ${k} missing`);
    }
    if (s.quotable_on_air) assert.ok(s.tier === 1 && s.text_type === 'primary', `${s.slug}: quotable outside Tier 1 primary`);
    if (s.parallelOf) assert.ok(slugs.has(s.parallelOf) || SOURCES.some((x) => x.slug === s.parallelOf), `${s.slug}: parallelOf unknown`);
  }
  // Decision 3: Schenkl's Greek is not quotable.
  assert.equal(SOURCES.find((s) => s.slug === 'schenkl-dissertationes-1916-greek').quotable_on_air, false);
});

test('sources that cannot run yet say why', () => {
  const why = (slug) => pendingReason(SOURCES.find((s) => s.slug === slug));
  assert.equal(why('plutarch-de-auditu-babbitt-1927'), null);
  assert.equal(why('dl-lives-book6-hicks-1925'), null);
  assert.match(why('gellius-attic-nights-rolfe-1927'), /citation pattern/);
  assert.match(why('bonhoeffer-epictet-und-die-stoa-1890'), /not located/);
  assert.match(why('cicero-academica-yonge'), /Aligner not written/);
  assert.match(why('epictetus-discourses-oldfather-vol2-1928'), /facing-page/);
  // A scan staged from a PDF's text layer has no URL to fetch and needs none.
  assert.equal(why('hicks-stoic-and-epicurean-1910'), null);
});

// A scan whose pages open with a running head, as a PDF's text layer gives it.
const scanSource = {
  slug: 'test-scan', tier: 2, author: 'A', work: 'W', language: 'english', translator: 'original',
  edition_year: 1900, text_type: 'scholarship', license_status: 'public_domain_us', urls: [],
  parser: 'ia-ocr',
  parse: { language: 'english', stripRunningHeads: true, pageOffset: 2, chapterBreak: /^CHAPTER [IVXL]+\.?$/ },
};
const scan = (leaves) => [file(leaves.join('\f'))];

test('running heads come off, pages come from the leaf offset, OCR-mangled numbers do not matter', () => {
  const r = build(scanSource, scan([
    'TITLE PAGE',
    '',
    `CHAPTER I\nThe first page ${words(100, 'virtue')}`,
    `2 STOIC AND EPICUREAN\nsecond page ${words(100, 'nature')}\n1`,
    `EARLIER STOICS 3\nthird page ${words(100, 'reason')}`,
    `i\n4 STOIC AND EPICUREAN\nfourth page ${words(100, 'logos')}\nCHRYSIPPE. 10`,
    `EARLIER STOICS 5\nfifth page ${words(100, 'fate')}`,
    `6 STOIC AND EPICUREAN\nsixth page ${words(100, 'pneuma')}`,
    `EARLIER STOICS 7\nseventh page ${words(100, 'cosmos')}`,
    `8 STOIC AND EPICUREAN\neighth page ${words(100, 'sage')}`,
    `EARLIER STOICS 9\nninth page ${words(100, 'assent')}`,
    `lo STOIC AND EPICUREAN\ntenth page ${words(100, 'impression')}`,
  ]));
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  const text = r.chunks.map((c) => c.chunk_text).join(' ');
  assert.doesNotMatch(text, /STOIC AND EPICUREAN|EARLIER STOICS|CHRYSIPPE\. 10/);
  assert.match(text, /CHAPTER I The first page/, 'a chapter heading is text, not a running head');
  assert.doesNotMatch(text, /TITLE PAGE/, 'a leaf of under five words is a title leaf, not a page');
  assert.equal(r.chunks[0].printed_pages.split('–')[0], '1');
  assert.ok(r.chunks.some((c) => /tenth page/.test(c.chunk_text) && /10$/.test(c.printed_pages)), 'the misread "lo" is page 10 by offset');
  assert.match(r.warnings.join(' '), /8 of 8 legible running-head numbers agree/);
});

test('a page offset the running heads contradict is refused', () => {
  const leaves = Array.from({ length: 12 }, (_, i) => `HEAD ${i + 50}\npage ${words(80, 'text')}`);
  const r = build(scanSource, scan(leaves));
  assert.equal(r.ok, false);
  assert.match(r.reasons.join(' '), /page offset 2 disagrees/);
});

test('page chunks never run from one chapter into the next', () => {
  const r = build(scanSource, scan([
    '', '',
    `CHAPTER I\n${words(200, 'alpha')}`,
    `2 HEAD\nend of the first chapter ${words(40, 'beta')}`,
    `CHAPTER II\n${words(200, 'gamma')}`,
  ]));
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  const body = r.chunks.filter((c) => c.kind === 'body');
  assert.ok(body.every((c) => !(/beta/.test(c.chunk_text) && /gamma/.test(c.chunk_text))));
  assert.ok(body.some((c) => /alpha/.test(c.chunk_text) && /beta/.test(c.chunk_text)), 'a short chapter tail joins its own chapter');
});

test('garble estimate: quotes, footnote stars and hyphenated compounds are not garble; French has its own script', () => {
  assert.equal(isGarbled('gods,"', 'english'), false);
  assert.equal(isGarbled('being."*', 'english'), false);
  assert.equal(isGarbled('self-seeking', 'english'), false);
  assert.equal(isGarbled('se1f-seeking', 'english'), true);
  assert.equal(isGarbled('représentation', 'french'), false);
  assert.equal(isGarbled("l'âme", 'french'), false);
  assert.equal(isGarbled('M£{i.îy.9«t', 'french'), true);
});

// An English summary written in the repo: one `## ` section, one chunk.
const summarySource = {
  slug: 'test-summary', tier: 2, author: 'A', work: 'W (English summary)', language: 'english', translator: 'original',
  edition_year: 1910, text_type: 'paper_summary', license_status: 'public_domain_us', urls: [], parser: 'summary-md',
  licenseEvidence: 'Our own summary of a public domain work.',
};

test('summary: each section is one chunk, labelled with its heading and page range; front matter is not staged', () => {
  const md = [
    '# Front matter, never staged', 'About this summary.', '',
    `## Dialectic (pp. 59–68)`, words(30, 'alpha'), '',
    `## The criterion (pp. 80–98)`, words(30, 'beta'), '',
    `## A single page (p. 187)`, words(300, 'gamma'),
  ].join('\n');
  const r = build(summarySource, [file(md)]);
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  const body = r.chunks.filter((c) => c.kind === 'body');
  assert.equal(body.length, 3, 'short sections are not merged');
  assert.deepEqual(body.map((c) => c.section_label), ['Dialectic (pp. 59–68)', 'The criterion (pp. 80–98)', 'A single page (pp. 187)']);
  assert.deepEqual(body.map((c) => c.printed_pages), ['59–68', '80–98', '187']);
  assert.ok(body.every((c) => c.locator === null));
  assert.doesNotMatch(body.map((c) => c.chunk_text).join(' '), /Front matter|About this summary/);
  assert.equal(r.licenseEvidence, 'Our own summary of a public domain work.');
});

test('summary: a heading without a page range or an overlong section is refused', () => {
  const noRange = build(summarySource, [file(`## Dialectic\n${words(40)}`)]);
  assert.equal(noRange.ok, false);
  assert.match(noRange.reasons.join(' '), /without a page range/);
  const long = build(summarySource, [file(`## Physics (pp. 109–214)\n${words(750)}`)]);
  assert.equal(long.ok, false);
  assert.match(long.reasons.join(' '), /750 words/);
});

test('summary: CRLF line endings never reach chunk text', () => {
  const r = build(summarySource, [file(`## Dialectic (pp. 59–68)\r\n${words(30, 'alpha')}\r\n\r\n${words(30, 'beta')}\r\n`)]);
  assert.equal(r.ok, true, r.reasons && r.reasons.join('; '));
  assert.ok(r.chunks.every((c) => !c.chunk_text.includes('\r')));
  assert.equal(r.chunks[0].section_label, 'Dialectic (pp. 59–68)');
});

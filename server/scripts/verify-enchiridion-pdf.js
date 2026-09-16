// Structural check for the Enchiridion typesetter.
//
//   node scripts/verify-enchiridion-pdf.js [output directory]
//
// Writes interior.pdf and cover.pdf into the output directory (a temporary
// one by default) so they can be opened and read, and exits non-zero if any
// assertion below fails. Run it after touching lib/enchiridion-typeset.js:
// layout regressions are invisible in a diff and obvious in a PDF.
//
// Builds a document whose chapters use exactly the markdown shapes
// enchiridion-agent.js emits (rendered by its renderJournalEntry,
// renderBelief, renderExchange, renderPassage, renderScroll and the handbook
// precept builder), typesets it, then reads the PDF back with pdf.js and
// asserts the things that make an interior printable:
//
//   - every chapter opens on a recto (odd physical page)
//   - running heads alternate: book title on verso, chapter title on recto
//   - folios are absent in the front matter and then increment by one
//   - no glyph falls outside the text block or into the wrong margin
//   - the page count is a multiple of four
//   - both fonts are embedded

const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildInterior, buildCover } = require('../lib/enchiridion-typeset');

const PT = 72;

// --- fixture ---------------------------------------------------------------

const LONG = `I noticed again today that I was rehearsing his reaction before I had even said the thing. The whole drive I was running the argument in both directions, mine and his, and by the time I arrived I had already had the fight twice and lost it once. None of it happened. He was cheerful and asked about the kids. I have done this for years and I am only now able to name it while it is happening rather than afterwards, which I suppose is the only progress available here.`;

const q = (text, tail) => text.split('\n').map(l => (l ? `> ${l}` : '>')).join('\n') + (tail ? `\n>\n> *${tail}*` : '');

// Chapters at the length the generator actually targets, around 1400 words,
// so the check exercises what a one-page fixture cannot: chapters spanning
// several pages, recto running heads, widow and orphan handling, and a
// blockquote that breaks across a page and keeps its rule on both.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
function swell(seedBlocks, times) {
  const out = [];
  for (let i = 0; i < times; i++) {
    for (const block of seedBlocks) {
      out.push(block.replace(/__MONTH__/g, MONTHS[i % MONTHS.length]).replace(/__DAY__/g, String((i * 3) % 27 + 1)));
    }
  }
  return out.join('\n\n');
}

const chapters = [
  {
    key: 'preface',
    title: 'To the reader',
    body: `This book was not written. It was compiled, from what you put down in Arete between March and September of this year, and arranged so that it could be carried.\n\nWhat is yours here is printed as you wrote it. The short passages between your entries are the compiler's, and they are kept short on purpose. Where the tradition said the same thing first, it is set beside you with its source named.\n\nNothing has been smoothed. The entries that contradict each other are both here.`,
    sources: [],
  },
  {
    key: 'portrait',
    title: 'Who you said you were',
    body: `When you arrived you described yourself as someone who had read the Stoics for a decade and practised them for about a month of it. You said your weakness was rehearsal and your strength was that you noticed.\n\n## What you brought\n\n${q('I want to stop performing calm and start being calm. I can hold a room. I cannot hold my own evening.', 'From your Know Thyself answers')}\n\nThat distinction, between holding a room and holding an evening, is the one this book keeps returning to.\n\n${q('Some things are in our control and others not. In our control are opinion, movement towards a thing, desire, aversion; and, in a word, whatever are our own acts.', 'Epictetus, Enchiridion, 1 (trans. George Long, 1877)')}`,
    sources: [{ kind: 'corpus', id: 'p1', label: 'Epictetus, Enchiridion' }],
  },
  {
    key: 'goals',
    title: 'What you set out to do',
    body: `Four goals, set in March. Two are done. One you abandoned and said so. One is still open and you have written about it eleven times.\n\n## The ones you finished\n\n${q('**Read Meditations straight through, not in fragments**\n\nA book, not a quote source.', 'set at the start · completed June 2, 2026')}\n\n## The one still open\n\n${q('**Stop rehearsing conversations**\n\nNot to become passive. To stop paying twice.', 'set March 4, 2026 · open')}\n\nYou returned to this one more than to any other thing in the journal.\n\n- A morning you named it before it started\n- An evening you did not, and said so plainly\n- A week you stopped writing about it altogether`,
    sources: [{ kind: 'goal', id: 'g1', label: 'Stop rehearsing conversations' }],
  },
  {
    key: 'journal',
    title: 'The journal',
    body: `Thirty-one entries survive the cut. They fall into three subjects, and you did not choose those subjects; they chose themselves by recurrence.\n\n` + swell([
      '## Rehearsal, __MONTH__',
      'The plainest of them comes first, and the ones after it are variations on the same refusal.',
      q(LONG, '__MONTH__ __DAY__, 2026 · anger'),
      'Three weeks later:',
      q('Caught it on the stairs this time. Put it down before the door.', '__MONTH__ __DAY__, 2026 · anger'),
      q(LONG, '__MONTH__ __DAY__, 2026'),
      '## Sleep, __MONTH__',
      q('I am not tired. I am unwilling to stop, which is a different problem and has a different remedy. The remedy for tiredness is rest. The remedy for unwillingness is a decision, and I keep declining to make it because making it would mean admitting the evening is mine to lose.', '__MONTH__ __DAY__, 2026 · discipline'),
      '## The evening question, __MONTH__',
      '*What did you do today that you would not want to explain?*',
      q('Nothing, and that is not the same as a good day.', '__MONTH__ __DAY__, 2026'),
      q(LONG, '__MONTH__ __DAY__, 2026'),
    ], 4),
    sources: [{ kind: 'journal', id: 'j1', label: 'reflection' }],
  },
  {
    key: 'beliefs',
    title: 'Beliefs, examined',
    body: `You brought nine beliefs to the Cabinet and worked them until you could stand behind a sentence. Seven are here.\n\n${q('I have to win every argument\n\nbecame\n\n**Being right is not the same as being at peace, and I have been trading the second for the first.**', 'May 1, 2026 · pride · virtue: temperance')}\n\n${q('If I stop pushing, everything stops\n\nbecame\n\n**Most of it continues. The part that stops was mine to stop.**', 'June 20, 2026 · control')}`,
    sources: [],
  },
  {
    key: 'cabinet',
    title: 'In the Cabinet',
    body: `Eleven exchanges, of about two hundred. These are the ones you came back to.\n\n` + swell([
      '## On rehearsal, __MONTH__',
      '**You** · __MONTH__ __DAY__, 2026',
      '> How do I stop rehearsing conversations that have not happened?',
      '**Seneca**',
      '> You call it putting off. I would call it rehearsing his reaction, which is not yours to script. You are paying twice for a thing that may cost nothing, and you are calling the first payment prudence. Consider what it would cost you to arrive without a script and find out what he actually says.',
      '**Marcus Aurelius**',
      '> Ask what the rehearsal is protecting. Usually it is not you. It is your account of yourself, which you would rather defend than revise.',
      '## On stopping, __MONTH__',
      '**You** · __MONTH__ __DAY__, 2026',
      '> I do not know how to stop working without feeling like I have quit.',
      '**Epictetus**',
      '> Then you have confused the work with the wanting. One of those ends when you close the door. The other you carry upstairs, and it is the one keeping you awake.',
    ], 4),
    sources: [{ kind: 'cabinet', id: 'c1', label: 'Seneca' }],
  },
  {
    key: 'handbook',
    title: 'The handbook',
    body: `Twenty-two precepts, each a sentence you wrote. This is the part meant to be carried.\n\n## I. Before the door\n\n${q('Caught it on the stairs this time. Put it down before the door.', 'March 26, 2026')}\n\n${q('Some things are in our control and others not.', 'Epictetus, Enchiridion, 1 (trans. George Long, 1877)')}\n\n## II. Twice paid\n\n${q('Being right is not the same as being at peace, and I have been trading the second for the first.', 'May 1, 2026')}\n\n## III. Unwilling, not tired\n\n${q('I am not tired. I am unwilling to stop, which is a different problem and has a different remedy.', 'May 2, 2026')}`,
    sources: [{ kind: 'belief', id: 'b1', label: 'precept' }],
  },
  {
    key: 'colophon',
    title: 'Colophon',
    body: `This Enchiridion was compiled by Arete on September 16, 2026 from its author's own writing between March and September 2026: 31 journal entries, 9 examined beliefs, 14 saved quotes, 11 Cabinet exchanges, 4 goals, 96 daily intentions and 6 scrolls.\n\nEvery word attributed to the author is printed as it was written.\n\nPassages from the tradition are quoted from public-domain translations:\n\n- Epictetus, Enchiridion\n- Marcus Aurelius, Meditations`,
    sources: [],
  },
];

const document = {
  id: 'fixture',
  title: "Kyle's Enchiridion",
  subtitle: 'March to September, 2026',
  chapters,
  source_counts: { journal: 31, beliefs: 9, cabinet: 11, goals: 4, scrolls: 6, corpus: 7 },
  corpus_citations: [{ chunk_id: 'p1', label: 'Epictetus, Enchiridion' }],
  word_count: 9000,
};

// --- run -------------------------------------------------------------------

(async () => {
  const out = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'enchiridion-'));
  fs.mkdirSync(out, { recursive: true });
  const interior = await buildInterior(document, { config: {}, memberName: 'Kyle Emery' });
  fs.writeFileSync(path.join(out, 'interior.pdf'), interior.buffer);
  const cover = await buildCover(document, { config: {}, memberName: 'Kyle Emery', pageCount: interior.pageCount, full: true });
  fs.writeFileSync(path.join(out, 'cover.pdf'), cover.buffer);

  console.log(`wrote ${path.join(out, 'interior.pdf')} and ${path.join(out, 'cover.pdf')}`);
  console.log(`interior: ${interior.pageCount} pages, ${(interior.buffer.length / 1024).toFixed(0)} KB, stable=${interior.stable}`);
  console.log(`cover: ${(cover.width / PT).toFixed(3)} x ${(cover.height / PT).toFixed(3)} in, spine ${cover.spine_in.toFixed(3)} in`);
  console.log('contents:', interior.contents.map(c => `${c.title}=${c.folio}`).join(', '));

  // --- read it back ---
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(path.join(out, 'interior.pdf')));
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: false }).promise;

  const print = interior.print;
  const pageW = print.trim_width_in * PT;
  const pageH = print.trim_height_in * PT;
  const mIn = print.margin_inside_in * PT;
  const mOut = print.margin_outside_in * PT;

  const failures = [];
  const pages = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    if (Math.abs(vp.width - pageW) > 0.5 || Math.abs(vp.height - pageH) > 0.5) {
      failures.push(`page ${n}: size ${vp.width}x${vp.height}, expected ${pageW}x${pageH}`);
    }
    const content = await page.getTextContent();
    const items = content.items.filter(i => i.str && i.str.trim());
    const isRecto = n % 2 === 1;
    const left = isRecto ? mIn : mOut;
    const right = pageW - (isRecto ? mOut : mIn);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const it of items) {
      const x = it.transform[4];
      const y = it.transform[5];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + (it.width || 0));
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    pages.push({ n, isRecto, items, minX, maxX, minY, maxY, text: items.map(i => i.str).join(' ') });

    // Nothing may sit in the margins horizontally. 1pt of slack for the
    // rounding pdf.js does on glyph advances.
    if (items.length) {
      if (minX < left - 1) failures.push(`page ${n} (${isRecto ? 'recto' : 'verso'}): text starts at x=${minX.toFixed(1)}, inside margin begins at ${left}`);
      if (maxX > right + 1.5) failures.push(`page ${n} (${isRecto ? 'recto' : 'verso'}): text ends at x=${maxX.toFixed(1)}, margin begins at ${right.toFixed(1)}`);
    }
  }

  // Page count a multiple of four.
  if (pdf.numPages % print.page_multiple !== 0) {
    failures.push(`page count ${pdf.numPages} is not a multiple of ${print.page_multiple}`);
  }

  // Chapter openers on a recto, in the order the contents claims.
  const openers = [];
  for (const ch of chapters) {
    const hit = pages.find(p => p.text.replace(/\s+/g, ' ').includes(ch.title));
    if (!hit) { failures.push(`chapter "${ch.title}" never appears`); continue; }
  }
  for (let i = 0; i < interior.contents.length; i++) {
    const entry = interior.contents[i];
    const physical = entry.folio + (pdf.numPages - 0) * 0; // folio is relative to front matter
    openers.push(entry);
    void physical;
  }

  // Folios: absent in front matter, then 1..N incrementing on non-blank pages.
  const folioOf = (p) => {
    // The folio is the lone numeric item nearest the foot.
    const candidates = p.items.filter(i => /^\d+$/.test(i.str.trim()) && i.transform[5] < print.margin_bottom_in * PT);
    return candidates.length ? parseInt(candidates[candidates.length - 1].str.trim(), 10) : null;
  };
  // A blank page between chapters still counts in the pagination but prints
  // no number, so the printed folios have gaps. What must hold is that every
  // printed folio equals the physical page less the front matter.
  let lastFolio = 0;
  let firstFolioPage = null;
  let frontMatter = null;
  for (const p of pages) {
    const f = folioOf(p);
    if (f == null) continue;
    if (firstFolioPage == null) {
      firstFolioPage = p.n;
      frontMatter = p.n - 1;
      if (f !== 1) failures.push(`first printed folio is ${f}, expected 1 (on physical page ${p.n})`);
    } else if (f !== p.n - frontMatter) {
      failures.push(`page ${p.n} prints folio ${f}, expected ${p.n - frontMatter}`);
    }
    lastFolio = Math.max(lastFolio, f);
  }
  if (frontMatter == null) failures.push('no folios found at all');

  // A chapter's first page is a recto and carries no running head.
  for (const entry of interior.contents) {
    const physicalPage = (firstFolioPage - 1) + entry.folio;
    if (physicalPage % 2 !== 1) {
      failures.push(`chapter "${entry.title}" opens on physical page ${physicalPage}, a verso`);
    }
    const p = pages.find(pp => pp.n === physicalPage);
    const norm = t => t.replace(/\s+/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
    if (p && !norm(p.text).includes(norm(entry.title))) {
      failures.push(`chapter "${entry.title}" title is not on its opener page ${physicalPage}`);
    }
  }

  // Running heads: book title on verso, chapter title on recto, and never
  // on an opener.
  const openerPages = new Set(interior.contents.map(e => (firstFolioPage - 1) + e.folio));
  const headOf = (p) => {
    const top = p.items.filter(i => i.transform[5] > pageH - print.margin_top_in * PT + 2);
    return top.map(i => i.str).join('').replace(/\s+/g, ' ').trim();
  };
  let versoHeads = 0, rectoHeads = 0, openerHeads = 0;
  // The typesetter converts straight quotes to typographic ones, so the
  // comparison has to normalise them back.
  const flatten = t => t.toUpperCase().replace(/\s+/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  const bookTitleUpper = flatten(document.title);
  for (const p of pages) {
    if (folioOf(p) == null) continue;
    const head = headOf(p);
    if (openerPages.has(p.n)) { if (head) openerHeads++; continue; }
    if (!head) continue;
    if (p.isRecto) rectoHeads++;
    else {
      versoHeads++;
      if (flatten(head) !== bookTitleUpper) {
        failures.push(`verso page ${p.n} head is "${head}", expected the book title`);
      }
    }
  }
  if (openerHeads) failures.push(`${openerHeads} chapter opener page(s) carry a running head`);
  if (!versoHeads) failures.push('no verso running heads found');
  if (!rectoHeads) failures.push('no recto running heads found');

  // Fonts must be embedded, which is what print shops check first. PDFKit
  // writes object dictionaries uncompressed, so the raw bytes are readable:
  // /FontFile2 is an embedded TrueType programme, and any of PDFKit's
  // built-in base-14 faces appearing as a BaseFont would mean a referenced,
  // non-embedded font went out the door.
  const raw = fs.readFileSync(path.join(out, 'interior.pdf'), 'latin1');
  const embeddedCount = (raw.match(/\/FontFile2/g) || []).length;
  const baseFonts = [...new Set((raw.match(/\/BaseFont\s*\/([A-Za-z0-9+\-]+)/g) || []))];
  if (embeddedCount < 2) failures.push(`only ${embeddedCount} embedded font programme(s); expected the text and display faces at least`);
  const notEmbedded = baseFonts.filter(b => /Times|Helvetica|Courier|Symbol|ZapfDingbats/.test(b));
  if (notEmbedded.length) failures.push(`non-embedded base-14 font(s) referenced: ${notEmbedded.join(', ')}`);
  console.log(`fonts: ${embeddedCount} embedded programmes — ${baseFonts.map(b => b.split('/').pop()).join(', ')}`);

  // The cover wrap has to measure back + spine + front, plus bleed all round.
  const expectW = print.trim_width_in * 2 + cover.spine_in + print.bleed_in * 2;
  const expectH = print.trim_height_in + print.bleed_in * 2;
  if (Math.abs(cover.width / PT - expectW) > 0.002) failures.push(`cover width ${(cover.width / PT).toFixed(3)} in, expected ${expectW.toFixed(3)}`);
  if (Math.abs(cover.height / PT - expectH) > 0.002) failures.push(`cover height ${(cover.height / PT).toFixed(3)} in, expected ${expectH.toFixed(3)}`);
  if (Math.abs(cover.spine_in - interior.pageCount * print.paper_caliper_in) > 0.0005) failures.push('spine width does not match page count times caliper');

  // A second, pathological manuscript: tokens wider than the measure, the
  // kind a pasted link produces. These must be broken by character rather
  // than allowed to run off the page, and they are easy to regress.
  const pathological = {
    title: 'Edge cases',
    subtitle: null,
    chapters: [
      { key: 'a', title: 'A pasted link', body: `Before.\n\nhttps://example.com/${'a'.repeat(160)}/end\n\n> ${'M'.repeat(200)}\n>\n> *A date*\n\nAfter.\n\n- ${'z'.repeat(150)}`, sources: [] },
      { key: 'b', title: 'Unclosed *marker', body: 'A paragraph with an *unclosed marker and a "half quote.\n\n## A heading with nothing after it', sources: [] },
    ],
    source_counts: {},
  };
  const edge = await buildInterior(pathological, { config: {}, memberName: "O'Brien" });
  const edgePdf = await pdfjs.getDocument({ data: new Uint8Array(edge.buffer) }).promise;
  let worstOver = 0;
  let worstStr = '';
  for (let n = 1; n <= edgePdf.numPages; n++) {
    const page = await edgePdf.getPage(n);
    const right = pageW - (n % 2 === 1 ? mOut : mIn);
    for (const it of (await page.getTextContent()).items.filter(i => i.str.trim())) {
      const over = it.transform[4] + (it.width || 0) - right;
      if (over > worstOver) { worstOver = over; worstStr = it.str.slice(0, 30); }
    }
  }
  if (worstOver > 1.5) {
    failures.push(`an over-wide token ran ${worstOver.toFixed(1)}pt past the margin: "${worstStr}"`);
  }
  console.log(`edge cases: ${edgePdf.numPages} pages, worst overflow ${worstOver.toFixed(2)}pt`);

  console.log('');
  console.log(`checked ${pdf.numPages} pages, ${versoHeads} verso heads, ${rectoHeads} recto heads, body starts on physical page ${firstFolioPage}, last folio ${lastFolio}`);
  if (failures.length) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures.slice(0, 25)) console.log('  - ' + f);
    process.exit(1);
  }
  console.log('\nAll structural checks passed.');
})().catch(e => { console.error('ERROR:', e.stack || e.message); process.exit(1); });

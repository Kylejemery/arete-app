// server/lib/enchiridion-typeset.js
//
// Typesets an enchiridion_documents row into a print-ready interior PDF and
// a cover PDF. This is the step between "the manuscript exists" and "a
// printer can make the book."
//
// Why a real typesetter and not HTML to PDF: a book interior needs things a
// browser will not give you without a fight. Mirrored gutters so the inside
// margin clears the binding, chapters that open on a right-hand page,
// running heads that name the book on the left and the chapter on the right,
// folios that skip the front matter, no single lines stranded at the top or
// bottom of a page, and a page count padded to a multiple of four because
// that is how signatures are folded. PDFKit gives exact control over all of
// it and needs no Chromium on the Railway box.
//
// Fonts are embedded, which print shops require and PDFKit's built-in
// Times-Roman cannot do (the standard 14 are referenced, not embedded). The
// faces are the two Garamonds the design system already uses on the web:
// EB Garamond for reading text, because it was drawn for text at size, and
// Cormorant Garamond for display, because it is the Library face. Both are
// SIL Open Font License, shipped as TTFs by the @expo-google-fonts packages
// this file depends on, so nothing binary lives in the repo.
//
// The interior is black ink by default. A colour interior costs several
// times more per copy at every print-on-demand vendor, so gold is opt-in
// through print.color_interior and the cover carries the brand instead.
//
// Two passes: the table of contents needs the folio each chapter starts on,
// which is only known after the body is laid out. The first pass collects
// them, the second prints them. This converges because the contents pages
// are sized from the chapter titles, which do not change between passes.

const PDFDocument = require('pdfkit');

const PT_PER_IN = 72;
const inches = n => n * PT_PER_IN;

// Defaults are a 5 x 8 inch handbook: the classic pocket trim, offered by
// every print-on-demand vendor, and a 261pt measure that lands around 60
// characters a line, which is where reading is easiest. Margins are
// asymmetric on purpose, the inside one wider to clear the binding.
const PRINT_DEFAULTS = Object.freeze({
  trim_width_in: 5,
  trim_height_in: 8,
  margin_inside_in: 0.75,
  margin_outside_in: 0.625,
  margin_top_in: 0.7,
  margin_bottom_in: 0.7,

  body_size: 11,
  body_leading: 15.5,
  quote_size: 10,
  quote_leading: 14,
  heading_size: 9.5,
  chapter_title_size: 20,
  running_head_size: 8,
  folio_size: 9.5,

  color_interior: false,
  // Bleed applies to the cover only; the interior carries no images, so it
  // needs none.
  bleed_in: 0.125,
  // Inches of spine per interior page. 0.0032 is the usual figure for the
  // 50lb uncoated white stock print-on-demand vendors default to; check it
  // against whichever printer you choose before ordering a cover.
  paper_caliper_in: 0.0032,
  // Signatures fold in fours, so vendors want the page count to be a
  // multiple of this.
  page_multiple: 4,
});

const INK = '#1a1a2e';
const GOLD = '#c9a84c';
const BLACK = '#111111';

function fontPath(pkg, file) {
  return require.resolve(`@expo-google-fonts/${pkg}/${file}`);
}

const FONTS = {
  body: () => fontPath('eb-garamond', '400Regular/EBGaramond_400Regular.ttf'),
  bodyItalic: () => fontPath('eb-garamond', '400Regular_Italic/EBGaramond_400Regular_Italic.ttf'),
  bodyBold: () => fontPath('eb-garamond', '600SemiBold/EBGaramond_600SemiBold.ttf'),
  bodyBoldItalic: () => fontPath('eb-garamond', '600SemiBold_Italic/EBGaramond_600SemiBold_Italic.ttf'),
  display: () => fontPath('cormorant-garamond', '400Regular/CormorantGaramond_400Regular.ttf'),
  displayMedium: () => fontPath('cormorant-garamond', '500Medium/CormorantGaramond_500Medium.ttf'),
  displayItalic: () => fontPath('cormorant-garamond', '400Regular_Italic/CormorantGaramond_400Regular_Italic.ttf'),
};

// ---------------------------------------------------------------------------
// Markdown the generator actually emits
// ---------------------------------------------------------------------------
//
// enchiridion-agent.js writes a deliberately small subset: paragraphs,
// `##` section headings, `>` blockquotes that may run to several
// paragraphs, `- ` lists, and `**bold**` / `*italic*` inline. Anything else
// falls through as a paragraph rather than being dropped, so a future
// chapter builder cannot silently lose text.

function parseBlocks(markdown) {
  const blocks = [];
  const chunks = String(markdown || '').replace(/\r/g, '').split(/\n{2,}/);
  for (const raw of chunks) {
    const chunk = raw.replace(/\s+$/, '');
    if (!chunk.trim()) continue;
    const lines = chunk.split('\n');

    if (lines.every(l => l.startsWith('>'))) {
      // A blockquote's own paragraphs are separated by bare `>` lines.
      const inner = lines.map(l => l.replace(/^>\s?/, ''));
      const paras = [];
      let current = [];
      for (const line of inner) {
        if (!line.trim()) {
          if (current.length) { paras.push(current.join(' ')); current = []; }
        } else {
          current.push(line.trim());
        }
      }
      if (current.length) paras.push(current.join(' '));
      if (paras.length) blocks.push({ type: 'quote', paragraphs: paras });
      continue;
    }

    if (lines.every(l => /^-\s+/.test(l))) {
      blocks.push({ type: 'list', items: lines.map(l => l.replace(/^-\s+/, '').trim()) });
      continue;
    }

    const first = lines[0];
    if (/^#{1,6}\s+/.test(first)) {
      const level = (first.match(/^#+/) || ['#'])[0].length;
      const text = first.replace(/^#{1,6}\s+/, '').trim();
      blocks.push({ type: 'heading', level, text: typographic(text) });
      const rest = lines.slice(1).join(' ').trim();
      if (rest) blocks.push({ type: 'paragraph', text: rest });
      continue;
    }

    blocks.push({ type: 'paragraph', text: lines.join(' ').trim() });
  }
  return blocks;
}

// Straight quotes are what a phone keyboard produces and what a printed
// book must never show. Opening forms are matched first so everything left
// over closes.
function typographic(text) {
  return String(text)
    .replace(/(^|[\s([{<\u2014\u2013])"/g, '$1\u201c')
    .replace(/"/g, '\u201d')
    .replace(/(^|[\s([{<\u2014\u2013])'/g, '$1\u2018')
    .replace(/'/g, '\u2019');
}

// `**bold**` and `*italic*` into styled runs. Unmatched markers stay as
// literal characters rather than swallowing the rest of a paragraph.
function parseInline(raw) {
  const text = typographic(raw);
  const runs = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), bold: false, italic: false });
    const tok = m[0];
    if (tok.startsWith('**')) runs.push({ text: tok.slice(2, -2), bold: true, italic: false });
    else runs.push({ text: tok.slice(1, -1), bold: false, italic: true });
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false, italic: false });
  return runs.filter(r => r.text.length);
}

// ---------------------------------------------------------------------------
// The typesetter
// ---------------------------------------------------------------------------

class Interior {
  constructor(doc, { print, title, subtitle, memberName, chapters, chapterFolios }) {
    this.doc = doc;
    this.p = print;
    this.title = typographic(title || 'Enchiridion');
    this.subtitle = typographic(subtitle || '');
    this.memberName = typographic(memberName || '');
    this.chapters = chapters;
    // Pass 1 passes null; pass 2 passes the folios pass 1 collected.
    this.knownFolios = chapterFolios || null;

    this.pageW = inches(print.trim_width_in);
    this.pageH = inches(print.trim_height_in);
    this.mInside = inches(print.margin_inside_in);
    this.mOutside = inches(print.margin_outside_in);
    this.mTop = inches(print.margin_top_in);
    this.mBottom = inches(print.margin_bottom_in);
    this.textW = this.pageW - this.mInside - this.mOutside;
    this.textTop = this.mTop;
    this.textBottom = this.pageH - this.mBottom;

    this.rule = print.color_interior ? GOLD : BLACK;
    this.ink = print.color_interior ? INK : BLACK;

    this.pageNo = 0;            // physical PDF page, 1-based
    this.frontMatterPages = 0;  // pages before the first chapter
    this.inFrontMatter = true;  // front matter takes no head and no folio
    this.blank = false;         // a deliberately empty page, never decorated
    this.y = this.textTop;
    this.runningHead = '';      // current chapter title, for recto heads
    this.suppressHead = false;  // chapter openers and blanks carry no head
    this.collected = [];        // { key, title, folio } per chapter, pass 1
  }

  // Recto is a right-hand page: odd physical page, inside margin on the left.
  get isRecto() { return this.pageNo % 2 === 1; }
  get left() { return this.isRecto ? this.mInside : this.mOutside; }
  get folio() {
    const n = this.pageNo - this.frontMatterPages;
    return n > 0 ? n : null;
  }

  font(kind) {
    this.doc.font(kind);
    return this.doc;
  }

  newPage({ suppressHead = false } = {}) {
    // The document is built with autoFirstPage off, so every page including
    // the half title is added here and pageNo stays the true physical count.
    this.doc.addPage();
    this.pageNo += 1;
    this.suppressHead = suppressHead;
    this.y = this.textTop;
  }

  // A blank verso, used to push the next chapter onto a recto. It carries
  // neither a head nor a folio, which is what a blank page means.
  blankPage() {
    this.newPage({ suppressHead: true });
    this.blank = true;
  }

  trackedText(text, x, y, { size, font = 'body', tracking = 1.2, color, width, align = 'left' }) {
    const doc = this.doc;
    doc.font(font).fontSize(size).fillColor(color || this.ink);
    const w = doc.widthOfString(text, { characterSpacing: tracking });
    let drawX = x;
    if (align === 'center') drawX = x + (width - w) / 2;
    if (align === 'right') drawX = x + width - w;
    doc.text(text, drawX, y, { lineBreak: false, characterSpacing: tracking });
    return w;
  }

  // Running head and folio. Drawn after a page's text so they never affect
  // the flow, and skipped on blanks, openers and front matter.
  decoratePage({ head, folio }) {
    const doc = this.doc;
    if (head) {
      const y = this.mTop - this.p.running_head_size - 10;
      this.trackedText(head.toUpperCase(), this.left, y, {
        size: this.p.running_head_size,
        tracking: 1.6,
        color: this.ink,
        width: this.textW,
        align: 'center',
      });
    }
    if (folio != null) {
      const y = this.textBottom + 16;
      doc.font('body').fontSize(this.p.folio_size).fillColor(this.ink);
      const s = String(folio);
      const w = doc.widthOfString(s);
      doc.text(s, this.left + (this.textW - w) / 2, y, { lineBreak: false });
    }
  }

  // --- line breaking -------------------------------------------------------

  fontFor(run, base) {
    if (base === 'display') return run.italic ? 'displayItalic' : 'display';
    if (run.bold && run.italic) return 'bodyBoldItalic';
    if (run.bold) return 'bodyBold';
    if (run.italic) return 'bodyItalic';
    return 'body';
  }

  // Words carry their own styled fragments, because bold can begin partway
  // through a word ("**Being** right") and the pieces must stay one unit.
  //
  // `maxWidth` is the measure. A token wider than the whole measure, which
  // in practice means a pasted link, is broken by character rather than
  // allowed to run off the page; everything else stays whole.
  tokenize(runs, size, base, maxWidth = Infinity) {
    const doc = this.doc;
    const words = [];
    let frags = [];

    const splitWide = (wordFrags) => {
      const pieces = [];
      let current = [];
      let width = 0;
      for (const frag of wordFrags) {
        doc.font(this.fontFor(frag, base)).fontSize(size);
        let buffer = '';
        for (const char of frag.text) {
          const charW = doc.widthOfString(char);
          if (buffer && width + charW > maxWidth) {
            current.push({ ...frag, text: buffer });
            pieces.push({ frags: current, width });
            current = [];
            buffer = '';
            width = 0;
          }
          buffer += char;
          width += charW;
        }
        if (buffer) current.push({ ...frag, text: buffer });
      }
      if (current.length) pieces.push({ frags: current, width });
      return pieces;
    };

    const flush = () => {
      if (!frags.length) return;
      let width = 0;
      for (const f of frags) {
        doc.font(this.fontFor(f, base)).fontSize(size);
        width += doc.widthOfString(f.text);
      }
      if (width > maxWidth) {
        words.push(...splitWide(frags));
      } else {
        words.push({ frags, width });
      }
      frags = [];
    };
    for (const run of runs) {
      const parts = run.text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) flush();
        else frags.push({ text: part, bold: run.bold, italic: run.italic });
      }
    }
    flush();
    return words;
  }

  // `firstWidth` narrows only the opening line, which is what a first-line
  // indent actually needs; breaking every line at the narrow measure would
  // lose a word's worth of space on every line of the paragraph.
  breakLines(words, size, width, base, firstWidth = null) {
    this.doc.font(base === 'display' ? 'display' : 'body').fontSize(size);
    const spaceW = this.doc.widthOfString(' ');
    const lines = [];
    let line = [];
    let w = 0;
    let limit = firstWidth == null ? width : firstWidth;
    for (const word of words) {
      const add = line.length ? spaceW + word.width : word.width;
      if (line.length && w + add > limit) {
        lines.push({ words: line, width: w });
        line = [word];
        w = word.width;
        limit = width;
      } else {
        line.push(word);
        w += add;
      }
    }
    if (line.length) lines.push({ words: line, width: w });
    return { lines, spaceW };
  }

  drawLine(line, x, y, { size, base, width, justify, spaceW }) {
    const doc = this.doc;
    const gaps = line.words.length - 1;
    let space = spaceW;
    if (justify && gaps > 0) {
      const needed = width - line.width;
      const stretched = spaceW + needed / gaps;
      // Beyond roughly three times the natural space the line turns into a
      // river, so it stays ragged instead.
      if (stretched > 0 && stretched < spaceW * 3) space = stretched;
    }
    let cursor = x;
    for (let i = 0; i < line.words.length; i++) {
      const word = line.words[i];
      for (const frag of word.frags) {
        doc.font(this.fontFor(frag, base)).fontSize(size).fillColor(this.ink);
        doc.text(frag.text, cursor, y, { lineBreak: false });
        cursor += doc.widthOfString(frag.text);
      }
      if (i < gaps) cursor += space;
    }
  }

  // --- flowing blocks ------------------------------------------------------

  room(height) {
    return this.y + height <= this.textBottom;
  }

  // Lay out a run of lines, breaking pages as needed, and never leaving one
  // line of a multi-line paragraph alone at the foot or head of a page.
  flowLines(lines, { size, leading, base, indentFirst = 0, indentAll = 0, justify = false, spaceW, onSegment = null }) {
    const total = lines.length;
    let i = 0;
    while (i < total) {
      let fits = Math.floor((this.textBottom - this.y) / leading);
      if (fits <= 0) {
        this.endPage();
        this.newPage();
        fits = Math.floor((this.textBottom - this.y) / leading);
      }
      const remaining = total - i;
      let take = Math.min(fits, remaining);

      // An orphan: a single opening line stranded at the foot.
      if (i === 0 && total > 1 && take === 1) {
        this.endPage();
        this.newPage();
        fits = Math.floor((this.textBottom - this.y) / leading);
        take = Math.min(fits, remaining);
      }
      // A widow: one closing line stranded at the head. Break a line early
      // so two travel together.
      if (remaining - take === 1 && take >= 2) take -= 1;

      const startY = this.y;
      for (let n = 0; n < take; n++) {
        const line = lines[i + n];
        const isLast = i + n === total - 1;
        const indent = (i + n === 0 ? indentFirst : 0) + indentAll;
        const x = this.left + indent;
        const width = this.textW - indent;
        this.drawLine(line, x, this.y, {
          size, base, width, spaceW,
          justify: justify && !isLast,
        });
        this.y += leading;
      }
      if (onSegment && take > 0) {
        onSegment({
          page: this.pageNo,
          top: startY - size * 0.15,
          bottom: this.y - leading + size * 0.95,
        });
      }
      i += take;
      if (i < total) { this.endPage(); this.newPage(); }
    }
  }

  paragraph(text, { indentFirst = 0, spaceAfter = 0 } = {}) {
    const size = this.p.body_size;
    // Split against the narrowest line the paragraph has, which is the
    // indented first one, so a broken token fits wherever it lands.
    const words = this.tokenize(parseInline(text), size, 'body', this.textW - indentFirst);
    const { lines, spaceW } = this.breakLines(
      words, size, this.textW, 'body',
      indentFirst ? this.textW - indentFirst : null
    );
    this.flowLines(lines, {
      size,
      leading: this.p.body_leading,
      base: 'body',
      indentFirst,
      justify: true,
      spaceW,
    });
    this.y += spaceAfter;
  }

  // A quote and the attribution under it are one thing on the page. Flowing
  // each of its paragraphs separately let a one-line date strand itself at
  // the top of the next page, orphaned from the passage it belonged to, so
  // the whole block is measured first and broken as a unit.
  quote(paragraphs) {
    const size = this.p.quote_size;
    const leading = this.p.quote_leading;
    const indent = 18;
    const items = [];
    for (let n = 0; n < paragraphs.length; n++) {
      if (n) items.push({ gap: 5 });
      const measure = this.textW - indent - 8;
      const words = this.tokenize(parseInline(paragraphs[n]), size, 'body', measure);
      const { lines, spaceW } = this.breakLines(words, size, measure, 'body');
      for (const line of lines) items.push({ line, spaceW });
    }
    if (!items.length) return;
    this.y += 5;
    this.drawQuoteRule(this.placeQuote(items, { size, leading, indent }));
    this.y += 9;
  }

  // Places the quote's lines and inter-paragraph gaps, page by page, never
  // leaving fewer than two of its lines on either side of a break. Returns
  // the vertical extent it occupied on each page so the rule can be drawn.
  placeQuote(items, { size, leading, indent }) {
    const isLine = it => !!it.line;
    const height = it => (isLine(it) ? leading : it.gap);
    const total = items.length;
    const totalLines = items.filter(isLine).length;
    const KEEP = 2;

    // How many items starting at `from` fit in the space left on this page.
    const fitFrom = (from) => {
      let y = this.y;
      let end = from;
      while (end < total) {
        const h = height(items[end]);
        if (y + h > this.textBottom) break;
        y += h;
        end++;
      }
      // A trailing gap belongs with the paragraph that follows it.
      while (end > from && !isLine(items[end - 1])) end--;
      return end;
    };
    const linesIn = (from, to) => {
      let n = 0;
      for (let k = from; k < to; k++) if (isLine(items[k])) n++;
      return n;
    };

    const segments = [];
    let i = 0;
    let placed = 0;

    while (i < total) {
      if (this.y + leading > this.textBottom) { this.endPage(); this.newPage(); }
      let end = fitFrom(i);
      let here = linesIn(i, end);
      const left = totalLines - placed;

      // Nothing fits at all: the page is spent.
      if (end === i) { this.endPage(); this.newPage(); continue; }

      // An orphan, one opening line alone at the foot of a page.
      if (placed === 0 && here === 1 && left > 1) {
        this.endPage();
        this.newPage();
        end = fitFrom(i);
        here = linesIn(i, end);
      }

      // A widow, one closing line alone at the head of the next page. Send
      // a second line with it.
      if (left - here === 1 && here >= KEEP) {
        let back = end;
        while (back > i && !isLine(items[back - 1])) back--;
        if (back > i) back--;
        while (back > i && !isLine(items[back - 1])) back--;
        if (linesIn(i, back) >= 1) { end = back; here = linesIn(i, end); }
      }

      const top = this.y - size * 0.15;
      for (let k = i; k < end; k++) {
        const it = items[k];
        if (isLine(it)) {
          this.drawLine(it.line, this.left + indent, this.y, {
            size, base: 'body', width: this.textW - indent, justify: false, spaceW: it.spaceW,
          });
          this.y += leading;
        } else {
          this.y += it.gap;
        }
      }
      segments.push({ page: this.pageNo, top, bottom: this.y - leading + size * 0.95 });

      placed += here;
      i = end;
      if (i < total) { this.endPage(); this.newPage(); }
    }
    return segments;
  }

  // The 3px gold left rule the design system puts beside quoted matter. One
  // rule per page, spanning everything the quote put on that page, so a
  // quote broken across a spread reads as one quote and not as three.
  drawQuoteRule(segments) {
    if (!segments.length) return;
    const byPage = new Map();
    for (const seg of segments) {
      const cur = byPage.get(seg.page);
      if (cur) {
        cur.top = Math.min(cur.top, seg.top);
        cur.bottom = Math.max(cur.bottom, seg.bottom);
      } else {
        byPage.set(seg.page, { top: seg.top, bottom: seg.bottom });
      }
    }
    const current = this.pageNo - 1;
    for (const [page, span] of byPage) {
      const isRecto = page % 2 === 1;
      const x = (isRecto ? this.mInside : this.mOutside);
      this.doc.switchToPage(page - 1);
      this.doc.save()
        .lineWidth(1.5)
        .strokeColor(this.rule)
        .moveTo(x, span.top)
        .lineTo(x, span.bottom)
        .stroke()
        .restore();
    }
    this.doc.switchToPage(current);
  }

  list(items) {
    const size = this.p.body_size;
    const indent = 16;
    this.y += 3;
    for (const item of items) {
      const words = this.tokenize(parseInline(item), size, 'body', this.textW - indent);
      const { lines, spaceW } = this.breakLines(words, size, this.textW - indent, 'body');
      // The bullet is drawn at an absolute position, so the page break has
      // to happen before it, not after.
      if (!this.room(this.p.body_leading)) { this.endPage(); this.newPage(); }
      this.doc.font('body').fontSize(size).fillColor(this.ink)
        .text('\u00b7', this.left + 5, this.y, { lineBreak: false });
      this.flowLines(lines, {
        size, leading: this.p.body_leading, base: 'body',
        indentAll: indent, justify: false, spaceW,
      });
    }
    this.y += 6;
  }

  heading(text) {
    const size = this.p.heading_size;
    // A heading needs two lines of text under it or it moves to the next
    // page; a heading alone at the foot reads as a mistake.
    const needed = size + 10 + this.p.body_leading * 2;
    if (!this.room(needed)) { this.endPage(); this.newPage(); }
    this.y += 14;
    this.trackedText(text.toUpperCase(), this.left, this.y, {
      size, tracking: 1.5, color: this.rule, width: this.textW, align: 'left',
    });
    this.y += size + 9;
  }

  // --- pages ---------------------------------------------------------------

  endPage() {
    if (this.inFrontMatter) { this.blank = false; return; }
    if (this.blank) { this.blank = false; return; }
    if (this.suppressHead) {
      this.decoratePage({ head: null, folio: this.folio });
      return;
    }
    const head = this.isRecto ? this.runningHead : this.title;
    this.decoratePage({ head, folio: this.folio });
  }

  halfTitle() {
    this.newPage({ suppressHead: true });
    const doc = this.doc;
    const y = this.pageH * 0.32;
    doc.font('display').fontSize(17).fillColor(this.ink);
    const w = doc.widthOfString(this.title);
    doc.text(this.title, this.left + (this.textW - w) / 2, y, { lineBreak: false, width: this.textW });
  }

  titlePage() {
    this.newPage({ suppressHead: true });
    const doc = this.doc;
    const cx = this.left;
    let y = this.pageH * 0.24;

    this.trackedText('ARETE', cx, y, {
      size: 9, tracking: 3, color: this.rule, width: this.textW, align: 'center',
    });
    y += 46;

    doc.font('displayMedium').fontSize(this.p.chapter_title_size + 8).fillColor(this.ink);
    const titleLines = this.wrapDisplay(this.title, this.p.chapter_title_size + 8, this.textW);
    for (const line of titleLines) {
      const w = doc.widthOfString(line);
      doc.text(line, cx + (this.textW - w) / 2, y, { lineBreak: false });
      y += (this.p.chapter_title_size + 8) * 1.2;
    }

    y += 10;
    doc.save().lineWidth(0.75).strokeColor(this.rule)
      .moveTo(cx + this.textW / 2 - 26, y).lineTo(cx + this.textW / 2 + 26, y).stroke().restore();
    y += 22;

    if (this.subtitle) {
      doc.font('displayItalic').fontSize(12.5).fillColor(this.ink);
      for (const line of this.wrapDisplay(this.subtitle, 12.5, this.textW - 40, 'displayItalic')) {
        const w = doc.widthOfString(line);
        doc.text(line, cx + (this.textW - w) / 2, y, { lineBreak: false });
        y += 18;
      }
    }
  }

  imprintPage(counts) {
    this.newPage({ suppressHead: true });
    const doc = this.doc;
    let y = this.pageH - this.mBottom - 128;
    const lines = [
      this.memberName ? `Compiled for ${this.memberName}.` : 'Compiled for its author.',
      '',
      'Every word here attributed to the author was written by them, in Arete, and is printed as it was written. The prose between those words is the compiler\'s. Passages from the tradition are quoted from public-domain translations, credited where they appear.',
      '',
      'Arete · pursuearete.com',
      'This copy was made for its author and is not for resale.',
    ];
    doc.fillColor(this.ink);
    for (const line of lines) {
      if (!line) { y += 9; continue; }
      doc.font('body').fontSize(8.5);
      const wrapped = this.wrapDisplay(typographic(line), 8.5, this.textW, 'body');
      for (const w of wrapped) {
        doc.text(w, this.left, y, { lineBreak: false });
        y += 12;
      }
    }
    void counts;
  }

  // Simple wrapper for single-style display text.
  wrapDisplay(text, size, width, font = 'displayMedium') {
    const doc = this.doc;
    doc.font(font).fontSize(size);
    const words = typographic(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (line && doc.widthOfString(trial) > width) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Contents. Sized from the chapter titles, so its length is identical in
  // both passes and the body always starts on the same page.
  contentsPages() {
    const doc = this.doc;
    const entries = this.chapters;
    this.newPage({ suppressHead: true });
    let y = this.textTop + 24;
    this.trackedText('CONTENTS', this.left, y, {
      size: 9, tracking: 2.4, color: this.rule, width: this.textW, align: 'left',
    });
    y += 30;

    for (let i = 0; i < entries.length; i++) {
      const ch = entries[i];
      if (y + 20 > this.textBottom) {
        this.endPage();
        this.newPage({ suppressHead: true });
        y = this.textTop + 10;
      }
      doc.font('display').fontSize(11.5).fillColor(this.ink);
      const title = ch.title;
      const folio = this.knownFolios ? this.knownFolios[i] : null;
      const folioStr = folio != null ? String(folio) : '';
      const folioW = folioStr ? doc.widthOfString(folioStr) : 0;
      const titleMax = this.textW - folioW - 18;
      const titleLines = this.wrapDisplay(title, 11.5, titleMax, 'display');
      doc.text(titleLines[0], this.left, y, { lineBreak: false });
      if (folioStr) {
        doc.text(folioStr, this.left + this.textW - folioW, y, { lineBreak: false });
      }
      y += 17;
      for (const extra of titleLines.slice(1)) {
        doc.text(extra, this.left + 12, y, { lineBreak: false });
        y += 17;
      }
      y += 3;
    }
  }

  chapterOpener(ch, index) {
    // Chapters open on a recto. pageNo is the page just finished, so the
    // next one is pageNo + 1; if that would be a verso, a blank goes in.
    if ((this.pageNo + 1) % 2 !== 1) {
      this.blankPage();
      this.endPage();
    }

    this.newPage({ suppressHead: true });
    this.runningHead = ch.title;
    const doc = this.doc;

    // Sink: the title starts a quarter of the way down, which is what makes
    // a chapter opening feel like one.
    let y = this.textTop + this.pageH * 0.14;

    if (index >= 0) {
      this.trackedText(romanize(index + 1), this.left, y, {
        size: 9, tracking: 2.6, color: this.rule, width: this.textW, align: 'left',
      });
      y += 26;
    }

    doc.font('displayMedium').fontSize(this.p.chapter_title_size).fillColor(this.ink);
    for (const line of this.wrapDisplay(ch.title, this.p.chapter_title_size, this.textW - 30)) {
      doc.text(line, this.left, y, { lineBreak: false });
      y += this.p.chapter_title_size * 1.18;
    }

    y += 12;
    doc.save().lineWidth(1).strokeColor(this.rule)
      .moveTo(this.left, y).lineTo(this.left + 44, y).stroke().restore();
    y += 26;

    this.y = y;
  }

  chapterBody(ch) {
    const blocks = parseBlocks(ch.body);
    let firstPara = true;
    for (const block of blocks) {
      if (block.type === 'heading') {
        this.heading(block.text);
        firstPara = true;
      } else if (block.type === 'quote') {
        this.quote(block.paragraphs);
        firstPara = true;
      } else if (block.type === 'list') {
        this.list(block.items);
        firstPara = true;
      } else {
        // The opening paragraph of a chapter or section is flush; the ones
        // after it are indented, which is how a reader tells them apart
        // without extra space between them.
        this.paragraph(block.text, { indentFirst: firstPara ? 0 : 14 });
        firstPara = false;
      }
    }
    this.endPage();
  }

  run(counts) {
    this.halfTitle(); this.endPage();
    this.blankPage(); this.endPage();
    this.titlePage(); this.endPage();
    this.imprintPage(counts); this.endPage();
    this.contentsPages(); this.endPage();

    // The body opens on a recto, and everything before it is front matter,
    // which is why folios start at 1 on the first chapter page.
    if ((this.pageNo + 1) % 2 !== 1) { this.blankPage(); this.endPage(); }
    this.frontMatterPages = this.pageNo;
    this.inFrontMatter = false;

    for (let i = 0; i < this.chapters.length; i++) {
      const ch = this.chapters[i];
      this.chapterOpener(ch, i);
      this.collected.push({ key: ch.key, title: ch.title, folio: this.folio });
      this.chapterBody(ch);
    }

    // Signatures fold in fours.
    const multiple = Math.max(1, this.p.page_multiple);
    while (this.pageNo % multiple !== 0) { this.blankPage(); this.endPage(); }

    return { pageCount: this.pageNo, chapterFolios: this.collected.map(c => c.folio), contents: this.collected };
  }
}

// i, ii, iii for chapter numbers. A handbook's chapters read better numbered
// in the old way than as digits.
function romanize(n) {
  const table = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let left = n;
  for (const [value, glyph] of table) {
    while (left >= value) { out += glyph; left -= value; }
  }
  return out;
}

function newDoc(print, meta) {
  const doc = new PDFDocument({
    size: [inches(print.trim_width_in), inches(print.trim_height_in)],
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
    pdfVersion: '1.7',
    info: meta,
  });
  doc.registerFont('body', FONTS.body());
  doc.registerFont('bodyItalic', FONTS.bodyItalic());
  doc.registerFont('bodyBold', FONTS.bodyBold());
  doc.registerFont('bodyBoldItalic', FONTS.bodyBoldItalic());
  doc.registerFont('display', FONTS.display());
  doc.registerFont('displayMedium', FONTS.displayMedium());
  doc.registerFont('displayItalic', FONTS.displayItalic());
  return doc;
}

function collect(doc) {
  return new Promise((resolve, reject) => {
    const parts = [];
    doc.on('data', d => parts.push(d));
    doc.on('end', () => resolve(Buffer.concat(parts)));
    doc.on('error', reject);
    doc.end();
  });
}

function resolvePrint(config) {
  return { ...PRINT_DEFAULTS, ...((config && config.print) || {}) };
}

function chaptersOf(document) {
  const chapters = Array.isArray(document.chapters) ? document.chapters : [];
  return chapters
    .filter(c => c && typeof c.body === 'string' && c.body.trim())
    .map(c => ({ key: c.key || '', title: (c.title || 'Untitled').trim(), body: c.body }));
}

/**
 * Typeset the interior. Returns the PDF and the facts the cover needs.
 * Two passes so the contents can print the folio each chapter starts on.
 */
async function buildInterior(document, { config, memberName } = {}) {
  const print = resolvePrint(config);
  const chapters = chaptersOf(document);
  if (!chapters.length) throw new Error('This manuscript has no chapters to typeset');

  const meta = {
    Title: document.title || 'Enchiridion',
    Author: memberName || 'Arete',
    Subject: document.subtitle || 'A handbook compiled from its author\'s own writing',
    Creator: 'Arete',
    Producer: 'Arete Enchiridion typesetter',
  };

  // Pass 1: lay it out to learn where each chapter starts.
  const probeDoc = newDoc(print, meta);
  const probe = new Interior(probeDoc, {
    print, title: document.title, subtitle: document.subtitle,
    memberName, chapters, chapterFolios: null,
  });
  const first = probe.run(document.source_counts);
  await collect(probeDoc);

  // Pass 2: the same layout, with the contents filled in.
  const doc = newDoc(print, meta);
  const final = new Interior(doc, {
    print, title: document.title, subtitle: document.subtitle,
    memberName, chapters, chapterFolios: first.chapterFolios,
  });
  const result = final.run(document.source_counts);
  const buffer = await collect(doc);

  return {
    buffer,
    pageCount: result.pageCount,
    contents: result.contents,
    print,
    // If these disagree the contents shifted the body, which would mean the
    // folios printed are stale. Surfaced rather than hidden.
    stable: result.pageCount === first.pageCount,
  };
}

/**
 * The cover. `full` draws a paperback wrap (back, spine, front) sized from
 * the interior's page count; otherwise just the front at trim plus bleed.
 * Hardcover cases need vendor-specific wrap and hinge allowances, so order
 * those from the front-cover artwork and the printer's own template.
 */
async function buildCover(document, { config, memberName, pageCount, full = true } = {}) {
  const print = resolvePrint(config);
  const bleed = inches(print.bleed_in);
  const trimW = inches(print.trim_width_in);
  const trimH = inches(print.trim_height_in);
  const spine = full && pageCount ? pageCount * inches(print.paper_caliper_in) : 0;

  const width = full ? trimW * 2 + spine + bleed * 2 : trimW + bleed * 2;
  const height = trimH + bleed * 2;

  const doc = new PDFDocument({
    size: [width, height],
    margin: 0,
    autoFirstPage: true,
    pdfVersion: '1.7',
    info: {
      Title: `${document.title || 'Enchiridion'} — cover`,
      Author: memberName || 'Arete',
      Creator: 'Arete',
      Producer: 'Arete Enchiridion typesetter',
    },
  });
  doc.registerFont('body', FONTS.body());
  doc.registerFont('display', FONTS.display());
  doc.registerFont('displayMedium', FONTS.displayMedium());
  doc.registerFont('displayItalic', FONTS.displayItalic());

  // Flat ink across the whole wrap, bleed included. No imagery, no
  // gradient: the design language is one colour and one accent.
  doc.rect(0, 0, width, height).fill(INK);

  const frontX = full ? bleed + trimW + spine : bleed;
  const safe = inches(0.35);

  // Front
  const fx = frontX + safe;
  const fw = trimW - safe * 2;
  doc.save().lineWidth(0.75).strokeColor('rgba(201,168,76,0.4)')
    .rect(frontX + inches(0.22), bleed + inches(0.22), trimW - inches(0.44), trimH - inches(0.44))
    .stroke().restore();

  let y = bleed + trimH * 0.16;
  doc.font('body').fontSize(10).fillColor(GOLD);
  const kicker = 'ARETE';
  const kw = doc.widthOfString(kicker, { characterSpacing: 4 });
  doc.text(kicker, fx + (fw - kw) / 2, y, { lineBreak: false, characterSpacing: 4 });
  y += 30;
  doc.save().lineWidth(0.75).strokeColor(GOLD)
    .moveTo(fx + fw / 2 - 20, y).lineTo(fx + fw / 2 + 20, y).stroke().restore();

  y = bleed + trimH * 0.34;
  const titleSize = 27;
  doc.font('displayMedium').fontSize(titleSize).fillColor('#ffffff');
  const titleLines = wrapWith(doc, document.title || 'Enchiridion', fw);
  for (const line of titleLines) {
    const w = doc.widthOfString(line);
    doc.text(line, fx + (fw - w) / 2, y, { lineBreak: false });
    y += titleSize * 1.16;
  }

  if (document.subtitle) {
    y += 14;
    doc.font('displayItalic').fontSize(12).fillColor('#e0d5b5');
    for (const line of wrapWith(doc, document.subtitle, fw - 30)) {
      const w = doc.widthOfString(line);
      doc.text(line, fx + (fw - w) / 2, y, { lineBreak: false });
      y += 17;
    }
  }

  if (memberName) {
    doc.font('display').fontSize(12.5).fillColor(GOLD);
    const name = typographic(memberName);
    const w = doc.widthOfString(name);
    doc.text(name, fx + (fw - w) / 2, bleed + trimH - inches(0.95), { lineBreak: false });
  }

  if (full) {
    // Spine, but only when there is width to set type in. Vendors will not
    // print spine text below about a quarter inch anyway.
    if (spine >= inches(0.25)) {
      const sx = bleed + trimW + spine / 2;
      doc.save();
      doc.rotate(90, { origin: [sx, height / 2] });
      doc.font('displayMedium').fontSize(12).fillColor('#ffffff');
      const t = typographic(document.title || 'Enchiridion');
      const tw = doc.widthOfString(t);
      const maxSpineText = trimH - inches(1.4);
      const label = tw > maxSpineText ? `${t.slice(0, Math.max(3, Math.floor(t.length * maxSpineText / tw) - 1))}…` : t;
      const lw = doc.widthOfString(label);
      doc.text(label, sx - lw / 2, height / 2 - 6, { lineBreak: false });
      doc.font('body').fontSize(8).fillColor(GOLD);
      const aw = doc.widthOfString('ARETE', { characterSpacing: 2.4 });
      doc.text('ARETE', sx + maxSpineText / 2 - aw, height / 2 - 4, { lineBreak: false, characterSpacing: 2.4 });
      doc.restore();
    }

    // Back
    const bx = bleed + safe;
    const bw = trimW - safe * 2;
    doc.save().lineWidth(0.75).strokeColor('rgba(201,168,76,0.4)')
      .rect(bleed + inches(0.22), bleed + inches(0.22), trimW - inches(0.44), trimH - inches(0.44))
      .stroke().restore();

    let by = bleed + trimH * 0.3;
    doc.font('displayItalic').fontSize(13).fillColor('#e0d5b5');
    const blurb = 'Arrian did not invent the Enchiridion. He wrote down what Epictetus said in class, and arranged it so it could be carried.';
    for (const line of wrapWith(doc, blurb, bw, 'displayItalic')) {
      doc.text(line, bx, by, { lineBreak: false });
      by += 19;
    }
    by += 22;
    doc.font('body').fontSize(9.5).fillColor('#a9a394');
    const tail = 'This book was compiled the same way, from its author\'s own journal, conversations, goals and scrolls, and set beside the texts those pages kept returning to.';
    for (const line of wrapWith(doc, tail, bw, 'body')) {
      doc.text(line, bx, by, { lineBreak: false });
      by += 14;
    }
    doc.font('body').fontSize(8.5).fillColor(GOLD);
    doc.text('pursuearete.com', bx, bleed + trimH - inches(0.8), { lineBreak: false, characterSpacing: 1.2 });
  }

  const buffer = await collect(doc);
  return {
    buffer,
    width, height,
    spine_pt: spine,
    spine_in: spine / PT_PER_IN,
    pageCount: pageCount || null,
    print,
  };
}

function wrapWith(doc, text, width, font) {
  if (font) doc.font(font);
  const words = typographic(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (line && doc.widthOfString(trial) > width) { lines.push(line); line = word; }
    else line = trial;
  }
  if (line) lines.push(line);
  return lines;
}

module.exports = {
  buildInterior,
  buildCover,
  PRINT_DEFAULTS,
  // Exported for tests.
  _internal: { parseBlocks, parseInline, typographic, romanize, resolvePrint, chaptersOf },
};

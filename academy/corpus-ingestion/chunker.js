/**
 * chunker.js — intelligent text chunking for Stoic philosophical texts
 *
 * Strategy per text:
 *   Marcus Aurelius Meditations  → one chunk per numbered section (locator "4.3");
 *     'meditations-long' for Long (#15877), 'meditations-casaubon' for Casaubon (#2680)
 *   Epictetus Discourses         → one chunk per discourse section
 *   Epictetus Enchiridion        → one chunk per numbered chapter
 *   Seneca Letters               → one chunk per letter
 *   'headed' (City of God, Lives) → BOOK / CHAPTER (or LIFE OF) headings give a
 *     locator "book.section"; the section body is cut at paragraph boundaries
 *   Everything else              → paragraph-based, ~400 word target, 50 word overlap
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// ---------------------------------------------------------------------------
// Text metadata — matches what Gutenberg ships
// ---------------------------------------------------------------------------
const TEXT_METADATA = {
  // Gutenberg #15877 is Long's translation. (#2680, "Meditations", is Meric
  // Casaubon's 1634 version with different section numbering; it takes the
  // 'meditations-casaubon' strategy below if it is ever ingested.)
  'marcus-meditations-long.txt': {
    author: 'Marcus Aurelius',
    work: 'Meditations',
    translator: 'George Long',
    source_url: 'https://www.gutenberg.org/ebooks/15877',
    text_type: 'primary',
    strategy: 'meditations-long',
  },
  'epictetus-discourses.txt': {
    author: 'Epictetus',
    work: 'Discourses',
    translator: 'George Long',
    source_url: 'https://www.gutenberg.org/ebooks/10661',
    text_type: 'primary',
    strategy: 'discourses',
  },
  'epictetus-enchiridion.txt': {
    author: 'Epictetus',
    work: 'Enchiridion',
    translator: 'George Long',
    source_url: 'https://www.gutenberg.org/ebooks/45109',
    text_type: 'primary',
    strategy: 'enchiridion',
  },
  'seneca-letters.txt': {
    author: 'Seneca',
    work: 'Letters to Lucilius',
    translator: 'Richard M. Gummere',
    source_url: 'https://www.gutenberg.org/ebooks/18',
    text_type: 'primary',
    strategy: 'seneca-letters',
  },
  'seneca-shortness.txt': {
    author: 'Seneca',
    work: 'On the Shortness of Life',
    translator: 'John W. Basore',
    source_url: 'https://www.gutenberg.org/ebooks/1622',
    text_type: 'primary',
    strategy: 'paragraph',
  },
  'cicero-definibus.txt': {
    author: 'Cicero',
    work: 'De Finibus Book III',
    translator: 'H. Rackham',
    source_url: 'https://www.gutenberg.org/ebooks/29247',
    text_type: 'primary',
    strategy: 'paragraph',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripGutenbergBoilerplate(text) {
  // Normalize CRLF first
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const startPatterns = [
    /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i,
    /\*\*\*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i,
  ];
  const endPatterns = [
    /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i,
    /\*\*\*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i,
  ];

  let start = 0;
  let end = text.length;

  for (const pat of startPatterns) {
    const m = text.match(pat);
    if (m) { start = m.index + m[0].length; break; }
  }
  for (const pat of endPatterns) {
    const m = text.match(pat);
    if (m) { end = m.index; break; }
  }

  return text.slice(start, end).trim();
}

// ---------------------------------------------------------------------------
// Extract plain text from a .docx summary file (Kyle's chapter summaries)
// Uses mammoth to strip Word formatting. Returns raw string.
// ---------------------------------------------------------------------------
async function extractDocxText(filepath) {
  const result = await mammoth.extractRawText({ path: filepath });
  if (result.messages && result.messages.length > 0) {
    result.messages.forEach(m => console.warn(`  [mammoth] ${m.message}`));
  }
  return result.value;
}

// ---------------------------------------------------------------------------
// Strategy: Marcus Aurelius Meditations, Meric Casaubon's translation
// (Gutenberg #2680). Not George Long: see chunkMeditationsLong below.
//
// Book headings:  "THE FIRST BOOK", "THE SECOND BOOK", ... (standalone line)
// Entry headings: "I. Of my grandfather..." (Roman numeral + period inline)
// The text ends with an APPENDIX and NOTES that must not be read as entries.
// ---------------------------------------------------------------------------
const ORDINAL_TO_NUM = {
  FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FIFTH: 5,
  SIXTH: 6, SEVENTH: 7, EIGHTH: 8, NINTH: 9, TENTH: 10,
  ELEVENTH: 11, TWELFTH: 12,
};

function romanToInt(s) {
  const vals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = vals[s[i]];
    const next = vals[s[i + 1]];
    result += next > cur ? -cur : cur;
  }
  return result;
}

function chunkMeditationsCasaubon(text, meta) {
  const chunks = [];
  const lines = text.split('\n');
  const endRe = /^(APPENDIX|NOTES|INDEX)\b/;

  // "THE FIRST BOOK" or "THE TWELFTH BOOK" as a standalone trimmed line
  const bookRe = /^(?:THE\s+)?(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH)\s+BOOK$/i;
  // Roman numeral entry: "I. text..." or "XIV. text..."
  const entryRe = /^([IVXLC]+)\.\s+(.+)/;

  let currentBook = '';
  let currentBookNum = 0;
  let currentEntryRoman = null;
  let buffer = [];
  let chunkIndex = 0;
  let inContent = false; // skip everything before "THE FIRST BOOK" body

  function flush() {
    const txt = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (txt && currentEntryRoman) {
      // The canonical division, "4.3" for Book 4 entry 3. It is both the
      // locator (docs/corpus/ACQUISITION_PLAN.md Part 5) and the section
      // label: the library reader treats a work whose labels are all single
      // locators as entry-chunked and formats it row by row. (Labels were
      // "Book 4.3" before 2026-09-13; nothing live carried that form.)
      const locator = `${currentBookNum}.${romanToInt(currentEntryRoman)}`;
      chunks.push({
        ...meta,
        section_label: locator,
        locator,
        chunk_index: chunkIndex++,
        chunk_text: txt,
        word_count: countWords(txt),
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (inContent && endRe.test(trimmed)) break;

    const bookMatch = trimmed.match(bookRe);
    if (bookMatch) {
      flush();
      const ordinal = bookMatch[1].toUpperCase();
      currentBookNum = ORDINAL_TO_NUM[ordinal] || currentBookNum + 1;
      currentBook = `Book ${currentBookNum}`;
      currentEntryRoman = null;
      inContent = true;
      continue;
    }

    if (!inContent) continue;

    const entryMatch = trimmed.match(entryRe);
    if (entryMatch) {
      flush();
      currentEntryRoman = entryMatch[1].toUpperCase();
      buffer.push(entryMatch[2]);
      continue;
    }

    if (currentEntryRoman && trimmed) {
      buffer.push(trimmed);
    }
  }
  flush();
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy: Marcus Aurelius Meditations, George Long's translation
// (Gutenberg #15877, "Thoughts of Marcus Aurelius Antoninus").
//
// The body runs from the last "THE THOUGHTS" heading to "INDEXES." Each book
// opens with a bare roman numeral on its own line ("I." ... "XII."). The
// first section of a book is unnumbered; every later one starts "2. ", "3. ",
// at the left margin. Long's footnotes are indented blocks ("    [A] ...")
// referenced by "[A]" markers in the text; the blocks are dropped and the
// markers stripped. His own bracketed insertions ("[I learned]") stay.
// ---------------------------------------------------------------------------
// Sections whose number the Gutenberg transcription dropped. Keyed by the
// locator the section should carry; the value is how its first line begins.
const LONG_UNNUMBERED_SECTIONS = {
  '5.37': /^When thou art calling out on the Rostra/,
};

function chunkMeditationsLong(text, meta) {
  const lines = text.split('\n');
  const lastHeading = lines.map(l => l.trim()).lastIndexOf('THE THOUGHTS');
  if (lastHeading < 0) throw new Error("Long's Meditations: no 'THE THOUGHTS' heading found");

  const bookRe = /^([IVX]+)\.$/;
  const sectionRe = /^(\d+)\.\s+(.*)$/;
  const endRe = /^(INDEXES?\.?|INDEX OF TERMS\.?)$/;
  const chunks = [];
  let book = 0;
  let section = 0;
  let buffer = [];
  let chunkIndex = 0;

  function flush() {
    const txt = buffer.join(' ').replace(/\[[A-Z]\]/g, '').replace(/\s+/g, ' ').trim();
    if (txt && book > 0 && section > 0) {
      const locator = `${book}.${section}`;
      chunks.push({ ...meta, section_label: locator, locator, chunk_index: chunkIndex++, chunk_text: txt, word_count: countWords(txt) });
    }
    buffer = [];
  }

  let atParagraphStart = true;
  for (let i = lastHeading + 1; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (endRe.test(trimmed)) break;
    if (!trimmed) { atParagraphStart = true; continue; }
    if (/^\s/.test(raw)) continue; // indented: a footnote block
    const paragraphStart = atParagraphStart;
    atParagraphStart = false;

    const bookMatch = trimmed.match(bookRe);
    if (bookMatch) {
      flush();
      book = romanToInt(bookMatch[1]);
      section = 1; // the first section carries no number
      continue;
    }
    if (book === 0) continue; // "OF" / "MARCUS AURELIUS ANTONIUS." before Book I

    const sectionMatch = trimmed.match(sectionRe);
    if (sectionMatch) {
      flush();
      section = parseInt(sectionMatch[1], 10);
      buffer.push(sectionMatch[2]);
      continue;
    }
    const known = LONG_UNNUMBERED_SECTIONS[`${book}.${section + 1}`];
    if (paragraphStart && known && known.test(trimmed)) {
      flush();
      section += 1;
    }
    buffer.push(trimmed);
  }
  flush();
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy: Epictetus Discourses
// Sections are marked "CHAPTER I", "CHAPTER II", sometimes with book headers.
// ---------------------------------------------------------------------------
function chunkDiscourses(text, meta) {
  const chunks = [];
  const lines = text.split('\n');
  let currentSection = null;
  let buffer = [];
  let chunkIndex = 0;

  // Gutenberg "Selection from the Discourses" format:
  // "ALL CAPS TITLE.—First sentence of text continues on same line"
  // Only match lines with the em-dash (—, –, or --) separator — this is present on
  // every real section heading and absent on TOC/intro lines.
  const inlineSectionRe = /^([A-Z][A-Z\s,;'()]{5,}[.?!])\s*[—–-]{1,2}\s*(.*)/;

  function flush() {
    const txt = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (txt && currentSection) {
      chunks.push({
        ...meta,
        section_label: currentSection,
        chunk_index: chunkIndex++,
        chunk_text: txt,
        word_count: countWords(txt),
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const inlineMatch = trimmed.match(inlineSectionRe);
    if (inlineMatch) {
      flush();
      currentSection = inlineMatch[1].replace(/\.$/, '').trim();
      if (inlineMatch[2]) buffer.push(inlineMatch[2]);
      continue;
    }
    if (currentSection && trimmed) {
      buffer.push(trimmed);
    }
  }
  flush();
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy: Enchiridion — standalone Roman numeral chapter markers
// Gutenberg/Liberal Arts edition uses bare Roman numerals on their own lines.
// ---------------------------------------------------------------------------
function chunkEnchiridion(text, meta) {
  const lines = text.split('\n');
  const parts = [];
  let currentNum = null;
  let buffer = [];

  // Standalone Roman numeral: "I", "XIV", etc. — whole trimmed line, no other text
  const romanRe = /^[IVXLC]+$/;

  function flush() {
    const txt = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (txt && currentNum !== null) {
      parts.push({ num: currentNum, text: txt });
    }
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (romanRe.test(trimmed) && trimmed.length >= 1 && trimmed.length <= 8) {
      flush();
      currentNum = romanToInt(trimmed);
      continue;
    }
    if (currentNum !== null && trimmed) {
      buffer.push(trimmed);
    }
  }
  flush();

  if (parts.length < 5) {
    return chunkByParagraph(text, meta);
  }

  let chunkIndex = 0;
  return parts.map(p => ({
    ...meta,
    section_label: `Chapter ${p.num}`,
    chunk_index: chunkIndex++,
    chunk_text: p.text,
    word_count: countWords(p.text),
  }));
}

// ---------------------------------------------------------------------------
// Strategy: Seneca Letters — split per letter
// Letters are headed "LETTER I", "I. SENECA TO LUCILIUS", or just Roman numeral
// ---------------------------------------------------------------------------
function chunkSenecaLetters(text, meta) {
  const chunks = [];

  // Multiple possible heading patterns for Seneca letters
  const letterRe = /\n([IVXLC]+)\.\s+(SENECA[^\n]*|ON [^\n]*|TO [^\n]*)\n/gi;

  const parts = [];
  let lastIndex = 0;
  let lastLabel = null;
  let match;

  while ((match = letterRe.exec(text)) !== null) {
    if (lastLabel !== null) {
      parts.push({ label: lastLabel, text: text.slice(lastIndex, match.index).trim() });
    }
    lastLabel = `Letter ${match[1]} — ${match[2].trim()}`;
    lastIndex = match.index + match[0].length;
  }
  if (lastLabel !== null) {
    parts.push({ label: lastLabel, text: text.slice(lastIndex).trim() });
  }

  if (parts.length < 5) {
    return chunkByParagraph(text, meta);
  }

  let chunkIndex = 0;
  for (const part of parts) {
    if (!part.text) continue;
    chunks.push({
      ...meta,
      section_label: part.label,
      chunk_index: chunkIndex++,
      chunk_text: part.text,
      word_count: countWords(part.text),
    });
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy: paragraph-based chunking (~400 word target, 50 word overlap)
// ---------------------------------------------------------------------------
function chunkByParagraph(text, meta) {
  const TARGET_WORDS = 400;
  const OVERLAP_WORDS = 50;

  // Split into paragraphs (two or more newlines)
  const paragraphs = text.split(/\n{2,}/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);

  const chunks = [];
  let buffer = [];
  let bufferWords = 0;
  let chunkIndex = 0;

  function flush(label) {
    const txt = buffer.join('\n\n').trim();
    if (!txt) return;
    chunks.push({
      ...meta,
      section_label: label || `Section ${chunkIndex + 1}`,
      chunk_index: chunkIndex++,
      chunk_text: txt,
      word_count: countWords(txt),
    });
  }

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    buffer.push(para);
    bufferWords += words.length;

    if (bufferWords >= TARGET_WORDS) {
      flush();
      // Keep last OVERLAP_WORDS worth of content for overlap
      const overlapWords = [];
      let count = 0;
      const allWords = buffer.join(' ').split(/\s+/).filter(Boolean);
      for (let i = allWords.length - 1; i >= 0 && count < OVERLAP_WORDS; i--) {
        overlapWords.unshift(allWords[i]);
        count++;
      }
      buffer = overlapWords.length > 0 ? [overlapWords.join(' ')] : [];
      bufferWords = count;
    }
  }

  if (bufferWords > 20) flush();

  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy: headed — any work Gutenberg ships with BOOK and CHAPTER (or
// LIFE OF …) headings: Augustine's City of God (Dods), Diogenes Laertius'
// Lives (Yonge), Boethius, Lucretius, most multi-book prose. One locator per
// book and section ("14.9" for City of God XIV.9; "7.1" for the first life
// in Lives Book 7), section_label carrying the heading's title, and the body
// of a section cut at paragraph boundaries into ~400-word rows that share
// the locator. Numbered paragraphs inside a section (Yonge's "I.", "II.")
// ride along in the label as a range, the way the Hicks Book 7 rows are
// labelled "7.10–7.13".
//
// Front matter is dropped by construction: nothing before the first book
// heading is kept, and a contents list that repeats the book headings is
// skipped by starting at the LAST occurrence of the first book heading
// (the same rule body_start_marker uses in the nightly agent). Footnote
// bodies ("[12] …" paragraphs, FOOTNOTES blocks) are dropped and inline
// reference markers ("[12]") are removed from the text.
//
// planHeaded() returns the structure without the rows, for verify-queue.js
// and a dry run: books, sections per book, and the first headings found.
// ---------------------------------------------------------------------------
const ORDINAL_WORDS = {
  FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FIFTH: 5, SIXTH: 6, SEVENTH: 7, EIGHTH: 8,
  NINTH: 9, TENTH: 10, ELEVENTH: 11, TWELFTH: 12, THIRTEENTH: 13, FOURTEENTH: 14,
  FIFTEENTH: 15, SIXTEENTH: 16, SEVENTEENTH: 17, EIGHTEENTH: 18, NINETEENTH: 19,
  TWENTIETH: 20, 'TWENTY-FIRST': 21, 'TWENTY-SECOND': 22, 'TWENTY-THIRD': 23,
  'TWENTY-FOURTH': 24,
};
const HEADED_TARGET_WORDS = 400;
const HEADED_MAX_PARAGRAPH_WORDS = 700;

function headingNumber(token) {
  const t = token.toUpperCase().replace(/\.$/, '');
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (/^[IVXLC]+$/.test(t)) return romanToInt(t);
  if (ORDINAL_WORDS[t]) return ORDINAL_WORDS[t];
  return null;
}

// "BOOK I.", "BOOK XIV", "BOOK FIRST.", "THE FIRST BOOK", "BOOK 3: title"
function matchBookHeading(line) {
  let m = line.match(/^BOOK\s+([IVXLC]+|\d+|[A-Z-]+)\.?\s*[:.—–-]*\s*(.*)$/i);
  if (m) {
    const n = headingNumber(m[1]);
    if (n != null) return { number: n, title: m[2].trim() };
  }
  m = line.match(/^(?:THE\s+)?([A-Z-]+)\s+BOOK\.?$/i);
  if (m) {
    const n = headingNumber(m[1]);
    if (n != null) return { number: n, title: '' };
  }
  return null;
}

// "CHAPTER 1.--Title", "CHAPTER XIV.", "CHAP. I. Title", "LIFE OF ZENO.",
// "ARGUMENT." (Dods prefaces each book with one; kept as section 0).
function matchSectionHeading(line) {
  let m = line.match(/^(?:CHAPTER|CHAP\.|SECTION|SECT\.)\s+([IVXLC]+|\d+)\s*[.:]?\s*[—–-]{0,2}\s*(.*)$/i);
  if (m) {
    const n = headingNumber(m[1]);
    if (n != null) return { number: n, title: m[2].trim(), numbered: true };
  }
  m = line.match(/^(LIFE OF [A-Z][A-Z .,'’-]+?)\.?$/);
  if (m) return { number: null, title: titleCaseHeading(m[1]), numbered: false };
  if (/^ARGUMENT\.?$/.test(line)) return { number: 0, title: 'Argument', numbered: true };
  return null;
}

function titleCaseHeading(s) {
  const small = new Set(['of', 'the', 'and', 'or', 'to', 'in', 'on', 'at', 'by', 'for', 'a', 'an']);
  return s.toLowerCase().split(/\s+/).map((w, i) =>
    (i > 0 && small.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

// A heading title that wraps onto following lines continues until a blank
// line. Returns the joined title and the index of the last title line.
function collectHeadingTitle(lines, i, firstPart) {
  let title = firstPart;
  let j = i;
  while (j + 1 < lines.length) {
    const next = lines[j + 1].trim();
    if (!next) break;
    if (matchBookHeading(next) || matchSectionHeading(next)) break;
    // A title continuation is short-lined heading text, not a body paragraph:
    // Gutenberg wraps at ~70 characters and body paragraphs run several lines,
    // so only continue while the title has not yet closed with a period.
    if (/[.!?]$/.test(title)) break;
    title = `${title} ${next}`.trim();
    j++;
  }
  return { title: title.replace(/\s+/g, ' ').replace(/[.]+$/, '').trim(), last: j };
}

function parseHeaded(text) {
  const lines = text.split('\n');
  const trimmed = lines.map(l => l.trim());

  // Body starts at the last occurrence of the first book heading (skips a
  // contents list that repeats it).
  const firstBookIdx = trimmed.findIndex(l => matchBookHeading(l));
  if (firstBookIdx < 0) return null;
  const firstBookLine = trimmed[firstBookIdx];
  const start = trimmed.lastIndexOf(firstBookLine);

  const books = []; // { number, sections: [{ number, title, paragraphs: [{ marker, text }] }] }
  let book = null;
  let section = null;
  let lifeCounter = 0;
  let inFootnotes = false;
  let para = [];
  let paraMarker = null;

  function flushPara() {
    const txt = para.join(' ').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
    if (txt && section) section.paragraphs.push({ marker: paraMarker, text: txt });
    para = [];
    paraMarker = null;
  }

  for (let i = start; i < lines.length; i++) {
    const line = trimmed[i];
    if (!line) { flushPara(); continue; }

    const b = matchBookHeading(line);
    if (b) {
      flushPara();
      book = { number: b.number, sections: [] };
      books.push(book);
      section = null;
      lifeCounter = 0;
      inFootnotes = false;
      continue;
    }
    if (!book) continue;

    if (/^FOOTNOTES?:?$/i.test(line)) { flushPara(); inFootnotes = true; continue; }
    if (/^(INDEX|INDEXES|THE END|END OF (VOL|BOOK|THE))/i.test(line) && !/^END OF (THE )?(CHAPTER)/i.test(line)) {
      // Back matter after the text proper: an index or a volume close.
      if (/^INDEX|^THE END/i.test(line)) { flushPara(); section = null; inFootnotes = true; continue; }
    }

    const s = matchSectionHeading(line);
    if (s) {
      flushPara();
      inFootnotes = false;
      const { title, last } = collectHeadingTitle(lines.map(l => l.trim()), i, s.title);
      i = last;
      const number = s.number != null ? s.number : ++lifeCounter;
      if (s.number != null && s.number > lifeCounter) lifeCounter = s.number;
      section = { number, title, paragraphs: [] };
      book.sections.push(section);
      continue;
    }
    if (inFootnotes) continue;
    // Body text under a book before any section heading (a book with no
    // chapter divisions, or headings in a form this parser does not know):
    // keep it as section 0 of the book so the rows still locate to the book
    // instead of vanishing. verify-queue.js shows it as "0: Book N".
    if (!section) {
      section = { number: 0, title: `Book ${book.number}`, paragraphs: [] };
      book.sections.push(section);
    }
    // A footnote body starts with its own marker; drop it.
    if (para.length === 0 && /^\[\d+\]\s/.test(line)) { inFootnotes = true; continue; }

    // Numbered paragraph inside a section: "XII. Zeno was …" or "12. …"
    if (para.length === 0) {
      const pm = line.match(/^([IVXLC]+|\d{1,3})\.\s+(\S.*)$/);
      if (pm && headingNumber(pm[1]) != null) {
        paraMarker = pm[1];
        para.push(pm[2]);
        continue;
      }
    }
    para.push(line);
  }
  flushPara();
  return books;
}

function planHeaded(text) {
  const books = parseHeaded(text);
  if (!books) return null;
  return {
    books: books.map(b => ({
      number: b.number,
      sections: b.sections.length,
      paragraphs: b.sections.reduce((n, s) => n + s.paragraphs.length, 0),
      words: b.sections.reduce((n, s) => n + s.paragraphs.reduce((m, p) => m + countWords(p.text), 0), 0),
      firstSections: b.sections.slice(0, 3).map(s => `${s.number}: ${s.title}`),
    })),
  };
}

function chunkHeaded(text, meta) {
  const books = parseHeaded(text);
  if (!books) return [];
  const chunks = [];
  let chunkIndex = 0;

  for (const book of books) {
    for (const section of book.sections) {
      const locator = `${book.number}.${section.number}`;
      // Split any single paragraph far beyond the target on sentence
      // boundaries so one paragraph never becomes a 2,000-word row.
      const units = [];
      for (const p of section.paragraphs) {
        if (countWords(p.text) <= HEADED_MAX_PARAGRAPH_WORDS) { units.push(p); continue; }
        const pieces = splitOversizedChunk(p.text, HEADED_MAX_PARAGRAPH_WORDS * 6);
        pieces.forEach((piece, k) => units.push({ marker: k === 0 ? p.marker : null, text: piece }));
      }
      // Group consecutive paragraphs up to the target; no overlap, because
      // the locator already ties the rows of a section together.
      const groups = [];
      let cur = [];
      let curWords = 0;
      for (const u of units) {
        const w = countWords(u.text);
        if (cur.length && curWords + w > HEADED_TARGET_WORDS) { groups.push(cur); cur = []; curWords = 0; }
        cur.push(u);
        curWords += w;
      }
      if (cur.length) groups.push(cur);
      // A trailing sliver joins the previous group rather than standing alone.
      if (groups.length > 1) {
        const lastWords = groups[groups.length - 1].reduce((n, u) => n + countWords(u.text), 0);
        if (lastWords < 80) groups[groups.length - 2].push(...groups.pop());
      }

      groups.forEach((group, gi) => {
        const markers = group.map(u => u.marker).filter(Boolean);
        let label = section.title || `Section ${section.number}`;
        if (markers.length) {
          label = `${label}, ${markers[0]}${markers.length > 1 ? `–${markers[markers.length - 1]}` : ''}`;
        } else if (groups.length > 1) {
          label = `${label} (${gi + 1}/${groups.length})`;
        }
        const txt = group.map(u => u.text).join('\n\n');
        chunks.push({
          ...meta,
          section_label: label,
          locator,
          chunk_index: chunkIndex++,
          chunk_text: txt,
          word_count: countWords(txt),
        });
      });
    }
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Oversize guard — splits any chunk whose text exceeds maxChars.
// Splits on sentence boundaries (". ") first; falls back to hard char split.
// Re-indexes all chunks sequentially after splitting.
// ---------------------------------------------------------------------------
function splitOversizedChunk(text, maxChars = 24000) {
  if (text.length <= maxChars) return [text];

  const pieces = [];
  // Split on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars) {
      if (current) pieces.push(current.trim());
      // Single sentence larger than maxChars — hard split
      if (sentence.length > maxChars) {
        for (let i = 0; i < sentence.length; i += maxChars) {
          pieces.push(sentence.slice(i, i + maxChars).trim());
        }
        current = '';
      } else {
        current = sentence;
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

function applyOversizeGuard(chunks, maxChars = 24000) {
  const result = [];
  let globalIndex = 0;

  for (const chunk of chunks) {
    const pieces = splitOversizedChunk(chunk.chunk_text, maxChars);
    if (pieces.length === 1) {
      result.push({ ...chunk, chunk_index: globalIndex++ });
    } else {
      for (let i = 0; i < pieces.length; i++) {
        result.push({
          ...chunk,
          chunk_text:    pieces[i],
          word_count:    countWords(pieces[i]),
          section_label: pieces.length > 1 ? `${chunk.section_label} (${i + 1}/${pieces.length})` : chunk.section_label,
          chunk_index:   globalIndex++,
        });
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// chunkSummaryDocx — entry point for Kyle's chapter summary .docx files
//
// Reads the docx, extracts text, infers metadata from filename convention:
//   [AuthorLastName]_[ShortTitle]_Ch[N]_summary.docx
//   e.g. Hadot_InnerCitadel_Ch4_summary.docx
//
// text_type is set to 'secondary' to distinguish from primary source chunks.
// ---------------------------------------------------------------------------
async function chunkSummaryDocx(filepath) {
  const filename = path.basename(filepath);

  // Parse filename convention: Author_Title_ChN_summary.docx
  const nameMatch = filename.match(/^([^_]+)_([^_]+)_Ch(\d+)_summary\.docx$/i);
  if (!nameMatch) {
    throw new Error(
      `Filename "${filename}" does not match expected pattern: Author_Title_ChN_summary.docx`
    );
  }

  const [, authorSlug, titleSlug, chapterNum] = nameMatch;

  const baseMeta = {
    author: authorSlug.replace(/([A-Z])/g, ' $1').trim(),
    work: titleSlug.replace(/([A-Z])/g, ' $1').trim(),
    section_label: `Chapter ${chapterNum}`,
    translator: '',
    source_url: '',
    text_type: 'secondary',
  };

  const rawText = await extractDocxText(filepath);

  if (!rawText || rawText.trim().length < 100) {
    throw new Error(`Extracted text from "${filename}" is too short — is the file empty?`);
  }

  const chunks = chunkByParagraph(rawText, baseMeta);

  return applyOversizeGuard(chunks);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
function chunkFile(filename, rawText) {
  const meta = TEXT_METADATA[filename];
  if (!meta) {
    throw new Error(`No metadata configured for "${filename}". Add it to TEXT_METADATA in chunker.js.`);
  }

  const text = stripGutenbergBoilerplate(rawText);

  let chunks;
  switch (meta.strategy) {
    case 'meditations-long':     chunks = chunkMeditationsLong(text, meta); break;
    case 'meditations':
    case 'meditations-casaubon': chunks = chunkMeditationsCasaubon(text, meta); break;
    case 'discourses':     chunks = chunkDiscourses(text, meta); break;
    case 'enchiridion':    chunks = chunkEnchiridion(text, meta); break;
    case 'seneca-letters': chunks = chunkSenecaLetters(text, meta); break;
    case 'headed':         chunks = chunkHeaded(text, meta); break;
    default:               chunks = chunkByParagraph(text, meta);
  }
  return applyOversizeGuard(chunks);
}

/**
 * chunkRaw — used by ingest.js when strategy comes from the manifest,
 * not from TEXT_METADATA. baseMeta should contain at minimum: author, work.
 */
function chunkRaw(rawText, strategy, baseMeta) {
  const text = stripGutenbergBoilerplate(rawText);
  const meta = { translator: '', source_url: '', text_type: 'primary', ...baseMeta };

  let chunks;
  switch (strategy) {
    case 'meditations-long':     chunks = chunkMeditationsLong(text, meta); break;
    case 'meditations':
    case 'meditations-casaubon': chunks = chunkMeditationsCasaubon(text, meta); break;
    case 'discourses':     chunks = chunkDiscourses(text, meta); break;
    case 'enchiridion':    chunks = chunkEnchiridion(text, meta); break;
    case 'letters':
    case 'seneca-letters': chunks = chunkSenecaLetters(text, meta); break;
    case 'headed':         chunks = chunkHeaded(text, meta); break;
    case 'paragraphs':
    case 'paragraph':
    default:               chunks = chunkByParagraph(text, meta);
  }

  // Fallback: if the primary strategy produced nothing, use paragraph chunking
  if (chunks.length === 0) {
    console.warn(`  [chunker] Strategy "${strategy}" produced 0 chunks — falling back to paragraphs`);
    chunks = chunkByParagraph(text, meta);
  }

  return applyOversizeGuard(chunks);
}

// Strategies a queue row may name (corpus_ingestion_queue.chunk_strategy).
const QUEUE_STRATEGIES = ['paragraph', 'headed', 'meditations-long', 'discourses', 'enchiridion', 'seneca-letters'];

module.exports = { chunkFile, chunkRaw, chunkSummaryDocx, splitOversizedChunk, planHeaded, QUEUE_STRATEGIES, TEXT_METADATA };

// ---------------------------------------------------------------------------
// CLI test: node chunker.js — prints first 3 chunks of Meditations
// ---------------------------------------------------------------------------
if (require.main === module) {
  const textsDir = path.join(__dirname, 'texts');
  const filename = 'marcus-meditations.txt';
  const filepath = path.join(textsDir, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`Text file not found: ${filepath}`);
    console.error('Run the download step first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(filepath, 'utf8');
  const chunks = chunkFile(filename, raw);

  console.log(`\nTotal chunks: ${chunks.length}\n`);
  console.log('=== First 3 chunks ===\n');

  for (const chunk of chunks.slice(0, 3)) {
    console.log(`--- Chunk ${chunk.chunk_index} ---`);
    console.log(`Author:        ${chunk.author}`);
    console.log(`Work:          ${chunk.work}`);
    console.log(`Section label: ${chunk.section_label}`);
    console.log(`Word count:    ${chunk.word_count}`);
    console.log(`Translator:    ${chunk.translator}`);
    console.log(`Text (first 300 chars):`);
    console.log(chunk.chunk_text.slice(0, 300));
    console.log();
  }
}

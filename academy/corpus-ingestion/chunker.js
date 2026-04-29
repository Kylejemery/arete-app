/**
 * chunker.js — intelligent text chunking for Stoic philosophical texts
 *
 * Strategy per text:
 *   Marcus Aurelius Meditations  → one chunk per numbered entry (e.g. "Book IV.3")
 *   Epictetus Discourses         → one chunk per discourse section
 *   Epictetus Enchiridion        → one chunk per numbered chapter
 *   Seneca Letters               → one chunk per letter
 *   Everything else              → paragraph-based, ~400 word target, 50 word overlap
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Text metadata — matches what Gutenberg ships
// ---------------------------------------------------------------------------
const TEXT_METADATA = {
  'marcus-meditations.txt': {
    author: 'Marcus Aurelius',
    work: 'Meditations',
    translator: 'George Long',
    source_url: 'https://www.gutenberg.org/ebooks/2680',
    text_type: 'primary',
    strategy: 'meditations',
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
// Strategy: Marcus Aurelius Meditations (George Long / Gutenberg edition)
//
// Book headings:  "THE FIRST BOOK", "THE SECOND BOOK", ... (standalone line)
// Entry headings: "I. Of my grandfather..." (Roman numeral + period inline)
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

function chunkMeditations(text, meta) {
  const chunks = [];
  const lines = text.split('\n');

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
      chunks.push({
        ...meta,
        section_label: `Book ${currentBookNum}.${romanToInt(currentEntryRoman)}`,
        chunk_index: chunkIndex++,
        chunk_text: txt,
        word_count: countWords(txt),
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

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
// Strategy: Epictetus Discourses
// Sections are marked "CHAPTER I", "CHAPTER II", sometimes with book headers.
// ---------------------------------------------------------------------------
function chunkDiscourses(text, meta) {
  const chunks = [];
  const lines = text.split('\n');

  let currentBook = '';
  let currentChapter = null;
  let buffer = [];
  let chunkIndex = 0;

  const bookRe = /^BOOK\s+([IVXLC\d]+)/i;
  const chapterRe = /^CHAPTER\s+([IVXLC\d]+)[.\s—]*(.*)/i;

  function flush() {
    const txt = buffer.join('\n').trim();
    if (txt && currentChapter) {
      chunks.push({
        ...meta,
        section_label: currentChapter,
        chunk_index: chunkIndex++,
        chunk_text: txt,
        word_count: countWords(txt),
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const bookMatch = line.match(bookRe);
    if (bookMatch) {
      flush();
      currentBook = `Book ${bookMatch[1]}`;
      currentChapter = null;
      continue;
    }

    const chapMatch = line.match(chapterRe);
    if (chapMatch) {
      flush();
      const chapNum = chapMatch[1];
      const chapTitle = chapMatch[2].trim();
      currentChapter = currentBook
        ? `${currentBook}, Ch. ${chapNum}${chapTitle ? ' — ' + chapTitle : ''}`
        : `Chapter ${chapNum}${chapTitle ? ' — ' + chapTitle : ''}`;
      continue;
    }

    if (currentChapter) {
      buffer.push(line);
    }
  }
  flush();
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy: Enchiridion — numbered chapters like "1." or "1 "
// ---------------------------------------------------------------------------
function chunkEnchiridion(text, meta) {
  const chunks = [];

  // Split on numbered chapter headings: standalone number at start of line
  // e.g. "\n\n1\n\n" or "1." followed by content
  const chapterRe = /\n\s*(\d+)[.\s]*\n/g;

  const parts = [];
  let lastIndex = 0;
  let lastNum = null;
  let match;

  while ((match = chapterRe.exec(text)) !== null) {
    if (lastNum !== null) {
      parts.push({ num: lastNum, text: text.slice(lastIndex, match.index).trim() });
    }
    lastNum = match[1];
    lastIndex = match.index + match[0].length;
  }
  if (lastNum !== null) {
    parts.push({ num: lastNum, text: text.slice(lastIndex).trim() });
  }

  // Fallback: if we got very few parts, use paragraph strategy
  if (parts.length < 10) {
    return chunkByParagraph(text, meta);
  }

  let chunkIndex = 0;
  for (const part of parts) {
    const txt = part.text;
    if (!txt) continue;
    chunks.push({
      ...meta,
      section_label: `Chapter ${part.num}`,
      chunk_index: chunkIndex++,
      chunk_text: txt,
      word_count: countWords(txt),
    });
  }
  return chunks;
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
// Main export
// ---------------------------------------------------------------------------
function chunkFile(filename, rawText) {
  const meta = TEXT_METADATA[filename];
  if (!meta) {
    throw new Error(`No metadata configured for "${filename}". Add it to TEXT_METADATA in chunker.js.`);
  }

  const text = stripGutenbergBoilerplate(rawText);

  switch (meta.strategy) {
    case 'meditations':    return chunkMeditations(text, meta);
    case 'discourses':     return chunkDiscourses(text, meta);
    case 'enchiridion':    return chunkEnchiridion(text, meta);
    case 'seneca-letters': return chunkSenecaLetters(text, meta);
    default:               return chunkByParagraph(text, meta);
  }
}

module.exports = { chunkFile, TEXT_METADATA };

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

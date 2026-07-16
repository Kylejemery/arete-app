// Passage-metadata enrichment for rag_corpus — in-place section_label updates.
//
// The primary Stoic texts were ingested as 400-word chunks (stride 350) over
// the raw source files, with no passage metadata. This script re-reads the
// same source files, locates the canonical passage boundaries (book/chapter/
// section) as word offsets, and labels every existing chunk with the
// passage(s) it covers — WITHOUT re-chunking or re-embedding, so chunk ids,
// embeddings, and every table referencing them stay intact.
//
// Alignment invariant: chunk i starts at word 350*i of the file's whitespace
// word stream (CHUNK_SIZE 400, OVERLAP 50 — see corpus-ingestion/
// ingest-sources.js and lib/corpus/ingest.ts). The script verifies this
// against the stored chunk_text before writing anything and aborts on drift.
//
// Covered works (source file → label scheme):
//   Epictetus, Enchiridion   → Higginson: centered roman-numeral chapters → "5"
//   Epictetus, Discourses    → Std Ebooks (Long): "Book I" + "XXIV: Title" → "1.24"
//   Marcus Aurelius, Meditations → Long: "BOOK V." + "1. …" sections → "5.1"
//
// Usage (from academy/web, service-role env required):
//   LABEL_PASSAGES=1 npx tsx src/scripts/label-passages.ts          # dry run
//   LABEL_PASSAGES=1 APPLY=1 npx tsx src/scripts/label-passages.ts  # write
//
// Also sets rag_corpus.translator for these works (used by Scribe's
// reference lists) — it is currently null everywhere.

import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '../lib/supabase-admin'

const SOURCE_DIR = join(__dirname, '../../../corpus-ingestion/source_texts')

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 }
function romanToInt(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]]
    const next = ROMAN[s[i + 1]] ?? 0
    n += v < next ? -v : v
  }
  return n
}

// A passage boundary: the word offset (in the file's word stream) where the
// passage starts, and its label.
interface Boundary {
  offset: number
  label: string
}

// Walk the file line by line, tracking the cumulative word count, and let a
// per-work matcher decide when a line starts a new passage.
function findBoundaries(
  lines: string[],
  matcher: (line: string, state: Record<string, number>) => string | null
): Boundary[] {
  const boundaries: Boundary[] = [{ offset: 0, label: 'front matter' }]
  const state: Record<string, number> = {}
  let offset = 0
  for (const line of lines) {
    const label = matcher(line, state)
    if (label !== null) boundaries.push({ offset, label })
    offset += line.split(/\s+/).filter(Boolean).length
  }
  return boundaries
}

interface WorkSpec {
  author: string
  work: string
  file: string
  translator: string
  matcher: (line: string, state: Record<string, number>) => string | null
}

const WORKS: WorkSpec[] = [
  {
    author: 'Epictetus',
    work: 'Enchiridion',
    file: 'Epictetus_Enchiridion_English.txt',
    translator: 'Thomas Wentworth Higginson',
    matcher: (line, state) => {
      // Body begins at the centered title; chapters are centered bare
      // roman numerals. End matter begins at the Gutenberg END marker.
      if (/^\s*THE ENCHIRIDION\s*$/.test(line)) { state.inBody = 1; return null }
      if (/\*\*\* END OF/.test(line)) { state.inBody = 0; return 'end matter' }
      if (!state.inBody) return null
      const m = line.match(/^\s*([IVXLC]+)\s*$/)
      return m ? String(romanToInt(m[1])) : null
    },
  },
  {
    author: 'Epictetus',
    work: 'Discourses',
    file: 'Epictetus_Discourses_English.txt',
    translator: 'George Long',
    matcher: (line, state) => {
      // The TOC lists "Book I" and "XXIV: Title" lines; the BODY starts at
      // the second "Book I" and marks chapters as a BARE roman numeral line
      // followed by the title line. Nothing before the second "Book I" counts.
      const book = line.match(/^Book ([IVX]+)\s*$/)
      if (book) {
        const n = romanToInt(book[1])
        if (n === 1) {
          state.bookOneSeen = (state.bookOneSeen ?? 0) + 1
          if (state.bookOneSeen < 2) return null // TOC "Book I"
        }
        if (!state.inBody && n !== 1) return null // TOC "Book II"–"Book IV"
        state.book = n
        state.inBody = 1
        return null // the bare-numeral chapter line right after carries the label
      }
      if (!state.inBody) return null
      // Long's endnotes follow Book IV chapter 13 — everything after is end matter.
      if (/^Endnotes\s*$/.test(line)) { state.inBody = 0; return 'end matter' }
      const ch = line.match(/^([IVXLC]+)\s*$/)
      return ch ? `${state.book}.${romanToInt(ch[1])}` : null
    },
  },
  {
    author: 'Marcus Aurelius',
    work: 'Meditations',
    file: 'Marcus_Meditations_Long_English.txt',
    translator: 'George Long',
    matcher: (line, state) => {
      const book = line.match(/^BOOK ([IVX]+)\.\s*$/)
      if (book) {
        state.book = romanToInt(book[1])
        state.inBody = 1
        return null
      }
      // Long's closing essay follows Meditations 12.36 — end matter.
      if (/^THE PHILOSOPHY OF MARCUS AURELIUS/.test(line) || /\*\*\* END OF/.test(line)) {
        if (state.inBody) { state.inBody = 0; return 'end matter' }
        return null
      }
      if (!state.inBody) return null
      const sec = line.match(/^([0-9]+)\. /)
      return sec ? `${state.book}.${sec[1]}` : null
    },
  },
]

const STRIDE = 350 // CHUNK_SIZE 400 − OVERLAP 50

function labelFor(boundaries: Boundary[], start: number, end: number): string {
  // Passage in force at `start`, plus any passages beginning before `end`.
  let first = boundaries[0]
  for (const b of boundaries) {
    if (b.offset <= start) first = b
    else break
  }
  const spanned = boundaries.filter(b => b.offset > start && b.offset < end)
  const last = spanned.length ? spanned[spanned.length - 1] : first
  if (first.label === last.label) return first.label
  if (first.label === 'front matter') return spanned.length === 1 ? last.label : `front matter–${last.label}`
  if (last.label === 'end matter') return `${first.label}–end matter`
  return `${first.label}–${last.label}`
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

async function main() {
  if (process.env.LABEL_PASSAGES !== '1') {
    console.error('Refusing to run: set LABEL_PASSAGES=1 (dry run) and APPLY=1 to write.')
    process.exit(1)
  }
  const apply = process.env.APPLY === '1'
  const admin = createAdminClient()

  for (const spec of WORKS) {
    console.log(`\n════ ${spec.author}, ${spec.work} ════`)
    const raw = readFileSync(join(SOURCE_DIR, spec.file), 'utf8')
    const words = raw.split(/\s+/).filter(Boolean)
    const boundaries = findBoundaries(raw.split(/\n/), spec.matcher)
    const real = boundaries.filter(b => !['front matter', 'end matter'].includes(b.label))
    console.log(`file: ${words.length.toLocaleString()} words · ${real.length} passages (${real[0]?.label} … ${real[real.length - 1]?.label})`)

    const { data: chunks, error } = await admin
      .from('rag_corpus')
      .select('id, chunk_index, chunk_text, word_count')
      .eq('author', spec.author)
      .eq('work', spec.work)
      .eq('text_type', 'primary')
      .order('chunk_index')
    if (error) throw new Error(error.message)
    if (!chunks?.length) { console.log('no chunks — skipped'); continue }

    // Chunks beyond the file's own coverage are later APPENDED ingestions
    // (ingestText appends after maxChunkIndex — Meditations has 36 such
    // chunks: a partial duplicate). They can't be aligned to this file, so
    // they're labeled explicitly rather than guessed at.
    const fileChunkCount = Math.ceil(words.length / STRIDE)
    const aligned = chunks.filter(c => c.chunk_index < fileChunkCount)
    const appended = chunks.filter(c => c.chunk_index >= fileChunkCount)

    // Alignment check: the first 8 words of every 25th aligned chunk must
    // match the file's word stream at 350*i.
    let checked = 0
    let misaligned = 0
    for (let i = 0; i < aligned.length; i += 25) {
      const c = aligned[i]
      const expected = norm(words.slice(c.chunk_index * STRIDE, c.chunk_index * STRIDE + 8).join(' '))
      const actual = norm(c.chunk_text.split(/\s+/).filter(Boolean).slice(0, 8).join(' '))
      checked++
      if (expected !== actual) {
        misaligned++
        if (misaligned <= 3) console.log(`  MISALIGNED chunk ${c.chunk_index}:\n    file:  ${expected}\n    chunk: ${actual}`)
      }
    }
    if (misaligned > 0) {
      console.log(`ABORT ${spec.work}: ${misaligned}/${checked} sample chunks misaligned — file no longer matches the ingested text.`)
      continue
    }
    console.log(`alignment: ${checked}/${checked} sample chunks match at stride ${STRIDE}`)

    let updated = 0
    const sample: string[] = []
    for (const c of aligned) {
      const start = c.chunk_index * STRIDE
      const end = start + (c.word_count ?? c.chunk_text.split(/\s+/).filter(Boolean).length)
      const label = labelFor(boundaries, start, end)
      if (sample.length < 6 || c.chunk_index % 50 === 0) {
        sample.push(`  chunk ${c.chunk_index} → ${label}`)
      }
      if (apply) {
        const { error: upErr } = await admin
          .from('rag_corpus')
          .update({ section_label: label, translator: spec.translator })
          .eq('id', c.id)
        if (upErr) throw new Error(`chunk ${c.chunk_index}: ${upErr.message}`)
      }
      updated++
    }
    for (const c of appended) {
      if (apply) {
        const { error: upErr } = await admin
          .from('rag_corpus')
          .update({ section_label: 'duplicate ingestion', translator: spec.translator })
          .eq('id', c.id)
        if (upErr) throw new Error(`appended chunk ${c.chunk_index}: ${upErr.message}`)
      }
    }
    console.log(sample.join('\n'))
    console.log(`${apply ? 'UPDATED' : 'DRY RUN'}: ${updated} chunks labeled${appended.length ? ` · ${appended.length} appended duplicates marked` : ''} · translator = ${spec.translator}`)
  }
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })

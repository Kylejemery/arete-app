// Replace the mislabeled Seneca "Letters" corpus rows with the real
// Epistulae Morales (Gummere translation, public domain, via Wikisource).
//
// Background (docs/scribe-discovery.md follow-up, 2026-07-16): the rows at
// author='Seneca', work='Letters' actually contained L'Estrange's Morals of a
// Happy Life — the source file had the wrong book inside — so the corpus was
// attributing Morals text to the Letters and had no Epistulae Morales at all.
// The duplicate content survives under work='Morals'; nothing is lost.
//
// This script (dry run by default):
//   1. Parses the assembled Gummere file ("LETTER N." headings).
//   2. Deletes the old work='Letters' rows (APPLY=1 only).
//   3. Chunks 400/50 like every other layer, labels each chunk with its
//      letter number(s) ("91", "12–13"), embeds, and inserts with
//      translator='Richard Mott Gummere'.
//
// Usage (from academy/web):
//   INGEST_LETTERS=1 npx tsx src/scripts/ingest-letters.ts <file>          # dry run
//   INGEST_LETTERS=1 APPLY=1 npx tsx src/scripts/ingest-letters.ts <file>  # write

import { readFileSync } from 'fs'
import { createAdminClient } from '../lib/supabase-admin'
import { embedChunk } from '../lib/corpus/ingest'

const CHUNK_SIZE = 400
const STRIDE = 350
const PROGRAM_ID = 'stoicism-phd'
const TRANSLATOR = 'Richard Mott Gummere'
const SOURCE_URL = 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius'

interface Boundary { offset: number; label: string }

function labelFor(boundaries: Boundary[], start: number, end: number): string {
  let first = boundaries[0]
  for (const b of boundaries) {
    if (b.offset <= start) first = b
    else break
  }
  const spanned = boundaries.filter(b => b.offset > start && b.offset < end)
  const last = spanned.length ? spanned[spanned.length - 1] : first
  if (first.label === last.label) return first.label
  if (first.label === 'front matter') return spanned.length === 1 ? last.label : `front matter–${last.label}`
  return `${first.label}–${last.label}`
}

async function main() {
  if (process.env.INGEST_LETTERS !== '1') {
    console.error('Refusing to run: set INGEST_LETTERS=1 (dry run) and APPLY=1 to write.')
    process.exit(1)
  }
  const apply = process.env.APPLY === '1'
  const file = process.argv[2]
  if (!file) { console.error('Usage: ingest-letters.ts <assembled-gummere-file>'); process.exit(1) }

  const raw = readFileSync(file, 'utf8')
  const lines = raw.split(/\n/)
  const boundaries: Boundary[] = [{ offset: 0, label: 'front matter' }]
  let offset = 0
  for (const line of lines) {
    const m = line.match(/^LETTER (\d+)\.\s*$/)
    if (m) boundaries.push({ offset, label: m[1] })
    offset += line.split(/\s+/).filter(Boolean).length
  }
  const words = raw.split(/\s+/).filter(Boolean)
  const letters = boundaries.length - 1
  console.log(`file: ${words.length.toLocaleString()} words · ${letters} letters (1…${boundaries[boundaries.length - 1].label})`)
  if (letters < 124) console.log(`WARNING: expected 124 letters, found ${letters}`)

  // Chunk plan
  const chunks: { index: number; content: string; label: string; wc: number }[] = []
  let i = 0
  let idx = 0
  while (i < words.length) {
    const slice = words.slice(i, i + CHUNK_SIZE)
    const content = slice.join(' ')
    if (content.trim().length > 0) {
      chunks.push({ index: idx, content, label: labelFor(boundaries, i, i + slice.length), wc: slice.length })
      idx++
    }
    i += STRIDE
  }
  console.log(`chunk plan: ${chunks.length} chunks`)
  for (const c of [0, 50, Math.floor(chunks.length / 2), chunks.length - 1]) {
    console.log(`  chunk ${c} → ${chunks[c].label}`)
  }

  const admin = createAdminClient()
  const { count } = await admin
    .from('rag_corpus')
    .select('id', { count: 'exact', head: true })
    .eq('author', 'Seneca')
    .eq('work', 'Letters')
  console.log(`existing (mislabeled L'Estrange) work='Letters' rows to delete: ${count}`)

  if (!apply) { console.log('\nDRY RUN — set APPLY=1 to replace.'); return }

  const { error: delErr } = await admin
    .from('rag_corpus')
    .delete()
    .eq('author', 'Seneca')
    .eq('work', 'Letters')
  if (delErr) throw new Error(`delete: ${delErr.message}`)
  console.log('old rows deleted; embedding + inserting…')

  for (const c of chunks) {
    const embedding = await embedChunk(c.content)
    const { error } = await admin.from('rag_corpus').insert({
      chunk_text: c.content,
      author: 'Seneca',
      work: 'Letters',
      section_label: c.label,
      language: 'english',
      program_id: PROGRAM_ID,
      course_relevance: null,
      difficulty: null,
      text_type: 'primary',
      translator: TRANSLATOR,
      source_url: SOURCE_URL,
      chunk_index: c.index,
      word_count: c.wc,
      embedding,
    })
    if (error) throw new Error(`insert chunk ${c.index}: ${error.message}`)
    if (c.index % 100 === 0) console.log(`  inserted ${c.index}/${chunks.length}…`)
  }
  console.log(`DONE: ${chunks.length} chunks ingested as Seneca, Letters (tr. Gummere).`)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })

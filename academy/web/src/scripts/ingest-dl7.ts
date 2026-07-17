// Replace the Yonge Diogenes Laertius Book VII rows with the Hicks
// translation (Loeb 1925, public domain, via Wikisource), which carries the
// canonical section numbering — so citations like "DL 7.87" machine-verify.
//
// Background: the previous text (Yonge, Gutenberg) has no section numbers
// (its [N] brackets are footnote markers), so DL locators could never be
// adjudicated. The old rows had 6 concept-map references, none approved, and
// no Scribe citations.
//
// Usage (from academy/web):
//   INGEST_DL7=1 npx tsx src/scripts/ingest-dl7.ts <file>          # dry run
//   INGEST_DL7=1 APPLY=1 npx tsx src/scripts/ingest-dl7.ts <file>  # write

import { readFileSync } from 'fs'
import { createAdminClient } from '../lib/supabase-admin'
import { embedChunk } from '../lib/corpus/ingest'

const CHUNK_SIZE = 400
const STRIDE = 350
const PROGRAM_ID = 'stoicism-phd'
const AUTHOR = 'Diogenes Laërtius'
const WORK = 'Lives Book7'
const TRANSLATOR = 'R.D. Hicks'
const SOURCE_URL = 'https://en.wikisource.org/wiki/Lives_of_the_Eminent_Philosophers/Book_VII'

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
  if (process.env.INGEST_DL7 !== '1') {
    console.error('Refusing to run: set INGEST_DL7=1 (dry run) and APPLY=1 to write.')
    process.exit(1)
  }
  const apply = process.env.APPLY === '1'
  const file = process.argv[2]
  if (!file) { console.error('Usage: ingest-dl7.ts <hicks-book7-file>'); process.exit(1) }

  const raw = readFileSync(file, 'utf8')
  const boundaries: Boundary[] = [{ offset: 0, label: 'front matter' }]
  let offset = 0
  for (const line of raw.split(/\n/)) {
    const m = line.match(/^SECTION (\d+)\.\s*$/)
    if (m) boundaries.push({ offset, label: `7.${m[1]}` })
    offset += line.split(/\s+/).filter(Boolean).length
  }
  const words = raw.split(/\s+/).filter(Boolean)
  console.log(`file: ${words.length.toLocaleString()} words · ${boundaries.length - 1} sections (…${boundaries[boundaries.length - 1].label})`)

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
  for (const c of [0, Math.floor(chunks.length / 2), chunks.length - 1]) {
    console.log(`  chunk ${c} → ${chunks[c].label}`)
  }

  const admin = createAdminClient()
  const { count } = await admin
    .from('rag_corpus')
    .select('id', { count: 'exact', head: true })
    .eq('author', AUTHOR)
    .eq('work', WORK)
  console.log(`existing (Yonge) rows to delete: ${count}`)

  if (!apply) { console.log('\nDRY RUN — set APPLY=1 to replace.'); return }

  const { error: delErr } = await admin
    .from('rag_corpus')
    .delete()
    .eq('author', AUTHOR)
    .eq('work', WORK)
  if (delErr) throw new Error(`delete: ${delErr.message}`)
  console.log('old rows deleted; embedding + inserting…')

  for (const c of chunks) {
    const embedding = await embedChunk(c.content)
    const { error } = await admin.from('rag_corpus').insert({
      chunk_text: c.content,
      author: AUTHOR,
      work: WORK,
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
    if (c.index % 25 === 0) console.log(`  inserted ${c.index}/${chunks.length}…`)
  }
  console.log(`DONE: ${chunks.length} chunks ingested as ${AUTHOR}, ${WORK} (tr. Hicks).`)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })

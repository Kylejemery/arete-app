// Generic passage-labeled corpus ingestion — supersedes the per-work scripts
// (ingest-letters.ts, ingest-dl7.ts) for future additions.
//
// Input file convention: plain text with passage headings on their own lines,
// either "SECTION 12." or "CHAPTER 12." — the number becomes the
// section_label (with an optional prefix, e.g. --prefix 7. for DL VII style
// labels). Chunks follow the corpus convention (400 words, 50 overlap) and
// spanning chunks get range labels ("12–13").
//
// Usage (from academy/web; dry run without APPLY=1):
//   INGEST_WORK=1 [APPLY=1] npx tsx src/scripts/ingest-labeled-work.ts \
//     --file <path> --author "Plutarch" --work "On Stoic Self-Contradictions" \
//     --translator "W.W. Goodwin" --url "https://…" [--prefix "7."] [--replace]

import { readFileSync } from 'fs'
import { createAdminClient } from '../lib/supabase-admin'
import { embedChunk } from '../lib/corpus/ingest'

const CHUNK_SIZE = 400
const STRIDE = 350
const PROGRAM_ID = 'stoicism-phd'

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? null : process.argv[i + 1] ?? null
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

interface Boundary { offset: number; label: string }

// Range-aware join: labels may themselves be ranges ("2.54–2.59") — a chunk
// spanning several takes the low end of the first and the high end of the last.
function joinLabels(a: string, b: string): string {
  const lo = a.split('–')[0]
  const parts = b.split('–')
  const hi = parts[parts.length - 1]
  return lo === hi ? lo : `${lo}–${hi}`
}

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
  return joinLabels(first.label, last.label)
}

// --sparse: the source anchors only some sections (e.g. ToposText ND anchors
// 170 of ~370). Expand each anchor's label to the range it actually covers —
// "2.54" followed by "2.60" becomes "2.54–2.59" — so citations of the
// unanchored sections in between verify instead of false-mismatching.
function expandSparse(boundaries: Boundary[]): void {
  for (let i = 1; i < boundaries.length - 1; i++) {
    const cur = boundaries[i].label
    const next = boundaries[i + 1].label
    const c = cur.match(/^(.*?)(\d+)$/)
    const n = next.match(/^(.*?)(\d+)$/)
    if (!c || !n || c[1] !== n[1]) continue // sentinel or book boundary
    const gapEnd = parseInt(n[2], 10) - 1
    if (gapEnd > parseInt(c[2], 10)) boundaries[i].label = `${cur}–${c[1]}${gapEnd}`
  }
}

async function main() {
  if (process.env.INGEST_WORK !== '1') {
    console.error('Refusing to run: set INGEST_WORK=1 (dry run) and APPLY=1 to write.')
    process.exit(1)
  }
  const apply = process.env.APPLY === '1'
  const file = arg('file')
  const author = arg('author')
  const work = arg('work')
  const translator = arg('translator')
  const sourceUrl = arg('url')
  const prefix = arg('prefix') ?? ''
  if (!file || !author || !work || !translator) {
    console.error('Required: --file --author --work --translator (optional: --url --prefix --replace)')
    process.exit(1)
  }

  const raw = readFileSync(file, 'utf8')
  const boundaries: Boundary[] = [{ offset: 0, label: 'front matter' }]
  let offset = 0
  for (const line of raw.split(/\n/)) {
    const m = line.match(/^(?:SECTION|CHAPTER) (\d+(?:\.\d+)?)\.\s*$/)
    if (m) boundaries.push({ offset, label: `${prefix}${m[1]}` })
    offset += line.split(/\s+/).filter(Boolean).length
  }
  if (flag('sparse')) expandSparse(boundaries)
  const words = raw.split(/\s+/).filter(Boolean)
  console.log(`${author}, ${work}: ${words.length.toLocaleString()} words · ${boundaries.length - 1} passages (…${boundaries[boundaries.length - 1].label})`)

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
    if (chunks[c]) console.log(`  chunk ${c} → ${chunks[c].label}`)
  }

  const admin = createAdminClient()
  const { count } = await admin
    .from('rag_corpus')
    .select('id', { count: 'exact', head: true })
    .eq('author', author)
    .eq('work', work)
  if ((count ?? 0) > 0 && !flag('replace')) {
    console.error(`ABORT: ${count} rows already exist for ${author}, ${work} — pass --replace to overwrite.`)
    process.exit(1)
  }
  if ((count ?? 0) > 0) console.log(`existing rows to delete: ${count}`)

  if (!apply) { console.log('\nDRY RUN — set APPLY=1 to write.'); return }

  if ((count ?? 0) > 0) {
    const { error: delErr } = await admin
      .from('rag_corpus')
      .delete()
      .eq('author', author)
      .eq('work', work)
    if (delErr) throw new Error(`delete: ${delErr.message}`)
  }

  for (const c of chunks) {
    const embedding = await embedChunk(c.content)
    const { error } = await admin.from('rag_corpus').insert({
      chunk_text: c.content,
      author,
      work,
      section_label: c.label,
      language: 'english',
      program_id: PROGRAM_ID,
      course_relevance: null,
      difficulty: null,
      text_type: 'primary',
      translator,
      source_url: sourceUrl,
      chunk_index: c.index,
      word_count: c.wc,
      embedding,
    })
    if (error) throw new Error(`insert chunk ${c.index}: ${error.message}`)
    if (c.index % 25 === 0) console.log(`  inserted ${c.index}/${chunks.length}…`)
  }
  console.log(`DONE: ${chunks.length} chunks ingested as ${author}, ${work} (tr. ${translator}).`)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })

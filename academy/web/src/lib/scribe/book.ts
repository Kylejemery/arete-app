// Scribe book mode, the pure half: splitting a pasted draft into chapters,
// chunking a chapter for the book's own retrieval index, keeping a turn's
// context inside its token budget, windowing a long thread, reading the
// findings the review jobs emit, and the chat commands that start them.
//
// No React, no DOM, no network, no Supabase: safe in the browser, on the
// server, and in the offline smoke script (src/scripts/scribe-book-smoke.ts).
// The server half (rows, embeddings, model calls) is book-store.ts.
//
// Design and numbers: docs/scribe/BOOK_DRAFT_DESIGN.md.

import { quoteMatchesChunk } from './quote-check'
import { GAPS_PROMPT, GAPS_PROMPT_STANDALONE, rewritePrompt } from './book-prompts'

// ── Words and tokens ──────────────────────────────────────────────────────

export function countWords(text: string): number {
  return (text.match(/[^\s]+/g) ?? []).length
}

// Characters over four: close enough on English prose for a budget, and the
// same estimate the design note's numbers use. messages.countTokens can
// re-baseline it if the estimate ever matters to the cent.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Cut text to a token budget at a sentence end where one is near, with a note
// saying it was cut, so the model never mistakes a truncation for the end.
export function truncateToTokens(text: string, tokens: number, note = '[cut here to fit the budget]'): string {
  const max = tokens * 4
  if (text.length <= max) return text
  const head = text.slice(0, max)
  const lastStop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('.\n'), head.lastIndexOf('\n\n'))
  const cut = lastStop > max * 0.6 ? head.slice(0, lastStop + 1) : head
  return `${cut.trimEnd()}\n\n${note}`
}

// ── Hashing ───────────────────────────────────────────────────────────────

// FNV-1a in two seeds, sixteen hex characters. Change detection only: a
// collision costs a stale embedding, never a wrong text, so this beats
// pulling node:crypto into a module the browser also loads.
export function hashText(text: string): string {
  let a = 0x811c9dc5
  let b = 0x050c5d1f
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    a ^= c
    a = Math.imul(a, 0x01000193) >>> 0
    b ^= c
    b = Math.imul(b, 0x01000193) >>> 0
    b = (b + 0x9e3779b9) >>> 0
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
}

// ── Splitting a pasted draft into chapters ────────────────────────────────

export type SplitStrategy = 'auto' | 'headings' | 'markers' | 'size'

export interface ChapterDraft {
  title: string
  text: string
  words: number
}

export interface SplitResult {
  strategy: Exclude<SplitStrategy, 'auto'>
  chapters: ChapterDraft[]
}

const HEADING = /^(#{1,2})\s+(.+?)\s*#*\s*$/
// "Chapter 4", "Essay II", "Part 3: The Gutter", "4.", "IV"
const MARKER = /^\s*(?:(?:chapter|essay|part)\s+(?:\d{1,3}|[ivxlc]{1,7})\b[\s.:]*(.*)|(\d{1,3}|[IVXLC]{1,7})[.)]?)\s*$/i
// A short line in capitals with at least two words, on its own.
const CAPS_TITLE = /^\s*[A-Z][A-Z0-9'’,;:!?&\s]{3,80}$/
const SIZE_TARGET_WORDS = 3000
const MIN_PREAMBLE_WORDS = 30

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

function paragraphs(text: string): string[] {
  return normalizeNewlines(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
}

function chapterFrom(title: string, lines: string[]): ChapterDraft | null {
  const text = lines.join('\n').replace(/^\n+|\n+$/g, '')
  const words = countWords(text)
  if (!words) return null
  return { title: title.trim() || 'Untitled', text, words }
}

function splitByHeadings(text: string): ChapterDraft[] {
  const lines = normalizeNewlines(text).split('\n')
  const out: ChapterDraft[] = []
  let title = ''
  let buf: string[] = []
  let sawHeading = false
  for (const line of lines) {
    const m = line.match(HEADING)
    if (m) {
      const done = chapterFrom(sawHeading ? title : 'Opening', buf)
      if (done && (sawHeading || done.words >= MIN_PREAMBLE_WORDS)) out.push(done)
      else if (done && !sawHeading) buf = [...buf] // short preamble folds into the first chapter
      if (sawHeading || !done || done.words >= MIN_PREAMBLE_WORDS) buf = []
      title = m[2]
      sawHeading = true
      continue
    }
    buf.push(line)
  }
  const last = chapterFrom(sawHeading ? title : 'Opening', buf)
  if (last) out.push(last)
  return out
}

function isCapsTitle(line: string, next: string | undefined): boolean {
  if (!CAPS_TITLE.test(line)) return false
  const words = line.trim().split(/\s+/)
  if (words.length < 2 || words.length > 12) return false
  if (!/[A-Z]/.test(line) || /[a-z]/.test(line)) {
    return next === undefined || next.trim() === ''
  }
  return false
}

function splitByMarkers(text: string): ChapterDraft[] {
  const lines = normalizeNewlines(text).split('\n')
  const out: ChapterDraft[] = []
  let title = ''
  let buf: string[] = []
  let sawMarker = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(MARKER)
    const caps = !m && isCapsTitle(line, lines[i + 1])
    if (m || caps) {
      const done = chapterFrom(sawMarker ? title : 'Opening', buf)
      if (done && (sawMarker || done.words >= MIN_PREAMBLE_WORDS)) out.push(done)
      buf = []
      let t = caps ? line.trim() : (m![1] ?? '').trim() || line.trim()
      // A bare marker ("Chapter 2", "IV") takes the short line under it as
      // its title, blank lines skipped.
      if (m && !(m[1] ?? '').trim()) {
        let j = i + 1
        while (j < lines.length && j <= i + 3 && !lines[j].trim()) j++
        const next = lines[j]?.trim() ?? ''
        if (next && next.length <= 80 && !/[.!?]$/.test(next) && !MARKER.test(next)) {
          t = next
          i = j
        }
      }
      title = t
      sawMarker = true
      continue
    }
    buf.push(line)
  }
  const last = chapterFrom(sawMarker ? title : 'Opening', buf)
  if (last) out.push(last)
  return out
}

function splitBySize(text: string, target = SIZE_TARGET_WORDS): ChapterDraft[] {
  const paras = paragraphs(text)
  const out: ChapterDraft[] = []
  let buf: string[] = []
  let words = 0
  const flush = () => {
    if (!buf.length) return
    const body = buf.join('\n\n')
    out.push({ title: `Section ${out.length + 1}`, text: body, words: countWords(body) })
    buf = []
    words = 0
  }
  for (const p of paras) {
    const w = countWords(p)
    if (words && words + w > target) flush()
    buf.push(p)
    words += w
  }
  flush()
  return out
}

// Headings when there are at least two, else markers when there are at least
// two, else fixed size cut at paragraph breaks. Every word of the paste ends
// up in exactly one chapter.
export function splitChapters(text: string, strategy: SplitStrategy = 'auto'): SplitResult {
  if (strategy === 'headings') return { strategy, chapters: splitByHeadings(text) }
  if (strategy === 'markers') return { strategy, chapters: splitByMarkers(text) }
  if (strategy === 'size') return { strategy, chapters: splitBySize(text) }
  const byHeadings = splitByHeadings(text)
  if (byHeadings.filter(c => c.title !== 'Opening').length >= 2) return { strategy: 'headings', chapters: byHeadings }
  const byMarkers = splitByMarkers(text)
  if (byMarkers.filter(c => c.title !== 'Opening').length >= 2) return { strategy: 'markers', chapters: byMarkers }
  return { strategy: 'size', chapters: splitBySize(text) }
}

// ── Shaping: a proposed structure over numbered paragraphs ────────────────

export interface NumberedParagraph {
  n: number // 1-based, as shown to the model
  text: string
  words: number
}

export function numberParagraphs(text: string): NumberedParagraph[] {
  return paragraphs(text).map((p, i) => ({ n: i + 1, text: p, words: countWords(p) }))
}

export function renderNumberedParagraphs(paras: NumberedParagraph[]): string {
  return paras.map(p => `[${p.n}] ${p.text}`).join('\n\n')
}

export interface ShapePart {
  title: string
  thesis: string
  lacks: string
  paragraphs: number[]
}

export interface ShapeProposal {
  form: 'book' | 'essay' | 'chapter' | 'pieces'
  title: string | null
  note: string
  parts: ShapePart[]
}

export function parseShape(text: string): ShapeProposal | null {
  const v = findJson(text, 'parts') as Record<string, unknown> | null
  if (!v) return null
  const form = (['book', 'essay', 'chapter', 'pieces'] as const).includes(v.form as ShapeProposal['form'])
    ? (v.form as ShapeProposal['form'])
    : 'book'
  const parts = ((v.parts as unknown[]) ?? [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map(p => ({
      title: String(p.title ?? '').trim() || 'Untitled',
      thesis: String(p.thesis ?? '').trim(),
      lacks: String(p.lacks ?? '').trim(),
      paragraphs: (Array.isArray(p.paragraphs) ? p.paragraphs : [])
        .map(n => Number(n))
        .filter(n => Number.isInteger(n) && n > 0),
    }))
  return {
    form,
    title: v.title ? String(v.title) : null,
    note: String(v.note ?? '').trim(),
    parts,
  }
}

// Turn a proposal into chapter drafts. Each paragraph lands once: a paragraph
// listed twice keeps its first placement, and any the proposal forgot are
// gathered into a final Unplaced part so nothing Kyle typed disappears.
export function assembleShape(paras: NumberedParagraph[], proposal: ShapeProposal): ChapterDraft[] {
  const byN = new Map(paras.map(p => [p.n, p]))
  const placed = new Set<number>()
  const out: ChapterDraft[] = []
  for (const part of proposal.parts) {
    const texts: string[] = []
    for (const n of part.paragraphs) {
      const p = byN.get(n)
      if (!p || placed.has(n)) continue
      placed.add(n)
      texts.push(p.text)
    }
    if (!texts.length) continue
    const text = texts.join('\n\n')
    out.push({ title: part.title, text, words: countWords(text) })
  }
  const left = paras.filter(p => !placed.has(p.n))
  if (left.length) {
    const unplaced = out.find(c => c.title.toLowerCase() === 'unplaced')
    const text = left.map(p => p.text).join('\n\n')
    if (unplaced) {
      unplaced.text = `${unplaced.text}\n\n${text}`
      unplaced.words = countWords(unplaced.text)
    } else {
      out.push({ title: 'Unplaced', text, words: countWords(text) })
    }
  }
  return out
}

// ── Chunking a chapter for the book index ─────────────────────────────────

// Chunks of about 400 words, the corpus chunk size, but aligned to paragraph
// breaks and without overlap. The corpus chunker slides a fixed window, which
// is right for a text that never changes; a draft changes every turn, and a
// sliding window would shift every chunk after an edit and re-embed the whole
// chapter for one new sentence. Paragraph aligned chunks keep an edit's cost
// to the chunk that holds it. A paragraph longer than the window is cut into
// plain windows on its own.
export const CHUNK_WORDS = 400

export interface DraftChunk {
  chunk_index: number
  content: string
  content_hash: string
}

export function chunkDraft(text: string): DraftChunk[] {
  const pieces: string[] = []
  let buf: string[] = []
  let words = 0
  const flush = () => {
    if (buf.length) pieces.push(buf.join('\n\n'))
    buf = []
    words = 0
  }
  for (const p of paragraphs(text)) {
    const w = countWords(p)
    if (w > CHUNK_WORDS * 1.5) {
      flush()
      const ws = p.split(/\s+/).filter(Boolean)
      for (let i = 0; i < ws.length; i += CHUNK_WORDS) pieces.push(ws.slice(i, i + CHUNK_WORDS).join(' '))
      continue
    }
    if (words && words + w > CHUNK_WORDS) flush()
    buf.push(p)
    words += w
  }
  flush()
  return pieces
    .filter(c => c.trim())
    .map((content, i) => ({ chunk_index: i, content, content_hash: hashText(content) }))
}

// What a reindex has to do, given the chunks already stored for the chapter.
// A chunk whose hash is already stored keeps its embedding; only new hashes
// are embedded, and indexes past the new end are removed.
export interface ChunkPlan {
  embed: DraftChunk[]          // new content, needs an embedding
  reuse: { chunk_index: number; from_index: number }[] // same hash exists at another index
  keep: number[]               // same hash at the same index, nothing to do
  remove: number[]             // stored indexes no longer present
}

export function planChunks(next: DraftChunk[], stored: { chunk_index: number; content_hash: string }[]): ChunkPlan {
  const byIndex = new Map(stored.map(s => [s.chunk_index, s.content_hash]))
  const byHash = new Map<string, number>()
  for (const s of stored) if (!byHash.has(s.content_hash)) byHash.set(s.content_hash, s.chunk_index)
  const plan: ChunkPlan = { embed: [], reuse: [], keep: [], remove: [] }
  for (const c of next) {
    if (byIndex.get(c.chunk_index) === c.content_hash) plan.keep.push(c.chunk_index)
    else if (byHash.has(c.content_hash)) plan.reuse.push({ chunk_index: c.chunk_index, from_index: byHash.get(c.content_hash)! })
    else plan.embed.push(c)
  }
  for (const s of stored) if (s.chunk_index >= next.length) plan.remove.push(s.chunk_index)
  return plan
}

// ── The book brief and outline ────────────────────────────────────────────

export interface OutlineChapter {
  id: string
  position: number
  title: string
  status: string
  word_count: number
  summary: string | null
  argument: ChapterArgument | null
}

export interface ChapterArgument {
  thesis?: string
  claims?: string[]
  depends_on?: string[]
  open_questions?: string[]
}

export interface BookArgument {
  thesis?: string
  through_line?: string
  open_questions?: string[]
}

export interface BookBriefInput {
  title: string
  summary: string | null
  argument: BookArgument | null
  chapters: OutlineChapter[]
  currentChapterId: string | null
}

const OUTLINE_LINE_CHARS = 240        // about sixty tokens a chapter
const BRIEF_SUMMARY_TOKENS = 2500
const NEIGHBOURS_TOKENS = 800

function firstSentence(text: string | null | undefined): string {
  if (!text) return ''
  const m = text.trim().match(/^[\s\S]*?[.!?](?=\s|$)/)
  return (m ? m[0] : text.trim()).replace(/\s+/g, ' ')
}

// One line per chapter, in order. Derived, never stored, so it is never stale.
export function buildOutline(chapters: OutlineChapter[], currentId: string | null = null): string {
  return [...chapters]
    .sort((a, b) => a.position - b.position)
    .map(c => {
      const mark = c.id === currentId ? ' (this chapter)' : ''
      const head = `${c.position}. ${c.title} [${c.status}, ${c.word_count.toLocaleString()} words]${mark}`
      const line = `${head} ${firstSentence(c.summary)}`.trim()
      return line.length > OUTLINE_LINE_CHARS ? `${line.slice(0, OUTLINE_LINE_CHARS - 1).trimEnd()}…` : line
    })
    .join('\n')
}

function argumentLines(a: ChapterArgument | BookArgument | null | undefined): string {
  if (!a) return ''
  const out: string[] = []
  if (a.thesis) out.push(`Thesis: ${a.thesis}`)
  if ('through_line' in a && a.through_line) out.push(`Through line: ${a.through_line}`)
  if ('claims' in a && a.claims?.length) out.push(`Claims: ${a.claims.join(' | ')}`)
  if ('depends_on' in a && a.depends_on?.length) out.push(`Depends on: ${a.depends_on.join(' | ')}`)
  if (a.open_questions?.length) out.push(`Open questions: ${a.open_questions.join(' | ')}`)
  return out.join('\n')
}

// The block that rides as the second system segment in book mode. Stable
// between turns until a summary changes, so it caches.
export function buildBookBrief(input: BookBriefInput): string {
  const chapters = [...input.chapters].sort((a, b) => a.position - b.position)
  const parts: string[] = []
  parts.push(`BOOK BRIEF\nTitle: ${input.title}`)
  const arg = argumentLines(input.argument)
  if (arg) parts.push(arg)
  parts.push(
    input.summary
      ? `Rolling summary:\n${truncateToTokens(input.summary, BRIEF_SUMMARY_TOKENS)}`
      : 'Rolling summary: not written yet; the outline is what there is.'
  )
  parts.push(`OUTLINE\n${buildOutline(chapters, input.currentChapterId) || '(no chapters yet)'}`)

  if (input.currentChapterId) {
    const i = chapters.findIndex(c => c.id === input.currentChapterId)
    const cur = chapters[i]
    if (cur) {
      const card = [`THIS CHAPTER\n${cur.position}. ${cur.title}`]
      const a = argumentLines(cur.argument)
      if (a) card.push(a)
      if (cur.summary) card.push(`Summary: ${cur.summary}`)
      parts.push(card.join('\n'))
      const near = [chapters[i - 1], chapters[i + 1]].filter(Boolean)
      if (near.length) {
        let budget = NEIGHBOURS_TOKENS
        const lines: string[] = []
        for (const n of near) {
          const s = n.summary ? truncateToTokens(n.summary, Math.floor(budget / near.length)) : '(no summary yet)'
          budget -= estimateTokens(s)
          lines.push(`${n.position}. ${n.title}: ${s}`)
        }
        parts.push(`NEIGHBOURING CHAPTERS\n${lines.join('\n')}`)
      }
    }
  }
  return parts.join('\n\n')
}

// ── Thread windowing ──────────────────────────────────────────────────────

export interface ThreadMessage {
  id: string
  role: 'user' | 'scribe'
  content: string
  draft_text?: string | null
}

export interface HistoryMessage {
  role: 'user' | 'scribe'
  content: string
}

// A hand revision or an old style turn carries the whole draft in its
// content. The draft state is in draft_text and the current one rides on the
// last message, so history gets a one line stand in instead. Storage is never
// touched; this shapes what the model is sent.
export function stripDraftBody(content: string): string {
  const revision = content.match(/<kyle-edit summary="([^"]*)"\s*\/>/)
  if (revision) {
    const summary = revision[1].trim()
    return `I settled the changes by hand${summary ? ` (${summary})` : ''}. The draft as I left it became the working draft; carry it forward exactly.`
  }
  return content
    .replace(/<draft>[\s\S]*?<\/draft>/g, '[draft text omitted here; the working draft rides on the latest message]')
    .replace(/<working_draft>[\s\S]*?<\/working_draft>/g, '')
}

export interface WindowOptions {
  recentBudgetTokens: number
  // Never fold below this many turns, so the model always has the immediate
  // exchange in front of it.
  minRecent?: number
  summaryThroughId: string | null
}

export interface WindowedThread {
  // What to send, in order: the pinned opening, the summary note slot (filled
  // by the caller once a summary exists), then the recent turns.
  opening: HistoryMessage | null
  recent: HistoryMessage[]
  // Turns that should now be folded into the summary, oldest first. Empty
  // when the recent turns fit the budget.
  fold: ThreadMessage[]
  // The id the summary marker should advance to after folding.
  foldThroughId: string | null
  tokens: { opening: number; recent: number; folded: number }
}

export function windowThread(thread: ThreadMessage[], opts: WindowOptions): WindowedThread {
  const minRecent = opts.minRecent ?? 4
  if (!thread.length) return { opening: null, recent: [], fold: [], foldThroughId: null, tokens: { opening: 0, recent: 0, folded: 0 } }

  // The opening message is the fragment or the imported chapter: always
  // pinned, bodies stripped.
  const opening: HistoryMessage = { role: thread[0].role, content: stripDraftBody(thread[0].content) }

  // Everything after the marker (or after the opening) is a candidate.
  let start = 1
  if (opts.summaryThroughId) {
    const at = thread.findIndex(m => m.id === opts.summaryThroughId)
    if (at >= 0) start = Math.max(1, at + 1)
  }
  const candidates = thread.slice(start)
  const stripped = candidates.map(m => ({ role: m.role, content: stripDraftBody(m.content) }))

  // Take from the end while the budget holds; keep the minimum regardless.
  let tokens = 0
  let keepFrom = stripped.length
  for (let i = stripped.length - 1; i >= 0; i--) {
    const t = estimateTokens(stripped[i].content)
    const mustKeep = stripped.length - i <= minRecent
    if (!mustKeep && tokens + t > opts.recentBudgetTokens) break
    tokens += t
    keepFrom = i
  }
  // Never start the recent window on a scribe turn that answers a folded
  // user turn: include that user turn so the exchange stays whole.
  if (keepFrom > 0 && stripped[keepFrom].role === 'scribe' && stripped[keepFrom - 1].role === 'user') keepFrom--

  const fold = candidates.slice(0, keepFrom)
  const recent = stripped.slice(keepFrom)
  return {
    opening,
    recent,
    fold,
    foldThroughId: fold.length ? fold[fold.length - 1].id : null,
    tokens: {
      opening: estimateTokens(opening.content),
      recent: recent.reduce((n, m) => n + estimateTokens(m.content), 0),
      folded: fold.reduce((n, m) => n + estimateTokens(stripDraftBody(m.content)), 0),
    },
  }
}

// ── The turn budget ───────────────────────────────────────────────────────

export const TURN_BUDGET_TOKENS = 60_000
export const RECENT_TURNS_TOKENS = 12_000
export const EXEMPLARS_TOKENS = 4_000
export const TOOL_RESULT_TOKENS = 20_000
export const THREAD_SUMMARY_TOKENS = 1_500

export interface BudgetParts {
  system: number
  exemplars: number
  brief: number
  threadSummary: number
  history: number
  workingDraft: number
}

export interface BudgetReport extends BudgetParts {
  total: number
  ceiling: number
  over: number
}

export function budgetReport(parts: BudgetParts, ceiling = TURN_BUDGET_TOKENS): BudgetReport {
  const total = parts.system + parts.exemplars + parts.brief + parts.threadSummary + parts.history + parts.workingDraft
  return { ...parts, total, ceiling, over: Math.max(0, total - ceiling) }
}

// Exemplars newest first, each cut to fit what remains of the exemplar budget.
export function fitExemplars(
  exemplars: { title: string; text: string }[],
  budgetTokens = EXEMPLARS_TOKENS
): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = []
  let left = budgetTokens
  for (const e of exemplars) {
    if (!e?.text?.trim() || left < 200) continue
    const text = truncateToTokens(e.text, left, '[exemplar cut to fit the voice budget]')
    left -= estimateTokens(text)
    out.push({ title: e.title, text })
  }
  return out
}

// ── Findings ──────────────────────────────────────────────────────────────

export type FindingKind = 'gap' | 'cross_gap' | 'fact'

export interface ParsedFinding {
  kind: 'gap' | 'cross_gap'
  passage: string
  note: string
  chapter_position: number | null
}

// The first JSON value in a reply that has a `findings` array: a fenced block
// first, then the widest brace span that parses.
function findJson(text: string, key: string): unknown | null {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(m => m[1])
  const candidates = [...fenced, text]
  for (const c of candidates) {
    let at = c.indexOf('{')
    while (at >= 0) {
      for (let end = c.length; end > at; end--) {
        if (c[end - 1] !== '}') continue
        try {
          const v = JSON.parse(c.slice(at, end)) as Record<string, unknown>
          if (v && typeof v === 'object' && Array.isArray(v[key])) return v
        } catch {
          // keep shrinking
        }
      }
      at = c.indexOf('{', at + 1)
    }
  }
  return null
}

export function parseFindings(text: string): ParsedFinding[] {
  const v = findJson(text, 'findings') as { findings?: unknown[] } | null
  if (!v) return []
  return (v.findings ?? [])
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map(f => ({
      kind: f.kind === 'cross_gap' ? ('cross_gap' as const) : ('gap' as const),
      passage: String(f.passage ?? '').trim(),
      note: String(f.note ?? '').trim(),
      chapter_position: typeof f.chapter_position === 'number' ? f.chapter_position : null,
    }))
    .filter(f => f.passage || f.note)
}

// Strip the findings block from a reply so the conversation shows the prose.
export function stripFindingsBlock(text: string): string {
  return text.replace(/```(?:json)?\s*\{[\s\S]*?"findings"[\s\S]*?```/g, '').trim()
}

export type ClaimKind = 'figure' | 'text' | 'date' | 'attribution' | 'doctrine'

export interface ExtractedClaim {
  kind: ClaimKind
  claim: string
  passage: string
  query: string
  figure: string | null
}

const CLAIM_KINDS = new Set<ClaimKind>(['figure', 'text', 'date', 'attribution', 'doctrine'])

export function parseClaims(text: string): ExtractedClaim[] {
  const v = findJson(text, 'claims') as { claims?: unknown[] } | null
  if (!v) return []
  return (v.claims ?? [])
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map(c => ({
      kind: CLAIM_KINDS.has(c.kind as ClaimKind) ? (c.kind as ClaimKind) : ('doctrine' as const),
      claim: String(c.claim ?? '').trim(),
      passage: String(c.passage ?? '').trim(),
      query: String(c.query ?? c.claim ?? '').trim(),
      figure: c.figure ? String(c.figure) : null,
    }))
    .filter(c => c.claim && c.passage)
}

export type Verdict = 'supported' | 'contradicted' | 'unverifiable'

export interface JudgeResult {
  claim: string
  passage: string
  verdict: Verdict
  chunk_id: string | null
  excerpt: string | null
  note: string
}

export interface PassageRef {
  chunk_id: string
  chunk_table: 'rag_corpus' | 'scribe_source_chunks'
  content: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  text_type: string
  mode: 'quote' | 'paraphrase'
}

export interface VerifiedResult extends JudgeResult {
  evidence: (Omit<PassageRef, 'content'> & { excerpt: string })[]
  downgraded: boolean
}

export function parseJudgeResults(text: string): JudgeResult[] {
  const v = findJson(text, 'results') as { results?: unknown[] } | null
  if (!v) return []
  return (v.results ?? [])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map(r => ({
      claim: String(r.claim ?? '').trim(),
      passage: String(r.passage ?? '').trim(),
      verdict: (['supported', 'contradicted', 'unverifiable'] as const).includes(r.verdict as Verdict)
        ? (r.verdict as Verdict)
        : ('unverifiable' as const),
      chunk_id: r.chunk_id ? String(r.chunk_id) : null,
      excerpt: r.excerpt ? String(r.excerpt) : null,
      note: String(r.note ?? '').trim(),
    }))
    .filter(r => r.claim)
}

// A supported or contradicted verdict stands only when its excerpt is really
// in the chunk it cites, by the same normaliser the quotation check uses.
// Anything else is downgraded to unverifiable and says why. This is the line
// between "the corpus contradicts him" and "the model remembers otherwise".
export function verifyJudgeResults(results: JudgeResult[], passages: PassageRef[]): VerifiedResult[] {
  const byId = new Map(passages.map(p => [p.chunk_id, p]))
  return results.map(r => {
    if (r.verdict === 'unverifiable') return { ...r, chunk_id: null, excerpt: null, evidence: [], downgraded: false }
    const p = r.chunk_id ? byId.get(r.chunk_id) : undefined
    if (!p) {
      return {
        ...r,
        verdict: 'unverifiable',
        chunk_id: null,
        excerpt: null,
        evidence: [],
        downgraded: true,
        note: `Downgraded: the verdict cited a passage that was not among those retrieved. ${r.note}`.trim(),
      }
    }
    if (!r.excerpt || !quoteMatchesChunk(r.excerpt, p.content)) {
      return {
        ...r,
        verdict: 'unverifiable',
        chunk_id: null,
        excerpt: null,
        evidence: [],
        downgraded: true,
        note: `Downgraded: the excerpt given is not in the cited passage (${p.author}, ${p.work}). ${r.note}`.trim(),
      }
    }
    const { content: _content, ...ref } = p
    void _content
    return { ...r, evidence: [{ ...ref, excerpt: r.excerpt }], downgraded: false }
  })
}

// ── Chat commands ─────────────────────────────────────────────────────────

export type CommandName = 'rewrite' | 'gaps' | 'factcheck' | 'summarize'

export interface ParsedCommand {
  name: CommandName
  // rewrite: null, 'next', or a heading; gaps and factcheck: 'book' or null.
  arg: string | null
}

const COMMAND_RE = /^\/(rewrite|gaps|factcheck|summarize|summarise)\b\s*([\s\S]*)$/i

export function parseCommand(input: string): ParsedCommand | null {
  const m = input.trim().match(COMMAND_RE)
  if (!m) return null
  const name = (m[1].toLowerCase() === 'summarise' ? 'summarize' : m[1].toLowerCase()) as CommandName
  const arg = m[2].trim() || null
  return { name, arg }
}

// The marker line that heads a command turn's stored content, so the
// conversation renders it as the command Kyle typed rather than the prompt
// it expanded to. Inert text for the model.
export function commandMarker(cmd: ParsedCommand): string {
  return `<command name="${cmd.name}"${cmd.arg ? ` arg="${cmd.arg.replace(/[<>"]/g, '')}"` : ''}/>`
}

export function describeCommandTurn(content: string): string | null {
  const m = content.match(/^<command name="(\w+)"(?: arg="([^"]*)")?\s*\/>/)
  if (!m) return null
  return `/${m[1]}${m[2] ? ` ${m[2]}` : ''}`
}

// The turn text a chat command expands to. `lastStop` is the paragraph a
// previous rewrite stopped at, for "/rewrite next".
export function commandPrompt(cmd: ParsedCommand, ctx: { inBook: boolean; lastStop?: string | null }): string | null {
  switch (cmd.name) {
    case 'rewrite': {
      const scope =
        cmd.arg?.toLowerCase() === 'next'
          ? ctx.lastStop
            ? `continue from the paragraph beginning: "${ctx.lastStop}"; everything before it is done`
            : null
          : cmd.arg
      return `${commandMarker(cmd)}\n${rewritePrompt(scope)}`
    }
    case 'gaps':
      return `${commandMarker(cmd)}\n${ctx.inBook ? GAPS_PROMPT : GAPS_PROMPT_STANDALONE}`
    default:
      // factcheck and summarize are not chat turns; the client routes them.
      return null
  }
}

// Where the last rewrite said it stopped: the quoted opening words after
// "stopped at", if the model followed the instruction.
export function rewriteStopPoint(commentary: string): string | null {
  const m = commentary.match(/stopp?(?:ed|ing)\s+(?:at|before|after)[^"“]{0,80}["“]([^"”]{8,160})["”]/i)
  return m ? m[1].trim() : null
}

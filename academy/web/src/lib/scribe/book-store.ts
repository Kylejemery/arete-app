// Scribe book mode, the server half: the rows, the book's own retrieval
// index, the summariser, the thread fold, the fact check, and the book level
// gap pass. Everything here runs behind requireAdmin() with the service role
// client. Nothing here writes to rag_corpus; the corpus is read through the
// same RPC the chat has always used (searchCorpus in chat.ts).
//
// The pure half (splitting, chunk planning, budgets, windowing, parsers) is
// book.ts. Design: docs/scribe/BOOK_DRAFT_DESIGN.md.

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { embedChunk } from '@/lib/corpus/ingest'
import { extractJson, getClient, runStage } from './anthropic'
import { searchCorpus, QUOTABLE_TYPES, type BookTurnContext } from './chat'
import {
  BOOK_SUMMARY_SYSTEM,
  CHAPTER_SUMMARY_SYSTEM,
  FACT_EXTRACT_SYSTEM,
  FACT_JUDGE_SYSTEM,
  GAPS_BOOK_PROMPT,
  GAPS_BOOK_SYSTEM,
  SHAPE_SYSTEM,
  THREAD_SUMMARY_SYSTEM,
  threadSummaryNote,
} from './book-prompts'
import {
  assembleShape,
  buildBookBrief,
  buildOutline,
  chunkDraft,
  countWords,
  hashText,
  numberParagraphs,
  parseClaims,
  parseFindings,
  parseJudgeResults,
  parseShape,
  planChunks,
  renderNumberedParagraphs,
  truncateToTokens,
  verifyJudgeResults,
  windowThread,
  RECENT_TURNS_TOKENS,
  THREAD_SUMMARY_TOKENS,
  type BookArgument,
  type ChapterArgument,
  type ChapterDraft,
  type ExtractedClaim,
  type HistoryMessage,
  type OutlineChapter,
  type ParsedFinding,
  type PassageRef,
  type ShapeProposal,
  type ThreadMessage,
  type VerifiedResult,
} from './book-draft'

type Admin = SupabaseClient

export interface BookRow {
  id: string
  title: string
  status: 'drafting' | 'revising' | 'settled' | 'archived'
  summary: string | null
  summary_updated_at: string | null
  argument: BookArgument | null
  created_at: string
  updated_at: string
}

export interface ChapterRow {
  id: string
  book_id: string
  entry_id: string
  position: number
  title: string
  status: 'raw' | 'working' | 'settled' | 'archived'
  summary: string | null
  summary_by_hand: boolean
  argument: ChapterArgument | null
  word_count: number
  indexed_hash: string | null
  created_at: string
  updated_at: string
}

export interface FindingRow {
  id: string
  entry_id: string | null
  book_id: string | null
  chapter_id: string | null
  kind: 'gap' | 'cross_gap' | 'fact'
  status: 'open' | 'fixed' | 'dismissed' | 'superseded'
  passage: string
  note: string
  verdict: 'supported' | 'contradicted' | 'unverifiable' | null
  claim: string | null
  claim_kind: string | null
  evidence: unknown[]
  message_id: string | null
  created_at: string
  resolved_at: string | null
}

const CHAPTER_COLUMNS =
  'id, book_id, entry_id, position, title, status, summary, summary_by_hand, argument, word_count, indexed_hash, created_at, updated_at'
const FINDING_COLUMNS =
  'id, entry_id, book_id, chapter_id, kind, status, passage, note, verdict, claim, claim_kind, evidence, message_id, created_at, resolved_at'

// A chapter's text handed to read_chapter is capped here.
const READ_CHAPTER_WORDS = 3000
const BOOK_SEARCH_K = 8
// A chapter is re-summarised when its word level change since the last
// summary is at least this share, or when it has no summary yet.
const RESUMMARIZE_SHARE = 0.05
// Fact check retrieval per claim.
const FACT_CORPUS_K = 8
const FACT_PAPER_K = 4
const FACT_SIMILARITY_FLOOR = 0.25
const FACT_CLAIMS_PER_JUDGE = 6
// The book gap pass.
const GAPS_MODEL = 'claude-opus-5-5'
const GAPS_MAX_ROUNDS = 8

// ── Reads ─────────────────────────────────────────────────────────────────

export async function listBooks(admin: Admin): Promise<(BookRow & { chapter_count: number; word_count: number })[]> {
  const { data: books, error } = await admin
    .from('scribe_books')
    .select('*')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  const { data: chapters } = await admin
    .from('scribe_chapters')
    .select('book_id, word_count, status')
  const counts = new Map<string, { n: number; words: number }>()
  for (const c of (chapters ?? []) as { book_id: string; word_count: number; status: string }[]) {
    if (c.status === 'archived') continue
    const cur = counts.get(c.book_id) ?? { n: 0, words: 0 }
    cur.n++
    cur.words += c.word_count
    counts.set(c.book_id, cur)
  }
  return ((books ?? []) as BookRow[]).map(b => ({
    ...b,
    chapter_count: counts.get(b.id)?.n ?? 0,
    word_count: counts.get(b.id)?.words ?? 0,
  }))
}

export async function loadBook(admin: Admin, bookId: string): Promise<{ book: BookRow; chapters: ChapterRow[] } | null> {
  const [bookRes, chaptersRes] = await Promise.all([
    admin.from('scribe_books').select('*').eq('id', bookId).maybeSingle(),
    admin.from('scribe_chapters').select(CHAPTER_COLUMNS).eq('book_id', bookId).neq('status', 'archived').order('position'),
  ])
  if (bookRes.error) throw new Error(bookRes.error.message)
  if (!bookRes.data) return null
  if (chaptersRes.error) throw new Error(chaptersRes.error.message)
  return { book: bookRes.data as BookRow, chapters: (chaptersRes.data ?? []) as ChapterRow[] }
}

export async function chapterForEntry(
  admin: Admin,
  entryId: string
): Promise<{ chapter: ChapterRow; book: BookRow; chapters: ChapterRow[] } | null> {
  const { data: chapter, error } = await admin
    .from('scribe_chapters')
    .select(CHAPTER_COLUMNS)
    .eq('entry_id', entryId)
    .maybeSingle()
  if (error) {
    // The migration has not been applied yet: book mode is simply off.
    if (/scribe_chapters/.test(error.message)) return null
    throw new Error(error.message)
  }
  if (!chapter) return null
  const loaded = await loadBook(admin, (chapter as ChapterRow).book_id)
  if (!loaded) return null
  return { chapter: chapter as ChapterRow, book: loaded.book, chapters: loaded.chapters }
}

export async function listFindings(admin: Admin, where: { entryId?: string; bookId?: string }): Promise<FindingRow[]> {
  let q = admin.from('scribe_findings').select(FINDING_COLUMNS).order('created_at', { ascending: false })
  if (where.entryId) q = q.eq('entry_id', where.entryId)
  else if (where.bookId) q = q.eq('book_id', where.bookId)
  else return []
  const { data, error } = await q.limit(500)
  if (error) {
    if (/scribe_findings/.test(error.message)) return []
    throw new Error(error.message)
  }
  return (data ?? []) as FindingRow[]
}

// The working draft of an entry: the newest message carrying draft_text, or,
// for rows older than that column, the newest content with a <draft>.
export async function workingDraftForEntry(admin: Admin, entryId: string): Promise<string | null> {
  const { data: withDraft } = await admin
    .from('scribe_messages')
    .select('draft_text, created_at')
    .eq('entry_id', entryId)
    .not('draft_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (withDraft?.draft_text) return withDraft.draft_text as string
  const { data: older } = await admin
    .from('scribe_messages')
    .select('content')
    .eq('entry_id', entryId)
    .like('content', '%<draft>%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const m = (older?.content as string | undefined)?.match(/<draft>([\s\S]*?)<\/draft>/)
  return m ? m[1].trim() : null
}

// ── Books and chapters ────────────────────────────────────────────────────

export async function createBook(admin: Admin, title: string): Promise<BookRow> {
  const { data, error } = await admin.from('scribe_books').insert({ title }).select('*').single()
  if (error) throw new Error(error.message)
  return data as BookRow
}

async function touchBook(admin: Admin, bookId: string) {
  await admin.from('scribe_books').update({ updated_at: new Date().toISOString() }).eq('id', bookId)
}

// One chapter = one entry. The chapter text is the entry's raw_text (verbatim,
// never altered) and the opening user message's draft_text, so provenance
// counts every sentence as Kyle's and the changes view can diff back to it.
export async function createChapter(
  admin: Admin,
  bookId: string,
  draft: ChapterDraft,
  position: number
): Promise<ChapterRow> {
  const { data: entry, error: entryError } = await admin
    .from('scribe_entries')
    .insert({ title: draft.title, raw_text: draft.text })
    .select('id')
    .single()
  if (entryError) throw new Error(entryError.message)
  const { error: msgError } = await admin.from('scribe_messages').insert({
    entry_id: entry.id,
    role: 'user',
    content: `<chapter-import/>\nHere is my first draft of the chapter "${draft.title}", ${draft.words.toLocaleString()} words, typed in as it stands. The working draft below is that text. Do not change it until I ask.`,
    draft_text: draft.text,
  })
  if (msgError) throw new Error(msgError.message)
  const { data: chapter, error } = await admin
    .from('scribe_chapters')
    .insert({
      book_id: bookId,
      entry_id: entry.id,
      position,
      title: draft.title,
      status: 'raw',
      word_count: draft.words,
    })
    .select(CHAPTER_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  await touchBook(admin, bookId)
  return chapter as ChapterRow
}

export async function nextPosition(admin: Admin, bookId: string): Promise<number> {
  const { data } = await admin
    .from('scribe_chapters')
    .select('position')
    .eq('book_id', bookId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  return ((data?.position as number | undefined) ?? 0) + 1
}

// Reorder: positions are unique per book, deferrable within a transaction,
// but PostgREST has no transaction, so move through a high temporary range.
export async function reorderChapters(admin: Admin, bookId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin.from('scribe_chapters').update({ position: 10_000 + i }).eq('id', orderedIds[i]).eq('book_id', bookId)
    if (error) throw new Error(error.message)
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin.from('scribe_chapters').update({ position: i + 1, updated_at: new Date().toISOString() }).eq('id', orderedIds[i]).eq('book_id', bookId)
    if (error) throw new Error(error.message)
  }
  await touchBook(admin, bookId)
}

// ── Shaping a stream of consciousness ─────────────────────────────────────

// The whole document goes to the model in one call as numbered paragraphs.
// Above this many words the input no longer fits comfortably in one turn
// and the paste should be split by hand first.
const SHAPE_MAX_WORDS = 120_000

export async function proposeShape(text: string): Promise<{ proposal: ShapeProposal; chapters: ChapterDraft[]; paragraphs: number }> {
  const paras = numberParagraphs(text)
  const words = paras.reduce((n, p) => n + p.words, 0)
  if (!paras.length) throw new Error('Nothing to shape')
  if (words > SHAPE_MAX_WORDS) {
    throw new Error(`That is ${words.toLocaleString()} words; shaping reads the whole text at once and stops at ${SHAPE_MAX_WORDS.toLocaleString()}. Split it by hand first.`)
  }
  const { text: reply } = await runStage('shape', SHAPE_SYSTEM, renderNumberedParagraphs(paras))
  const proposal = parseShape(reply)
  if (!proposal || !proposal.parts.length) throw new Error('Scribe returned no shape; try again or split by headings.')
  return { proposal, chapters: assembleShape(paras, proposal), paragraphs: paras.length }
}

// ── Embeddings ────────────────────────────────────────────────────────────

// Same model and space as embedChunk, in one call for a batch. A chapter is
// ten to twenty chunks; sending them together keeps a reindex to one round
// trip instead of twenty.
async function embedMany(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
    })
    if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as { data: { index: number; embedding: number[] }[] }
    const sorted = [...data.data].sort((a, b) => a.index - b.index)
    for (const d of sorted) out.push(d.embedding)
  }
  return out
}

// ── The book index ────────────────────────────────────────────────────────

// Chunk, hash, embed only what is new, and record which draft the index now
// describes. Returns how much work it did, for the logs and the smoke.
export async function reindexChapter(
  admin: Admin,
  chapter: ChapterRow,
  draft: string
): Promise<{ embedded: number; reused: number; kept: number; removed: number; hash: string }> {
  const next = chunkDraft(draft)
  const { data: stored, error } = await admin
    .from('scribe_book_chunks')
    .select('chunk_index, content_hash, embedding')
    .eq('chapter_id', chapter.id)
  if (error) throw new Error(error.message)
  const rows = (stored ?? []) as { chunk_index: number; content_hash: string; embedding: unknown }[]
  const plan = planChunks(next, rows)

  const embeddings = await embedMany(plan.embed.map(c => c.content))
  const upserts: Record<string, unknown>[] = plan.embed.map((c, i) => ({
    book_id: chapter.book_id,
    chapter_id: chapter.id,
    chunk_index: c.chunk_index,
    content: c.content,
    content_hash: c.content_hash,
    embedding: embeddings[i],
  }))
  const byIndex = new Map(rows.map(r => [r.chunk_index, r]))
  for (const r of plan.reuse) {
    const from = byIndex.get(r.from_index)
    const c = next[r.chunk_index]
    if (!from || !c) continue
    upserts.push({
      book_id: chapter.book_id,
      chapter_id: chapter.id,
      chunk_index: c.chunk_index,
      content: c.content,
      content_hash: c.content_hash,
      embedding: from.embedding,
    })
  }
  if (upserts.length) {
    const { error: upErr } = await admin
      .from('scribe_book_chunks')
      .upsert(upserts, { onConflict: 'chapter_id,chunk_index' })
    if (upErr) throw new Error(upErr.message)
  }
  if (plan.remove.length) {
    const { error: delErr } = await admin
      .from('scribe_book_chunks')
      .delete()
      .eq('chapter_id', chapter.id)
      .in('chunk_index', plan.remove)
    if (delErr) throw new Error(delErr.message)
  }
  const hash = hashText(draft)
  const words = countWords(draft)
  const { error: chErr } = await admin
    .from('scribe_chapters')
    .update({ indexed_hash: hash, word_count: words, updated_at: new Date().toISOString() })
    .eq('id', chapter.id)
  if (chErr) throw new Error(chErr.message)
  await touchBook(admin, chapter.book_id)
  return { embedded: plan.embed.length, reused: plan.reuse.length, kept: plan.keep.length, removed: plan.remove.length, hash }
}

// ── Summaries ─────────────────────────────────────────────────────────────

export async function summarizeChapter(admin: Admin, chapter: ChapterRow, draft: string): Promise<{ summary: string; argument: ChapterArgument }> {
  const user = `Chapter ${chapter.position}: ${chapter.title}\n\n${draft}`
  const { text } = await runStage('summarize', CHAPTER_SUMMARY_SYSTEM, user)
  const parsed = extractJson<{ summary?: string; argument?: ChapterArgument }>(text)
  const summary = String(parsed.summary ?? '').trim()
  const argument = parsed.argument ?? {}
  if (!chapter.summary_by_hand) {
    const { error } = await admin
      .from('scribe_chapters')
      .update({ summary, argument, updated_at: new Date().toISOString() })
      .eq('id', chapter.id)
    if (error) throw new Error(error.message)
  }
  return { summary, argument }
}

export async function summarizeBook(admin: Admin, bookId: string): Promise<{ summary: string; argument: BookArgument } | null> {
  const loaded = await loadBook(admin, bookId)
  if (!loaded) return null
  const { book, chapters } = loaded
  const withSummaries = chapters.filter(c => c.summary)
  if (!withSummaries.length) return null
  const user = [
    `Book: ${book.title}`,
    ...chapters.map(c => {
      const a = c.argument ?? {}
      const lines = [`${c.position}. ${c.title} (${c.status}, ${c.word_count} words)`]
      if (c.summary) lines.push(`Summary: ${c.summary}`)
      if (a.thesis) lines.push(`Thesis: ${a.thesis}`)
      if (a.claims?.length) lines.push(`Claims: ${a.claims.join(' | ')}`)
      if (a.depends_on?.length) lines.push(`Depends on: ${a.depends_on.join(' | ')}`)
      if (a.open_questions?.length) lines.push(`Open questions: ${a.open_questions.join(' | ')}`)
      return lines.join('\n')
    }),
  ].join('\n\n')
  const { text } = await runStage('summarize', BOOK_SUMMARY_SYSTEM, user)
  const parsed = extractJson<{ summary?: string; argument?: BookArgument }>(text)
  const summary = String(parsed.summary ?? '').trim()
  const argument = parsed.argument ?? {}
  const { error } = await admin
    .from('scribe_books')
    .update({ summary, argument, summary_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', bookId)
  if (error) throw new Error(error.message)
  return { summary, argument }
}

// Bring stale chapters up to date, a few per call so a long book can be
// refreshed across several requests from the book view without meeting the
// route's time limit. When nothing is left, the book summary is rebuilt.
export async function refreshBook(
  admin: Admin,
  bookId: string,
  limit = 3
): Promise<{ refreshed: string[]; remaining: number; bookSummarized: boolean }> {
  const loaded = await loadBook(admin, bookId)
  if (!loaded) throw new Error('Book not found')
  const stale: { chapter: ChapterRow; draft: string; needsIndex: boolean; needsSummary: boolean }[] = []
  for (const chapter of loaded.chapters) {
    const draft = (await workingDraftForEntry(admin, chapter.entry_id)) ?? ''
    const hash = hashText(draft)
    const needsIndex = chapter.indexed_hash !== hash
    const needsSummary = !chapter.summary_by_hand && (!chapter.summary || needsIndex)
    if (needsIndex || needsSummary) stale.push({ chapter, draft, needsIndex, needsSummary })
  }
  const refreshed: string[] = []
  for (const s of stale.slice(0, limit)) {
    if (s.needsIndex) await reindexChapter(admin, s.chapter, s.draft)
    if (s.needsSummary && s.draft.trim()) await summarizeChapter(admin, s.chapter, s.draft)
    refreshed.push(s.chapter.id)
  }
  const remaining = Math.max(0, stale.length - refreshed.length)
  let bookSummarized = false
  if (remaining === 0) {
    const r = await summarizeBook(admin, bookId)
    bookSummarized = !!r
  }
  return { refreshed, remaining, bookSummarized }
}

// After a turn changed a chapter's draft: reindex always (cheap), resummarise
// when the change is more than a few sentences or there is no summary yet.
export async function afterChapterDraftChanged(
  admin: Admin,
  chapter: ChapterRow,
  previous: string | null,
  next: string
): Promise<{ reindexed: boolean; summarized: boolean }> {
  await reindexChapter(admin, chapter, next)
  const prevWords = countWords(previous ?? '')
  const nextWords = countWords(next)
  const changed = Math.abs(nextWords - prevWords) / Math.max(1, prevWords)
  const needsSummary = !chapter.summary || changed >= RESUMMARIZE_SHARE
  if (chapter.status === 'raw' && previous && previous !== next) {
    await admin.from('scribe_chapters').update({ status: 'working' }).eq('id', chapter.id)
  }
  if (!needsSummary || chapter.summary_by_hand) return { reindexed: true, summarized: false }
  await summarizeChapter(admin, chapter, next)
  return { reindexed: true, summarized: true }
}

// ── The book tools and the brief ──────────────────────────────────────────

function toOutline(chapters: ChapterRow[]): OutlineChapter[] {
  return chapters.map(c => ({
    id: c.id,
    position: c.position,
    title: c.title,
    status: c.status,
    word_count: c.word_count,
    summary: c.summary,
    argument: c.argument,
  }))
}

export function bookBrief(book: BookRow, chapters: ChapterRow[], currentChapterId: string | null): string {
  return buildBookBrief({
    title: book.title,
    summary: book.summary,
    argument: book.argument,
    chapters: toOutline(chapters),
    currentChapterId,
  })
}

async function searchBookChunks(
  admin: Admin,
  bookId: string,
  chapters: ChapterRow[],
  query: string,
  excludeChapterId: string | null
): Promise<string> {
  const embedding = await embedChunk(query)
  const { data, error } = await admin.rpc('match_scribe_book_chunks', {
    query_embedding: embedding,
    p_book_id: bookId,
    match_count: BOOK_SEARCH_K,
    exclude_chapter_id: excludeChapterId,
  })
  if (error) throw new Error(`match_scribe_book_chunks: ${error.message}`)
  const hits = (data ?? []) as { chapter_id: string; chunk_index: number; content: string; similarity: number }[]
  const byId = new Map(chapters.map(c => [c.id, c]))
  const shown = hits.filter(h => h.similarity >= 0.2)
  if (!shown.length) return 'No passage in the book matched this query. Say the book does not take this up, rather than guessing that it does.'
  return shown
    .map(h => {
      const c = byId.get(h.chapter_id)
      const where = c ? `chapter ${c.position}, "${c.title}"` : 'an archived chapter'
      return `[BOOK: ${where}, passage ${h.chunk_index + 1}] (similarity ${h.similarity.toFixed(2)})\n${h.content}`
    })
    .join('\n\n---\n\n')
}

async function readChapterText(admin: Admin, chapters: ChapterRow[], position: number, what: 'summary' | 'text'): Promise<string> {
  const c = chapters.find(ch => ch.position === position)
  if (!c) return `There is no chapter ${position} in the outline.`
  if (what === 'summary') {
    const a = c.argument ?? {}
    const lines = [`Chapter ${c.position}: ${c.title} (${c.status}, ${c.word_count.toLocaleString()} words)`]
    lines.push(c.summary ? `Summary: ${c.summary}` : 'Summary: not written yet. Ask for the text if you need it.')
    if (a.thesis) lines.push(`Thesis: ${a.thesis}`)
    if (a.claims?.length) lines.push(`Claims: ${a.claims.join(' | ')}`)
    if (a.depends_on?.length) lines.push(`Depends on: ${a.depends_on.join(' | ')}`)
    if (a.open_questions?.length) lines.push(`Open questions: ${a.open_questions.join(' | ')}`)
    return lines.join('\n')
  }
  const draft = await workingDraftForEntry(admin, c.entry_id)
  if (!draft) return `Chapter ${c.position}, "${c.title}", has no text yet.`
  const words = draft.split(/\s+/)
  if (words.length <= READ_CHAPTER_WORDS) return `Chapter ${c.position}: ${c.title}\n\n${draft}`
  return `Chapter ${c.position}: ${c.title}\n\n${words.slice(0, READ_CHAPTER_WORDS).join(' ')}\n\n[cut here at ${READ_CHAPTER_WORDS.toLocaleString()} of ${words.length.toLocaleString()} words; use search_book to find a particular passage further on]`
}

// Everything a chat turn needs when its entry is a chapter, or null when the
// entry stands alone (or the migration is not applied yet).
export async function bookTurnContext(
  admin: Admin,
  entryId: string
): Promise<{ context: BookTurnContext; chapter: ChapterRow; book: BookRow; chapters: ChapterRow[] } | null> {
  const found = await chapterForEntry(admin, entryId)
  if (!found) return null
  const { chapter, book, chapters } = found
  return {
    chapter,
    book,
    chapters,
    context: {
      brief: bookBrief(book, chapters, chapter.id),
      searchBook: (query, scope) =>
        searchBookChunks(admin, book.id, chapters, query, scope === 'all' ? null : chapter.id),
      readChapter: (position, what) => readChapterText(admin, chapters, position, what),
    },
  }
}

// ── Thread windowing and the fold ─────────────────────────────────────────

export interface EntryWindowState {
  thread_summary: string | null
  thread_summary_through: string | null
}

// The history to send for this turn. When the verbatim turns outgrow the
// budget, the oldest are folded into the entry's running summary first.
export async function historyForTurn(
  admin: Admin,
  entryId: string,
  entry: EntryWindowState,
  thread: ThreadMessage[]
): Promise<{ history: HistoryMessage[]; folded: number; summaryTokens: number }> {
  const win = windowThread(thread, {
    recentBudgetTokens: RECENT_TURNS_TOKENS,
    summaryThroughId: entry.thread_summary_through,
  })
  let summary = entry.thread_summary
  let folded = 0
  if (win.fold.length) {
    const turns = win.fold
      .map(m => `${m.role === 'user' ? 'KYLE' : 'SCRIBE'}: ${truncateToTokens(m.content.replace(/<draft>[\s\S]*?<\/draft>/g, '[draft omitted]'), 1500)}`)
      .join('\n\n')
    const user = `SUMMARY SO FAR:\n${summary ?? '(none yet)'}\n\nTURNS TO FOLD IN:\n${turns}`
    try {
      const { text } = await runStage('summarize', THREAD_SUMMARY_SYSTEM, user)
      summary = truncateToTokens(text.trim(), THREAD_SUMMARY_TOKENS)
      folded = win.fold.length
      const { error } = await admin
        .from('scribe_entries')
        .update({ thread_summary: summary, thread_summary_through: win.foldThroughId })
        .eq('id', entryId)
      if (error) console.warn('[scribe/book] fold not saved:', error.message)
    } catch (e) {
      // A failed fold costs one turn of budget, not the turn: send the
      // oldest turns verbatim and try again next time.
      console.warn('[scribe/book] fold failed:', e instanceof Error ? e.message : e)
      const history: HistoryMessage[] = []
      if (win.opening) history.push(win.opening)
      for (const m of win.fold) history.push({ role: m.role, content: m.content })
      history.push(...win.recent)
      return { history, folded: 0, summaryTokens: 0 }
    }
  }
  const history: HistoryMessage[] = []
  if (win.opening) history.push(win.opening)
  if (summary) history.push({ role: 'user', content: threadSummaryNote(summary) })
  history.push(...win.recent)
  return { history, folded, summaryTokens: summary ? Math.ceil(summary.length / 4) : 0 }
}

// ── Findings ──────────────────────────────────────────────────────────────

export interface FindingTarget {
  entryId: string | null
  bookId: string | null
  chapterId: string | null
  messageId?: string | null
}

// A fresh run of a job replaces that job's open findings on the same target:
// the old ones are marked superseded, never deleted.
async function supersedeOpen(admin: Admin, target: FindingTarget, kinds: string[]) {
  let q = admin
    .from('scribe_findings')
    .update({ status: 'superseded', resolved_at: new Date().toISOString() })
    .eq('status', 'open')
    .in('kind', kinds)
  if (target.entryId) q = q.eq('entry_id', target.entryId)
  else if (target.bookId) q = q.eq('book_id', target.bookId).is('entry_id', null)
  const { error } = await q
  if (error && !/scribe_findings/.test(error.message)) throw new Error(error.message)
}

export async function storeGapFindings(
  admin: Admin,
  target: FindingTarget,
  findings: ParsedFinding[],
  chapters: ChapterRow[] = []
): Promise<FindingRow[]> {
  await supersedeOpen(admin, target, ['gap', 'cross_gap'])
  if (!findings.length) return []
  const byPosition = new Map(chapters.map(c => [c.position, c]))
  const rows = findings.map(f => {
    const other = f.chapter_position !== null ? byPosition.get(f.chapter_position) : undefined
    return {
      entry_id: target.entryId ?? other?.entry_id ?? null,
      book_id: target.bookId,
      chapter_id: target.chapterId ?? other?.id ?? null,
      kind: f.kind,
      passage: f.passage || '(no passage quoted)',
      note: other && target.entryId ? `${f.note} (see chapter ${other.position}, "${other.title}")` : f.note,
      message_id: target.messageId ?? null,
    }
  })
  const { data, error } = await admin.from('scribe_findings').insert(rows).select(FINDING_COLUMNS)
  if (error) throw new Error(error.message)
  return (data ?? []) as FindingRow[]
}

export async function setFindingStatus(admin: Admin, id: string, status: 'open' | 'fixed' | 'dismissed'): Promise<FindingRow> {
  const { data, error } = await admin
    .from('scribe_findings')
    .update({ status, resolved_at: status === 'open' ? null : new Date().toISOString() })
    .eq('id', id)
    .select(FINDING_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return data as FindingRow
}

// ── The Stoic fact check ──────────────────────────────────────────────────

async function retrieveForClaim(admin: Admin, claim: ExtractedClaim, sourceMeta: Map<string, { key: string; title: string }>): Promise<PassageRef[]> {
  const queries = [claim.query]
  if (claim.figure && !claim.query.toLowerCase().includes(claim.figure.toLowerCase())) {
    queries.push(`${claim.figure}: ${claim.claim}`)
  }
  const out = new Map<string, PassageRef>()
  for (const q of queries) {
    const { hits } = await searchCorpus(q, FACT_CORPUS_K)
    for (const h of hits) {
      if (h.similarity < FACT_SIMILARITY_FLOOR || out.has(h.id)) continue
      out.set(h.id, {
        chunk_id: h.id,
        chunk_table: 'rag_corpus',
        content: h.chunk_text,
        author: h.author,
        work: h.work,
        section_label: h.section_label,
        translator: h.translator,
        text_type: h.text_type,
        mode: QUOTABLE_TYPES.has(h.text_type) ? 'quote' : 'paraphrase',
      })
    }
  }
  // The private paper chunks (Kyle's own library), quotable by construction:
  // only sources marked quotable have chunks at all.
  try {
    const embedding = await embedChunk(claim.query)
    const { data } = await admin.rpc('match_scribe_source_chunks', { query_embedding: embedding, match_count: FACT_PAPER_K })
    for (const h of (data ?? []) as { id: string; source_id: string; content: string; page_hint: number | null; similarity: number }[]) {
      if (h.similarity < FACT_SIMILARITY_FLOOR || out.has(h.id)) continue
      const meta = sourceMeta.get(h.source_id)
      if (!meta) continue
      out.set(h.id, {
        chunk_id: h.id,
        chunk_table: 'scribe_source_chunks',
        content: h.content,
        author: meta.key,
        work: meta.title,
        section_label: h.page_hint ? `p. ${h.page_hint}` : null,
        translator: null,
        text_type: 'paper',
        mode: 'quote',
      })
    }
  } catch (e) {
    console.warn('[scribe/factcheck] paper search failed:', e instanceof Error ? e.message : e)
  }
  return [...out.values()]
}

function passageLabel(p: PassageRef): string {
  const tag = p.chunk_table === 'scribe_source_chunks' ? 'PAPER' : p.mode === 'quote' ? 'QUOTE' : 'PARAPHRASE'
  const loc = [p.work, p.section_label].filter(Boolean).join(' ')
  const trans = p.translator ? `, trans. ${p.translator}` : ''
  return `[chunk_id: ${p.chunk_id}] [${tag}] ${p.author}, ${loc}${trans}`
}

export interface FactCheckReport {
  claims: number
  results: VerifiedResult[]
  findings: FindingRow[]
  // The extraction found nothing to check.
  nothingToCheck: boolean
}

export async function runFactCheck(
  admin: Admin,
  target: FindingTarget,
  draft: string,
  title: string | null
): Promise<FactCheckReport> {
  // 1. Extract.
  const { text: extracted } = await runStage('distill', FACT_EXTRACT_SYSTEM, `${title ? `Chapter: ${title}\n\n` : ''}${draft}`)
  const claims = parseClaims(extracted)
  await supersedeOpen(admin, target, ['fact'])
  if (!claims.length) return { claims: 0, results: [], findings: [], nothingToCheck: true }

  // 2. Retrieve, per claim, corpus and papers.
  const { data: sources } = await admin.from('scribe_sources').select('id, citation_key, title')
  const sourceMeta = new Map(
    ((sources ?? []) as { id: string; citation_key: string; title: string }[]).map(s => [s.id, { key: s.citation_key, title: s.title }])
  )
  const retrieved: PassageRef[][] = []
  for (const c of claims) retrieved.push(await retrieveForClaim(admin, c, sourceMeta))

  // 3. Judge, in batches, against the retrieved passages only; then verify
  //    every citation mechanically.
  const results: VerifiedResult[] = []
  for (let i = 0; i < claims.length; i += FACT_CLAIMS_PER_JUDGE) {
    const batch = claims.slice(i, i + FACT_CLAIMS_PER_JUDGE)
    const passages = retrieved.slice(i, i + FACT_CLAIMS_PER_JUDGE)
    const user = batch
      .map((c, j) => {
        const ps = passages[j]
        const shown = ps.length
          ? ps.map(p => `${passageLabel(p)}\n${p.content}`).join('\n\n')
          : '(no passages were retrieved for this claim; it is unverifiable)'
        return `CLAIM ${i + j + 1} (${c.kind}): ${c.claim}\nPassage in the chapter: "${c.passage}"\nRetrieved passages:\n${shown}`
      })
      .join('\n\n=====\n\n')
    const { text } = await runStage('judge', FACT_JUDGE_SYSTEM, user)
    const judged = parseJudgeResults(text)
    const flat = passages.flat()
    const verified = verifyJudgeResults(judged, flat)
    // Keep the extracted passage and kind with each result, matched by claim
    // text, so the finding points at the right sentence even if the judge
    // retyped the claim.
    for (const v of verified) {
      const src = batch.find(c => c.claim === v.claim) ?? batch.find(c => c.passage === v.passage) ?? null
      results.push({ ...v, passage: src?.passage ?? v.passage, claim: src?.claim ?? v.claim })
    }
  }

  // 4. Store. Every claim is a finding, so the supported ones are visible too.
  const kindByClaim = new Map(claims.map(c => [c.claim, c.kind]))
  const rows = results.map(r => ({
    entry_id: target.entryId,
    book_id: target.bookId,
    chapter_id: target.chapterId,
    kind: 'fact',
    status: 'open',
    passage: r.passage,
    note: r.note,
    verdict: r.verdict,
    claim: r.claim,
    claim_kind: kindByClaim.get(r.claim) ?? null,
    evidence: r.evidence,
    message_id: target.messageId ?? null,
  }))
  const { data, error } = rows.length
    ? await admin.from('scribe_findings').insert(rows).select(FINDING_COLUMNS)
    : { data: [], error: null }
  if (error) throw new Error(error.message)
  return { claims: claims.length, results, findings: (data ?? []) as FindingRow[], nothingToCheck: false }
}

// ── The book level gap pass ───────────────────────────────────────────────

const BOOK_GAPS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_book',
    description: "Semantic search over every chapter's working draft, in 400 word passages, each with its chapter number and title.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'The claim, image or question to look for across the book' } },
      required: ['query'],
    },
  },
  {
    name: 'read_chapter',
    description: "Read one chapter by its outline position: 'summary' (default) for its summary and argument card, 'text' for its working draft, capped at 3,000 words.",
    input_schema: {
      type: 'object',
      properties: {
        position: { type: 'integer', description: 'The chapter number in the outline' },
        what: { type: 'string', enum: ['summary', 'text'] },
      },
      required: ['position'],
    },
  },
]

export async function runBookGaps(
  admin: Admin,
  bookId: string,
  onSearching?: (label: string) => void
): Promise<{ commentary: string; findings: FindingRow[] }> {
  const loaded = await loadBook(admin, bookId)
  if (!loaded) throw new Error('Book not found')
  const { book, chapters } = loaded
  const summaries = chapters
    .map(c => `${c.position}. ${c.title}\n${c.summary ?? '(no summary yet; use read_chapter with "text")'}`)
    .join('\n\n')
  const user = `${GAPS_BOOK_PROMPT}\n\nBOOK: ${book.title}\n${book.summary ? `\nRolling summary:\n${book.summary}\n` : ''}\nOUTLINE\n${buildOutline(toOutline(chapters))}\n\nCHAPTER SUMMARIES\n${summaries}`
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: user }]
  let text = ''
  for (let round = 0; round <= GAPS_MAX_ROUNDS; round++) {
    const last = round === GAPS_MAX_ROUNDS
    const res = await getClient().messages.create({
      model: GAPS_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'high' },
      system: GAPS_BOOK_SYSTEM,
      messages,
      ...(last ? {} : { tools: BOOK_GAPS_TOOLS }),
    })
    text += res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
    if (res.stop_reason !== 'tool_use') break
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const tu of res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')) {
      let content: string
      try {
        if (tu.name === 'search_book') {
          const q = String((tu.input as { query?: unknown }).query ?? '')
          onSearching?.(q)
          content = await searchBookChunks(admin, book.id, chapters, q, null)
        } else {
          const input = tu.input as { position?: unknown; what?: string }
          onSearching?.(`chapter ${String(input.position ?? '?')}`)
          content = await readChapterText(admin, chapters, Number(input.position), input.what === 'text' ? 'text' : 'summary')
        }
      } catch (e) {
        content = `Tool failed: ${e instanceof Error ? e.message : 'unknown error'}. Continue without it.`
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content })
    }
    messages.push({ role: 'assistant', content: res.content })
    messages.push({ role: 'user', content: results })
  }
  const parsed = parseFindings(text).map(f => ({ ...f, kind: 'cross_gap' as const }))
  const findings = await storeGapFindings(admin, { entryId: null, bookId: book.id, chapterId: null }, parsed, chapters)
  return { commentary: text, findings }
}

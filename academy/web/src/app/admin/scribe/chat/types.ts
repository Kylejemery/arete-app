// Shapes the Scribe chat screen exchanges with /api/admin/scribe/entries/*.
// `tells` is optional because rows written before the outside reader grew that
// category have no key for it.

export type Entry = {
  id: string
  title: string | null
  raw_text: string
  // Optional posture: Scribe builds everything around the prose and leaves
  // every paragraph a gap for the writer. Absent on rows written before it.
  gaps_mode?: boolean
  created_at: string
  updated_at: string
}

// One quotation in the draft, checked against the chunks this session
// retrieved. See lib/scribe/quote-check.ts.
export type QuoteFinding = {
  quote: string
  status: 'verified' | 'unverified' | 'not-quotable'
  author?: string
  work?: string
  section_label?: string | null
  chunk_id?: string
}

export type Source = {
  chunk_id: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  mode: 'quote' | 'paraphrase'
  similarity: number
  query: string
}

export type Message = {
  id: string
  role: 'user' | 'scribe'
  content: string
  sources_used: Source[] | null
  // The working draft after this turn (a complete <draft>, or the result of
  // its edits). Null when the turn changed nothing; absent on rows written
  // before edits existed, which carry the draft inside content.
  draft_text?: string | null
  created_at: string
}

export type ReviewFinding = { line: string; why: string }

export type Review = {
  model: string
  not_kyle: ReviewFinding[]
  unearned: ReviewFinding[]
  narrated_over: ReviewFinding[]
  tells?: ReviewFinding[]
  error?: string
}

export type Draft = {
  id: string
  stage: 'middle' | 'full' | 'final'
  draft_text: string
  sources_used: Source[] | null
  review: Review | null
  created_at: string
}

// A base the working draft can be compared against in the changes view.
export type DiffBase = { id: string; label: string; text: string }

// One finding from a review job: a gap in the argument (gap, cross_gap) or a
// checked claim about the Stoics (fact). See lib/scribe/book-store.ts.
export type FindingEvidence = {
  chunk_table: 'rag_corpus' | 'scribe_source_chunks'
  chunk_id: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  text_type: string
  mode: 'quote' | 'paraphrase'
  excerpt: string
}

export type Finding = {
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
  evidence: FindingEvidence[]
  message_id: string | null
  created_at: string
  resolved_at: string | null
}

// The book an entry belongs to, when it is a chapter.
export type BookChapterRef = {
  id: string
  entry_id: string
  position: number
  title: string
  status: string
  word_count: number
}

export type BookInfo = {
  id: string
  title: string
  chapter: BookChapterRef & { summary: string | null }
  chapters: BookChapterRef[]
}

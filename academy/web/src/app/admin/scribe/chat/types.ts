// Shapes the Scribe chat screen exchanges with /api/admin/scribe/entries/*.
// `tells` is optional because rows written before the outside reader grew that
// category have no key for it.

export type Entry = {
  id: string
  title: string | null
  raw_text: string
  created_at: string
  updated_at: string
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

// Shared Scribe types — mirror the columns in 20260715000000_scribe_tables.sql.

export type ScribeFormat = 'article' | 'paper' | 'substack' | 'social'
export type ScribeProjectStatus = 'draft' | 'ready' | 'published' | 'archived'
export type ScribeSourceKind = 'paper' | 'book' | 'web'

export interface ScribeProject {
  id: string
  title: string
  status: ScribeProjectStatus
  format: ScribeFormat
  brief: ScribeBrief | null
  created_at: string
  updated_at: string
}

// Stage A output — shown to the user as an editable brief before drafting.
export interface ScribeBrief {
  thesis: string
  key_claims: string[]
  audience: string
  gaps: string[]
}

export interface ScribeNote {
  id: string
  project_id: string
  content: string
  position: number
  created_at: string
}

export interface ScribeAuthor {
  family: string
  given?: string
}

export interface ScribeSource {
  id: string
  kind: ScribeSourceKind
  title: string
  authors: ScribeAuthor[]
  year: string | null
  venue: string | null
  doi: string | null
  url: string | null
  citation_key: string
  paper_submission_id: string | null
  file_path: string | null
  quotable: boolean
  ingested_at: string | null
  ingest_report: ScribeIngestReport | null
  created_at: string
}

export interface ScribeIngestReport {
  pages_parsed: number
  chunks_created: number
  failed_pages: number[]
}

// One citation in a draft's machine-readable citation map. Every marker in
// the markdown must resolve to a row here; every row must resolve to a real
// chunk id — that invariant is what Stage D verifies.
export interface ScribeCitation {
  marker: string // e.g. '^hadot1995' or 'Meditations 4.3'
  chunk_table: 'rag_corpus' | 'scribe_source_chunks'
  chunk_id: string
  locator: string | null // canonical passage / page hint as the model rendered it
  quote: boolean // true when the draft quotes the chunk verbatim
  quote_text?: string // the complete quoted text (quotes only) — what gets string-matched
}

export type LocatorStatus = 'verified' | 'unverified' | 'mismatch'
export type SupportStatus = 'supported' | 'partial' | 'not'

export interface ScribeCitationVerification {
  marker: string
  chunk_resolves: boolean
  quote_match: boolean | null // null when the citation is not a quote
  locator: LocatorStatus
  support: SupportStatus | null
  note: string | null
}

export interface ScribeDraftVerification {
  checked_at: string
  results: ScribeCitationVerification[]
}

export interface ScribeDraftMeta {
  subject_lines?: string[]
  preview_text?: string
  pull_quotes?: string[]
  posts?: { platform: 'x' | 'linkedin' | 'bluesky'; text: string }[]
}

export interface ScribeDraft {
  id: string
  project_id: string
  version: number
  format: ScribeFormat
  content: string
  citations: ScribeCitation[]
  verification: ScribeDraftVerification | null
  meta: ScribeDraftMeta | null
  model_notes: string | null
  token_usage: Record<string, { input: number; output: number; model: string }> | null
  created_at: string
}

export interface ScribeStyleProfile {
  id: string
  name: string
  exemplar_refs: { title: string; text: string }[]
  guidance: string | null
  updated_at: string
}

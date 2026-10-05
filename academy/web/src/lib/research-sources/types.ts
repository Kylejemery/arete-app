// Shared by the /admin/research page and its API routes. Mirrors the
// research_sources table (supabase/migrations/20260928181334_research_sources.sql).

export const LICENCE_STATUSES = [
  'public_domain',
  'open_licence_confirmed',
  'licensed_copy',
  'quotation_only',
  'unconfirmed',
] as const
export type LicenceStatus = (typeof LICENCE_STATUSES)[number]

export const LICENCE_LABEL: Record<LicenceStatus, string> = {
  public_domain: 'public domain',
  open_licence_confirmed: 'open licence (confirmed)',
  licensed_copy: 'licensed copy',
  quotation_only: 'short quotation only',
  unconfirmed: 'unconfirmed',
}

// Every column except full_text, which no API role can read (migration
// 20261005184546); the database checks quotations with research_source_contains.
export const SOURCE_COLUMNS =
  'id, author, work, volume, translator, edition, edition_year, source_url, how_obtained, licence_status, licence_notes, locator_scheme, sha256, notes, deprecated, created_at'

export type ResearchSource = {
  id: string
  author: string
  work: string
  volume: string | null
  translator: string | null
  edition: string
  edition_year: number
  source_url: string | null
  how_obtained: string
  licence_status: LicenceStatus
  licence_notes: string | null
  locator_scheme: string
  sha256: string
  notes: string | null
  deprecated: boolean
  created_at: string
}

// Vercel caps a function request body at 4.5MB. Larger texts go through
// scripts/research-sources/add.mjs instead.
export const MAX_TEXT_BYTES = 4_000_000

// The same normalisation as scripts/research-sources/add.mjs, so a text
// stored from either route hashes the same.
export function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').normalize('NFC')
}

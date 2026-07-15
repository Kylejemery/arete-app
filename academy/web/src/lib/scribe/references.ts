import { createAdminClient } from '@/lib/supabase-admin'
import type { ScribeAuthor, ScribeCitation } from './types'

// Stage E — reference list generation. Deterministic: built from the
// citation map and source metadata, never written by the model. Classical
// sources are listed separately with the translation credited once;
// modern works render in APA (default) or Chicago.

export type ReferenceStyle = 'apa' | 'chicago'

interface ClassicalRef {
  author: string
  work: string
  translator: string | null
}

interface ModernRef {
  authors: ScribeAuthor[]
  authorFallback?: string // rag_corpus paper_summary rows store a plain string
  year: string | null
  title: string
  venue: string | null
  doi: string | null
  url: string | null
}

function apaAuthors(authors: ScribeAuthor[], fallback?: string): string {
  if (!authors.length) return fallback ?? 'Unknown'
  return authors
    .map(a => `${a.family}${a.given ? `, ${a.given[0]}.` : ''}`)
    .join(', ')
}

function chicagoAuthors(authors: ScribeAuthor[], fallback?: string): string {
  if (!authors.length) return fallback ?? 'Unknown'
  return authors
    .map((a, i) =>
      i === 0 && a.given ? `${a.family}, ${a.given}` : a.given ? `${a.given} ${a.family}` : a.family
    )
    .join(', ')
}

function formatModern(r: ModernRef, style: ReferenceStyle): string {
  const link = r.doi ? ` https://doi.org/${r.doi.replace(/^https?:\/\/doi\.org\//, '')}` : r.url ? ` ${r.url}` : ''
  if (style === 'chicago') {
    return `${chicagoAuthors(r.authors, r.authorFallback)}. ${r.year ? `${r.year}. ` : ''}"${r.title}."${r.venue ? ` *${r.venue}*.` : ''}${link}`
  }
  return `${apaAuthors(r.authors, r.authorFallback)} ${r.year ? `(${r.year}). ` : '(n.d.). '}${r.title}.${r.venue ? ` *${r.venue}*.` : ''}${link}`
}

function formatClassical(r: ClassicalRef): string {
  return `${r.author}. *${r.work}*.${r.translator ? ` Translated by ${r.translator}.` : ''}`
}

// Build the reference section for a draft from its citation map. Classical =
// rag_corpus rows whose text_type is a primary/summary layer; rag_corpus
// paper_summary rows and all scribe_source_chunks are modern works.
export async function buildReferences(
  citations: ScribeCitation[],
  style: ReferenceStyle = 'apa'
): Promise<string> {
  if (citations.length === 0) return ''
  const admin = createAdminClient()

  const ragIds = [...new Set(citations.filter(c => c.chunk_table === 'rag_corpus').map(c => c.chunk_id))]
  const scribeIds = [...new Set(citations.filter(c => c.chunk_table === 'scribe_source_chunks').map(c => c.chunk_id))]

  const classical = new Map<string, ClassicalRef>()
  const modern = new Map<string, ModernRef>()

  if (ragIds.length) {
    const { data, error } = await admin
      .from('rag_corpus')
      .select('id, author, work, translator, text_type, source_url, section_label')
      .in('id', ragIds)
    if (error) throw new Error(`References (rag_corpus): ${error.message}`)
    for (const r of data ?? []) {
      const key = `${r.author}|${r.work}`
      if (r.text_type === 'paper_summary') {
        // section_label convention from lib/papers/ingest.ts:
        // 'scholarly summary — VENUE — YEAR'
        const bits = (r.section_label ?? '').split('—').map((s: string) => s.trim())
        modern.set(key, {
          authors: [],
          authorFallback: r.author,
          year: bits[2] || null,
          title: r.work,
          venue: bits[1] || null,
          doi: null,
          url: r.source_url,
        })
      } else {
        classical.set(key, { author: r.author, work: r.work, translator: r.translator })
      }
    }
  }

  if (scribeIds.length) {
    const { data: chunks, error } = await admin
      .from('scribe_source_chunks')
      .select('id, source_id')
      .in('id', scribeIds)
    if (error) throw new Error(`References (scribe chunks): ${error.message}`)
    const sourceIds = [...new Set((chunks ?? []).map(c => c.source_id))]
    if (sourceIds.length) {
      const { data: sources, error: sErr } = await admin
        .from('scribe_sources')
        .select('id, title, authors, year, venue, doi, url, citation_key')
        .in('id', sourceIds)
      if (sErr) throw new Error(`References (scribe sources): ${sErr.message}`)
      for (const s of sources ?? []) {
        modern.set(`key|${s.citation_key}`, {
          authors: (s.authors ?? []) as ScribeAuthor[],
          year: s.year,
          title: s.title,
          venue: s.venue,
          doi: s.doi,
          url: s.url,
        })
      }
    }
  }

  const lines: string[] = ['', '---', '', '## References']
  if (classical.size) {
    lines.push('', '**Classical sources**', '')
    for (const r of [...classical.values()].sort((a, b) => a.author.localeCompare(b.author))) {
      lines.push(`- ${formatClassical(r)}`)
    }
  }
  if (modern.size) {
    lines.push('', '**Modern works**', '')
    for (const r of [...modern.values()].sort((a, b) =>
      (a.authors[0]?.family ?? a.authorFallback ?? '').localeCompare(b.authors[0]?.family ?? b.authorFallback ?? '')
    )) {
      lines.push(`- ${formatModern(r, style)}`)
    }
  }
  return lines.join('\n')
}

// Pure formatting helpers exported for unit tests.
export const _test = { formatModern, formatClassical, apaAuthors, chicagoAuthors }

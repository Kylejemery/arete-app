import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { baseCitationKey, dedupeCitationKey, parseAuthors } from '@/lib/scribe/citation'
import type { ScribeAuthor } from '@/lib/scribe/types'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/sources — the source library, with which ingested
// paper submissions are not yet linked (so the UI can offer one-click import).
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createAdminClient()
  const [sourcesRes, papersRes] = await Promise.all([
    admin.from('scribe_sources').select('*').order('created_at', { ascending: false }),
    admin
      .from('paper_submissions')
      .select('id, author, work, year, venue, source_url, detected_title, detected_authors, status')
      .in('status', ['ingested', 'pending_review'])
      .order('created_at', { ascending: false }),
  ])
  if (sourcesRes.error) {
    return NextResponse.json({ error: sourcesRes.error.message }, { status: 500 })
  }

  const linked = new Set(
    (sourcesRes.data ?? []).map(s => s.paper_submission_id).filter(Boolean)
  )
  const unlinkedPapers = (papersRes.data ?? []).filter(p => !linked.has(p.id))

  return NextResponse.json({ sources: sourcesRes.data, unlinkedPapers })
}

// POST /api/admin/scribe/sources — create a source. Two shapes:
//   { paper_submission_id }  → prefill bibliographic fields from the papers flow
//   { kind, title, authors, year, venue, doi, url } → manual entry
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await req.json()
  const admin = createAdminClient()

  let insert: {
    kind: string
    title: string
    authors: ScribeAuthor[]
    year: string | null
    venue: string | null
    doi: string | null
    url: string | null
    paper_submission_id: string | null
  }

  if (body.paper_submission_id) {
    const { data: sub, error } = await admin
      .from('paper_submissions')
      .select('id, author, work, year, venue, source_url, detected_title, detected_authors')
      .eq('id', body.paper_submission_id)
      .single()
    if (error || !sub) {
      return NextResponse.json({ error: 'Paper submission not found' }, { status: 404 })
    }
    insert = {
      kind: 'paper',
      title: sub.work || sub.detected_title || 'Untitled paper',
      authors: parseAuthors(sub.author || sub.detected_authors),
      year: sub.year ?? null,
      venue: sub.venue ?? null,
      doi: null,
      url: sub.source_url ?? null,
      paper_submission_id: sub.id,
    }
  } else {
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }
    insert = {
      kind: body.kind || 'paper',
      title: body.title.trim(),
      authors: Array.isArray(body.authors) ? body.authors : parseAuthors(body.authors),
      year: body.year ?? null,
      venue: body.venue ?? null,
      doi: body.doi ?? null,
      url: body.url ?? null,
      paper_submission_id: null,
    }
  }

  const { data: existing } = await admin.from('scribe_sources').select('citation_key')
  const existingKeys = new Set((existing ?? []).map(r => r.citation_key as string))
  const citation_key = dedupeCitationKey(
    baseCitationKey(insert.authors, insert.year, insert.title),
    existingKeys
  )

  const { data, error } = await admin
    .from('scribe_sources')
    .insert({ ...insert, citation_key })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ source: data })
}

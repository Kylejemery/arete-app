import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const KINDS = new Set(['journal', 'thought', 'essay', 'clipping'])

// GET /api/admin/scribe/log — the running log, newest first.
// With ?q= the list becomes a semantic search over the whole log instead.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createAdminClient()
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const kind = req.nextUrl.searchParams.get('kind')?.trim()

  if (q) {
    const embedding = await embedChunk(q)
    const { data, error } = await admin.rpc('match_scribe_log_items', {
      query_embedding: embedding,
      match_count: 30,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = kind ? (data ?? []).filter((i: { kind: string }) => i.kind === kind) : data
    return NextResponse.json({ items, semantic: true })
  }

  let query = admin
    .from('scribe_log_items')
    .select('id, kind, title, content, source_url, entry_date, created_at, updated_at')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (kind && KINDS.has(kind)) query = query.eq('kind', kind)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data, semantic: false })
}

// POST /api/admin/scribe/log — add an item; embeds on save so it can relate
// to everything already in the log.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { kind, title, content, source_url, entry_date } = await req.json()
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: 'kind must be journal | thought | essay | clipping' }, { status: 400 })
  }
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  }

  const embedding = await embedChunk(content)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_log_items')
    .insert({
      kind,
      title: title?.trim() || null,
      content,
      source_url: source_url?.trim() || null,
      entry_date: entry_date || undefined,
      embedding,
    })
    .select('id, kind, title, content, source_url, entry_date, created_at, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { chapterForEntry, listFindings } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/entries/[id] — the whole reopenable session: entry,
// full message thread in order, every draft snapshot, the findings on it,
// and, when the entry is a chapter, its book and the chapter list.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const admin = createAdminClient()

  const [entryRes, messagesRes, draftsRes, bookInfo, findings] = await Promise.all([
    admin.from('scribe_entries').select('*').eq('id', id).maybeSingle(),
    admin
      .from('scribe_messages')
      .select('id, role, content, sources_used, draft_text, created_at')
      .eq('entry_id', id)
      .order('created_at', { ascending: true }),
    admin
      .from('scribe_entry_drafts')
      .select('id, stage, draft_text, sources_used, review, created_at')
      .eq('entry_id', id)
      .order('created_at', { ascending: true }),
    chapterForEntry(admin, id).catch(e => {
      console.warn('[scribe/entries] book lookup failed:', e instanceof Error ? e.message : e)
      return null
    }),
    listFindings(admin, { entryId: id }).catch(() => []),
  ])

  if (entryRes.error) return NextResponse.json({ error: entryRes.error.message }, { status: 500 })
  if (!entryRes.data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (messagesRes.error) return NextResponse.json({ error: messagesRes.error.message }, { status: 500 })
  if (draftsRes.error) return NextResponse.json({ error: draftsRes.error.message }, { status: 500 })

  return NextResponse.json({
    entry: entryRes.data,
    messages: messagesRes.data,
    drafts: draftsRes.data,
    findings,
    book: bookInfo
      ? {
          id: bookInfo.book.id,
          title: bookInfo.book.title,
          chapter: bookInfo.chapter,
          chapters: bookInfo.chapters.map(c => ({
            id: c.id,
            entry_id: c.entry_id,
            position: c.position,
            title: c.title,
            status: c.status,
            word_count: c.word_count,
          })),
        }
      : null,
  })
}

// PATCH /api/admin/scribe/entries/[id] — entry settings. Today that is
// gaps_mode, the optional posture where Scribe builds everything around the
// prose and the writer supplies the sentences.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (typeof body.gaps_mode === 'boolean') patch.gaps_mode = body.gaps_mode
  if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200) || null
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

// DELETE /api/admin/scribe/entries/[id] — messages and drafts cascade.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('scribe_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

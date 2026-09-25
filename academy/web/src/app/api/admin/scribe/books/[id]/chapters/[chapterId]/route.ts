import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string; chapterId: string }> }

// PATCH /api/admin/scribe/books/[id]/chapters/[chapterId]
//   { title?, status?, summary? }
// A summary edited by hand is marked summary_by_hand so the summariser
// leaves it alone until the chapter's text changes again. Archiving a chapter
// is the only removal there is: the entry and its thread stay.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id, chapterId } = await params
  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 200)
  if (['raw', 'working', 'settled', 'archived'].includes(body.status)) patch.status = body.status
  if (typeof body.summary === 'string') {
    patch.summary = body.summary.trim() || null
    patch.summary_by_hand = !!body.summary.trim()
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  patch.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_chapters')
    .update(patch)
    .eq('id', chapterId)
    .eq('book_id', id)
    .select('id, book_id, entry_id, position, title, status, summary, summary_by_hand, argument, word_count, indexed_hash, created_at, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (patch.title) {
    await admin.from('scribe_entries').update({ title: patch.title }).eq('id', (data as { entry_id: string }).entry_id)
  }
  await admin.from('scribe_books').update({ updated_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ chapter: data })
}

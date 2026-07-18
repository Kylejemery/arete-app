import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/entries/[id] — the whole reopenable session: entry,
// full message thread in order, and every draft snapshot.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const admin = createAdminClient()

  const [entryRes, messagesRes, draftsRes] = await Promise.all([
    admin.from('scribe_entries').select('*').eq('id', id).maybeSingle(),
    admin
      .from('scribe_messages')
      .select('id, role, content, sources_used, created_at')
      .eq('entry_id', id)
      .order('created_at', { ascending: true }),
    admin
      .from('scribe_entry_drafts')
      .select('id, stage, draft_text, sources_used, created_at')
      .eq('entry_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (entryRes.error) return NextResponse.json({ error: entryRes.error.message }, { status: 500 })
  if (!entryRes.data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (messagesRes.error) return NextResponse.json({ error: messagesRes.error.message }, { status: 500 })
  if (draftsRes.error) return NextResponse.json({ error: draftsRes.error.message }, { status: 500 })

  return NextResponse.json({
    entry: entryRes.data,
    messages: messagesRes.data,
    drafts: draftsRes.data,
  })
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

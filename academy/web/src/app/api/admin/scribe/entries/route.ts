import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/entries — chat entries, newest activity first.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_entries')
    .select('id, title, raw_text, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

// POST /api/admin/scribe/entries — { title?, raw_text }. Stores the journal
// fragment verbatim and posts it as the thread's first user message; the
// client then calls /turn to get Scribe's opening middle draft.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { title, raw_text } = await req.json()
  if (typeof raw_text !== 'string' || !raw_text.trim()) {
    return NextResponse.json({ error: 'Missing raw_text' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: entry, error } = await admin
    .from('scribe_entries')
    .insert({ title: title?.trim() || null, raw_text })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: msgError } = await admin
    .from('scribe_messages')
    .insert({ entry_id: entry.id, role: 'user', content: raw_text })
  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  return NextResponse.json({ entry })
}

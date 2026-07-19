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

// POST /api/admin/scribe/entries — { title?, raw_text, instruction? }.
// Stores the journal fragment verbatim and posts it as the thread's first
// user message; the client then calls /turn for Scribe's opening move. An
// optional instruction rides along in the first message (never in raw_text)
// to open in a different mode — e.g. "find the connections between this and
// my log before drafting anything."
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { title, raw_text, instruction } = await req.json()
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

  const firstMessage =
    typeof instruction === 'string' && instruction.trim()
      ? `${raw_text}\n\n---\n\n${instruction.trim()}`
      : raw_text
  const { error: msgError } = await admin
    .from('scribe_messages')
    .insert({ entry_id: entry.id, role: 'user', content: firstMessage })
  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  return NextResponse.json({ entry })
}

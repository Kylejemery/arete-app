import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/scribe/entries/[id]/revise — Kyle's hand revision of the
// working draft, from the changes view (keep / revert / rewrite each hunk).
//
// It lands as a real user turn in the thread rather than a side table, because
// that is what it is: he is telling Scribe what the draft now says. Scribe's
// next turn sees it in history and carries it forward, so a reverted paragraph
// stays reverted. The <kyle-edit/> marker lets the UI render it as a compact
// revision note instead of dumping the whole draft into the conversation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { draft_text, summary } = await req.json().catch(() => ({}))
  if (typeof draft_text !== 'string' || !draft_text.trim()) {
    return NextResponse.json({ error: 'Missing draft_text' }, { status: 400 })
  }
  // The summary is echoed back into prose the model reads — keep it inert.
  const note = String(summary ?? '').replace(/[<>"]/g, '').slice(0, 200).trim()

  const admin = createAdminClient()

  const { data: entry, error: entryError } = await admin
    .from('scribe_entries')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const content =
    `<kyle-edit summary="${note}"/>\n` +
    `I went through your last revision and settled it by hand${note ? ` (${note})` : ''}. ` +
    `The draft below is now the working draft. Carry it forward exactly as written — ` +
    `do not reintroduce anything I took out, and do not undo my wording.\n\n` +
    `<draft>\n${draft_text.trim()}\n</draft>`

  // Each hand revision carries the whole draft, so a run of them (fix a
  // paragraph, fix another, resolve the changes) would put several full copies
  // of the essay into the thread and into every later Anthropic call. When the
  // last turn is already a hand revision, overwrite it instead: the draft it
  // held was superseded by this one anyway, so nothing is lost.
  const { data: last } = await admin
    .from('scribe_messages')
    .select('id, role, content')
    .eq('entry_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const collapsible = last?.role === 'user' && last.content.includes('<kyle-edit')

  const { data: saved, error } = collapsible
    ? await admin
        .from('scribe_messages')
        .update({ content })
        .eq('id', last!.id)
        .select('id, role, content, sources_used, created_at')
        .single()
    : await admin
        .from('scribe_messages')
        .insert({ entry_id: id, role: 'user', content })
        .select('id, role, content, sources_used, created_at')
        .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('scribe_entries').update({ updated_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ message: saved })
}

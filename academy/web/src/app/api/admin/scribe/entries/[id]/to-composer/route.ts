import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/scribe/entries/[id]/to-composer — hand a Scribe draft to
// the Composer for the retype pass.
//
// The two surfaces were never connected, which left the gap that matters
// most: the Composer's retype callout is the tool for turning Scribe's prose
// into the writer's own, sentence by sentence, and a Scribe draft could not
// reach it. This creates the piece at the polish stage with the draft as
// version one and as the working copy, then the client opens the Composer on
// it.
//
// Written through the user's own session (not the service role) so the piece
// is owned by them and RLS governs it like any other piece.
//
// Body: { draft_text, title? }
// Returns: { pieceId }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const draftText = typeof body.draft_text === 'string' ? body.draft_text.trim() : ''
  if (!draftText) {
    return NextResponse.json({ error: 'No draft to send.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let title: string | null = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : null
  if (!title) {
    const { data: entry } = await createAdminClient()
      .from('scribe_entries')
      .select('title')
      .eq('id', id)
      .maybeSingle()
    title = (entry as { title?: string | null } | null)?.title ?? null
  }

  const now = new Date().toISOString()
  const { data: piece, error: pieceError } = await supabase
    .from('writing_pieces')
    .insert({
      user_id: user.id,
      title,
      // The argument is settled; what remains is the prose, which is exactly
      // what the polish stage weights and where rewrites are offered freely.
      stage: 'polish',
      working_copy: draftText,
      working_copy_saved_at: now,
    })
    .select('id')
    .single()
  if (pieceError || !piece) {
    return NextResponse.json({ error: pieceError?.message ?? 'Could not create the piece' }, { status: 500 })
  }
  const pieceId = (piece as { id: string }).id

  // Version one: the draft as Scribe left it, so the retype has something to
  // diff against and the Composer's own history starts from the handoff.
  const { error: draftError } = await supabase.from('piece_drafts').insert({
    piece_id: pieceId,
    user_id: user.id,
    version: 1,
    content: draftText,
    word_count: draftText.split(/\s+/).filter(Boolean).length,
  })
  if (draftError) {
    console.warn('[scribe/to-composer] draft snapshot failed:', draftError.message)
  }

  return NextResponse.json({ pieceId })
}

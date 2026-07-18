import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/scribe/entries/[id]/drafts — manual snapshot of the working
// essay ("save as middle" / "save as full" in the draft pane). Conversational
// save intents snapshot automatically in the turn route; this is the button.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { stage, draft_text, sources_used } = await req.json()
  if (stage !== 'middle' && stage !== 'full') {
    return NextResponse.json({ error: "stage must be 'middle' or 'full'" }, { status: 400 })
  }
  if (typeof draft_text !== 'string' || !draft_text.trim()) {
    return NextResponse.json({ error: 'Missing draft_text' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_entry_drafts')
    .insert({ entry_id: id, stage, draft_text, sources_used: sources_used ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

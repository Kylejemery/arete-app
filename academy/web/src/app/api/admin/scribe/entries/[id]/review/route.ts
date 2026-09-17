import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { reviewDraft } from '@/lib/scribe/review'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST /api/admin/scribe/entries/[id]/review — one cold outside read, on
// demand. The same pass the final handoff fires automatically, available
// mid-draft so the writer does not have to finalize an essay just to hear
// what a stranger makes of it. Nothing is persisted: a read taken here is
// about the draft as it stands this minute, and the draft moves. The read
// stored on a snapshot still comes from finalizing.
//
// Body: { draft_text }
// Returns: { review }
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { draft_text } = await req.json().catch(() => ({}))
  if (typeof draft_text !== 'string' || !draft_text.trim()) {
    return NextResponse.json({ error: 'No draft to read.' }, { status: 400 })
  }

  const review = await reviewDraft(draft_text)
  return NextResponse.json({ review })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/papers/:id
// { status?: 'rejected' | 'queued', review_notes?, author?, work?, year?, venue? }
// Review-time controls: reject a summary, re-queue a failed (or rejected)
// submission for another pass, correct citation metadata before ingestion
// (the agent's detected_* fields surface mismatches), attach notes. Ingestion
// itself is the separate POST :id/ingest — approval and ingestion are one
// deliberate action there, mirroring the synthesis flow. Admin-gated.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { status, review_notes, author, work, year, venue } = await req.json()

    const admin = createAdminClient()
    const { data: paper, error: readErr } = await admin
      .from('paper_submissions')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()
    if (readErr) throw new Error(readErr.message)
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      if (!['rejected', 'queued'].includes(status)) {
        return NextResponse.json({ error: 'status must be rejected or queued' }, { status: 400 })
      }
      if (paper.status === 'ingested') {
        return NextResponse.json(
          { error: 'De-ingest this paper before changing its status' },
          { status: 400 }
        )
      }
      updates.status = status
      if (status === 'rejected') updates.reviewed_at = new Date().toISOString()
      if (status === 'queued') updates.error_message = null
    }
    if (typeof review_notes === 'string') updates.review_notes = review_notes
    if (typeof author === 'string' && author.trim()) updates.author = author.trim()
    if (typeof work === 'string' && work.trim()) updates.work = work.trim()
    if (typeof year === 'string') updates.year = year.trim() || null
    if (typeof venue === 'string') updates.venue = venue.trim() || null

    const { data, error } = await admin
      .from('paper_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, paper: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update paper' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/synthesis/:id  { status?, content?, review_notes? }
// Approve / reject / edit a synthesis document during review. Editing the
// content resets status to 'edited' so it re-enters the review queue (an edited
// document must be approved again before ingestion). Admin-gated.
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
    const { status, content, review_notes } = await req.json()

    const validStatuses = ['approved', 'rejected', 'edited']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (typeof content === 'string' && content.trim()) {
      updates.content = content
      updates.word_count = content.split(/\s+/).filter(Boolean).length
      updates.status = 'edited' // edited documents need re-approval
    }
    if (typeof review_notes === 'string') updates.review_notes = review_notes
    if (updates.status === 'approved' || updates.status === 'rejected') {
      updates.reviewed_at = new Date().toISOString()
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('synthesis_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, document: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update document' },
      { status: 500 }
    )
  }
}

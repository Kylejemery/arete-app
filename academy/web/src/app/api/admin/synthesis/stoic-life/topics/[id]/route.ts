import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin, startStoicLifeCycle } from '@/lib/stoic-life'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// PATCH /api/admin/synthesis/stoic-life/topics/:id
//   { action: 'approve' | 'reject', title?: string, review_notes?: string }
// Approve (optionally with a new title; the proposed one is kept as
// original_title) or reject a proposed topic, then start a cycle: an approved
// topic can be drafted at once, and a rejection may leave the backlog short.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { action, title, review_notes } = await req.json()
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: topic, error: tErr } = await admin
      .from('synthesis_topics')
      .select('id, title, original_title, status')
      .eq('id', id)
      .single()
    if (tErr || !topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    if (topic.status !== 'proposed' && topic.status !== 'approved') {
      return NextResponse.json({ error: `A ${topic.status} topic cannot be reviewed again` }, { status: 409 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      updated_at: now,
    }
    if (action === 'approve') updates.approved_at = now
    if (typeof review_notes === 'string') updates.review_notes = review_notes
    const newTitle = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : ''
    if (newTitle && newTitle !== topic.title) {
      updates.title = newTitle.slice(0, 160)
      updates.original_title = topic.original_title ?? topic.title
      updates.title_embedding = null // re-embedded by the proposer when it next reads titles
    }

    const { data, error } = await admin.from('synthesis_topics').update(updates).eq('id', id).select().single()
    if (error) {
      const msg = error.code === '23505' ? 'Another topic already has that title' : error.message
      return NextResponse.json({ error: msg }, { status: error.code === '23505' ? 409 : 500 })
    }

    const cycle = await startStoicLifeCycle(session.token)
    return NextResponse.json({ success: true, topic: data, cycle })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to update topic' }, { status: 500 })
  }
}

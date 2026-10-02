import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { frontMatterIdentity, requireAdmin, startStoicLifeCycle } from '@/lib/stoic-life'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// PATCH /api/admin/synthesis/stoic-life/drafts/:id
//   { status?: 'approved' | 'rejected', markdown?: string, review_notes?: string }
//
// Saving an edit sets the draft to 'edited': it needs approving again.
// Approving makes it exportable (academy/corpus-ingestion/
// export-synthesis-drafts.js writes it into the repo; nothing is ingested
// until that file is merged). Rejecting sends its topic back to 'proposed', so
// Kyle decides whether it is drafted again. Approving or rejecting frees the
// review slot, so a cycle is started for the next approved topic.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { status, markdown, review_notes } = await req.json()
    if (status !== undefined && status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: draft, error: dErr } = await admin
      .from('synthesis_drafts')
      .select('id, topic_id, doc_key, version, status, markdown')
      .eq('id', id)
      .eq('mode', 'stoic_life')
      .single()
    if (dErr || !draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.status !== 'pending_review' && draft.status !== 'edited') {
      return NextResponse.json({ error: `A ${draft.status} draft is no longer in review` }, { status: 409 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updated_at: now }
    if (typeof review_notes === 'string') updates.review_notes = review_notes

    if (typeof markdown === 'string' && markdown.trim() && markdown !== draft.markdown) {
      const ident = frontMatterIdentity(markdown)
      if (ident.docKey !== draft.doc_key || ident.version !== draft.version) {
        return NextResponse.json(
          { error: `The front matter must keep doc_key: ${draft.doc_key} and version: ${draft.version}` },
          { status: 400 }
        )
      }
      updates.markdown = markdown
      updates.word_count = markdown.replace(/^---[\s\S]*?\n---\n?/, '').split(/\s+/).filter(w => /\w/.test(w)).length
      updates.status = 'edited'
    }
    if (status && updates.status !== 'edited') {
      updates.status = status
      updates.reviewed_at = now
    }

    const { data, error } = await admin.from('synthesis_drafts').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)

    let cycle = null
    if (updates.status === 'approved' || updates.status === 'rejected') {
      if (updates.status === 'rejected' && draft.topic_id) {
        await admin.from('synthesis_topics').update({
          status: 'proposed',
          review_notes: `Draft rejected${typeof review_notes === 'string' && review_notes.trim() ? `: ${review_notes.trim()}` : ''}. Approve the topic again to redraft it.`,
          updated_at: now,
        }).eq('id', draft.topic_id)
      }
      cycle = await startStoicLifeCycle(session.token)
    }
    return NextResponse.json({ success: true, draft: data, cycle })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to update draft' }, { status: 500 })
  }
}

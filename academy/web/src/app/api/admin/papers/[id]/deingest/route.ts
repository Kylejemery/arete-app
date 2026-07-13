import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/papers/:id/deingest — remove an ingested paper summary from
// rag_corpus (by the recorded chunk ids) and return the submission to
// pending_review so it can be re-reviewed, corrected, or rejected. Mirrors
// the synthesis de-ingest. Admin-gated.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data: paper, error } = await admin
      .from('paper_submissions')
      .select('id, status, rag_chunk_ids')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    if (paper.status !== 'ingested') {
      return NextResponse.json(
        { error: `Paper is not ingested (current status: ${paper.status})` },
        { status: 400 }
      )
    }

    const ids: string[] = paper.rag_chunk_ids || []
    if (ids.length > 0) {
      const { error: delErr } = await admin.from('rag_corpus').delete().in('id', ids)
      if (delErr) throw new Error(delErr.message)
    }

    const { error: updErr } = await admin
      .from('paper_submissions')
      .update({
        status: 'pending_review',
        rag_chunk_ids: null,
        ingested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true, chunksRemoved: ids.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Paper de-ingestion failed' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ingestPaperSummary } from '@/lib/papers/ingest'

export const dynamic = 'force-dynamic'
// Embedding a summary is a handful of chunks; give the route headroom anyway.
export const maxDuration = 60

// POST /api/admin/papers/:id/ingest — approve AND ingest in one deliberate
// action: chunks the reviewed summary into rag_corpus (text_type
// 'paper_summary'), records the chunk ids for clean de-ingest, and marks the
// submission ingested. Only pending_review papers with a summary qualify.
// The paper's own text is never touched — summary only, by design. Admin-gated.
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
      .select('id, author, work, year, venue, summary_text, source_url, status, key_concepts')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    if (paper.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Paper must be pending review to ingest (current status: ${paper.status})` },
        { status: 400 }
      )
    }
    if (!paper.summary_text?.trim()) {
      return NextResponse.json({ error: 'Paper has no summary to ingest' }, { status: 400 })
    }

    const { chunksCreated, chunkIds, chunks } = await ingestPaperSummary(paper)

    // Approving a paper also plants its key concepts in concept_passage_map —
    // the curated layer the Observatory sky is built from — so the scholar
    // becomes a voice on those stars and can form shared-voice connections.
    // Still human-gated: the concepts are on the review card Kyle just
    // approved. Anchored to the first chunk; the FK cascades on de-ingest, so
    // removing the paper removes its stars' claim on these concepts too.
    // Best-effort: a failure here must not lose the committed ingest.
    let conceptWarning: string | undefined
    const labels = (paper.key_concepts || [])
      .map((k: unknown) => String(k).trim().toLowerCase())
      .filter((k: string) => k.length > 1)
      .slice(0, 6)
    if (labels.length > 0 && chunkIds.length > 0) {
      const rows = labels.map((concept: string) => ({
        concept,
        chunk_id: chunkIds[0],
        author: paper.author,
        work: paper.work,
        chunk_text: chunks[0],
        approved: true,
        approved_at: new Date().toISOString(),
      }))
      const { error: cpmErr } = await admin
        .from('concept_passage_map')
        .upsert(rows, { onConflict: 'concept,chunk_id' })
      if (cpmErr) conceptWarning = cpmErr.message
    }

    const { error: updErr } = await admin
      .from('paper_submissions')
      .update({
        status: 'ingested',
        reviewed_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        rag_chunk_ids: chunkIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({
      success: true,
      chunksCreated,
      chunkIds,
      conceptsPlanted: labels,
      ...(conceptWarning ? { conceptWarning } : {}),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Paper ingestion failed' },
      { status: 500 }
    )
  }
}

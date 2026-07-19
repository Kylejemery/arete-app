import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// PATCH /api/admin/consolidation/:id  { status: 'approved' | 'rejected', review_notes? }
//
// The learning system's ingestion gate. Nothing the Consolidation Agent
// proposes enters rag_corpus until this route approves it: approval embeds
// the synthesis (text-embedding-3-small, matching the corpus) and inserts it
// as a new rag_corpus row carrying its provenance — source_type
// 'consolidation_synthesis', parent_chunks pointing at the passages it
// connects. It NEVER overwrites a primary-source chunk. Rejection just marks
// the row. Admin-gated.
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
    const { status, review_notes } = await req.json()
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: synth, error: sErr } = await admin
      .from('corpus_syntheses').select('*').eq('id', id).single()
    if (sErr || !synth) return NextResponse.json({ error: 'Synthesis not found' }, { status: 404 })
    if (synth.status !== 'pending_review') {
      return NextResponse.json({ error: `Synthesis is ${synth.status}, not pending_review` }, { status: 409 })
    }

    let ragCorpusId: string | null = null
    if (status === 'approved') {
      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })

      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: synth.content }),
      })
      const embData = await embRes.json()
      const embedding = embData.data?.[0]?.embedding
      if (!embedding) {
        return NextResponse.json({ error: 'Embedding generation failed' }, { status: 502 })
      }

      const { data: inserted, error: iErr } = await admin
        .from('rag_corpus')
        .insert({
          program_id: 'stoicism-phd',
          author: 'Arete Synthesis',
          work: synth.title ?? 'Synthesis note',
          section_label: 'Consolidation synthesis',
          chunk_index: 0, // NOT NULL in rag_corpus; a synthesis is a single-chunk work
          chunk_text: synth.content,
          word_count: synth.content.split(/\s+/).length,
          text_type: 'synthesis',
          source_type: 'consolidation_synthesis',
          parent_chunks: synth.cluster_chunks,
          language: 'english',
          embedding,
        })
        .select('id')
        .single()
      if (iErr || !inserted) {
        return NextResponse.json({ error: 'rag_corpus insert failed: ' + (iErr?.message ?? 'unknown') }, { status: 500 })
      }
      ragCorpusId = inserted.id
    }

    const { data: updated, error: uErr } = await admin
      .from('corpus_syntheses')
      .update({
        status,
        review_notes: typeof review_notes === 'string' ? review_notes : synth.review_notes,
        reviewed_at: new Date().toISOString(),
        ...(ragCorpusId ? { rag_corpus_id: ragCorpusId } : {}),
      })
      .eq('id', id)
      .select()
      .single()
    if (uErr) throw new Error(uErr.message)

    return NextResponse.json({ success: true, synthesis: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update synthesis' },
      { status: 500 }
    )
  }
}

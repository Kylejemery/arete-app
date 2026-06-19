import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ingestSynthesisDocument } from '@/lib/synthesis/ingest'

export const dynamic = 'force-dynamic'
// Embedding several chunks can take a little while; give the route room.
export const maxDuration = 60

// POST /api/admin/synthesis/:id/ingest
// Ingests an APPROVED synthesis document into rag_corpus as text_type='synthesis'
// and marks it 'ingested'. Idempotent on re-run via the rag_corpus conflict key
// (author 'Arete Synthesis' + work=title + program_id + chunk_index). Admin-gated.
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

    const { data: doc, error } = await admin
      .from('synthesis_documents')
      .select('id, title, content, concept, synthesis_type, status')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    if (doc.status !== 'approved') {
      return NextResponse.json(
        { error: `Document must be approved before ingestion (current status: ${doc.status})` },
        { status: 400 }
      )
    }

    const { chunksCreated, chunkIds } = await ingestSynthesisDocument(doc)

    const { error: updErr } = await admin
      .from('synthesis_documents')
      .update({
        status: 'ingested',
        ingested_at: new Date().toISOString(),
        rag_chunk_ids: chunkIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true, chunksCreated, chunkIds })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Synthesis ingestion failed' },
      { status: 500 }
    )
  }
}

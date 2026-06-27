import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/synthesis/:id/deingest
// Removes an ingested synthesis from rag_corpus (deletes its chunks) and returns
// the document to the review queue as 'edited' — so it can be edited and
// re-ingested (replace), or rejected (remove for good). Admin-gated.
//
// Safe: a synthesis is optional everywhere it's read (Library shelf, Observatory,
// dispatch context all tolerate its absence), so removal never breaks a feature.
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
      .select('id, title, status, rag_chunk_ids')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    if (doc.status !== 'ingested') {
      return NextResponse.json(
        { error: `Only ingested documents can be removed from the corpus (current status: ${doc.status})` },
        { status: 400 }
      )
    }

    // Delete its chunks from rag_corpus. Prefer the exact chunk ids recorded at
    // ingestion; fall back to the synthesis author+work key if ids are missing.
    let removed = 0
    if (Array.isArray(doc.rag_chunk_ids) && doc.rag_chunk_ids.length > 0) {
      const { error: delErr, count } = await admin
        .from('rag_corpus')
        .delete({ count: 'exact' })
        .in('id', doc.rag_chunk_ids)
      if (delErr) throw new Error(delErr.message)
      removed = count || 0
    } else {
      const { error: delErr, count } = await admin
        .from('rag_corpus')
        .delete({ count: 'exact' })
        .eq('author', 'Arete Synthesis')
        .eq('work', doc.title)
      if (delErr) throw new Error(delErr.message)
      removed = count || 0
    }

    const { data: updated, error: updErr } = await admin
      .from('synthesis_documents')
      .update({
        status: 'edited',
        rag_chunk_ids: null,
        ingested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true, removed, document: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to remove from corpus' },
      { status: 500 }
    )
  }
}

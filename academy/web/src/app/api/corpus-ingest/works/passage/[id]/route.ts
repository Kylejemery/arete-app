import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ingestText, type IngestMeta } from '@/lib/corpus/ingest'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === process.env.ADMIN_EMAIL
}

type SourceRow = {
  id: string; author: string; work: string; section_label: string | null
  language: string | null; course_relevance: string | null; difficulty: string | null
  mode: string; text_type: string; source_text: string | null; summary_text: string | null
  rag_chunk_ids: string[] | null; created_at: string; updated_at: string
}

const metaOf = (r: SourceRow): IngestMeta => ({
  author: r.author,
  work: r.work,
  section_label: r.section_label,
  language: r.language,
  course_relevance: r.course_relevance,
  difficulty: r.difficulty,
  text_type: r.text_type,
})

// GET — the passage's original source + ingested summary, for the editor.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('corpus_sources')
      .select('id, author, work, section_label, language, course_relevance, difficulty, mode, text_type, source_text, summary_text, rag_chunk_ids, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Passage not found' }, { status: 404 })
    return NextResponse.json({ passage: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load passage' }, { status: 500 })
  }
}

// PUT — replace this passage's ingested text. Deletes its old rag_corpus chunks,
// re-embeds the edited summary, and updates the source record. Body: { summaryText }.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const { summaryText } = await req.json()
    if (typeof summaryText !== 'string' || summaryText.trim().length < 50) {
      return NextResponse.json({ error: 'Summary must be at least 50 characters.' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { data: row, error } = await admin
      .from('corpus_sources')
      .select('id, author, work, section_label, language, course_relevance, difficulty, mode, text_type, source_text, summary_text, rag_chunk_ids, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) return NextResponse.json({ error: 'Passage not found' }, { status: 404 })

    // Remove old chunks first so the re-ingest doesn't double-count the work.
    if (Array.isArray(row.rag_chunk_ids) && row.rag_chunk_ids.length > 0) {
      const { error: delErr } = await admin.from('rag_corpus').delete().in('id', row.rag_chunk_ids)
      if (delErr) throw new Error(delErr.message)
    }

    const { chunksCreated, chunkIds } = await ingestText(summaryText, metaOf(row as SourceRow))

    const { error: updErr } = await admin
      .from('corpus_sources')
      .update({ summary_text: summaryText, rag_chunk_ids: chunkIds, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true, chunksCreated })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to update passage' }, { status: 500 })
  }
}

// DELETE — remove this passage's chunks from rag_corpus and drop the source row.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const admin = createAdminClient()
    const { data: row, error } = await admin
      .from('corpus_sources')
      .select('id, rag_chunk_ids')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) return NextResponse.json({ error: 'Passage not found' }, { status: 404 })

    let removed = 0
    if (Array.isArray(row.rag_chunk_ids) && row.rag_chunk_ids.length > 0) {
      const { error: delErr, count } = await admin
        .from('rag_corpus')
        .delete({ count: 'exact' })
        .in('id', row.rag_chunk_ids)
      if (delErr) throw new Error(delErr.message)
      removed = count || 0
    }
    const { error: srcErr } = await admin.from('corpus_sources').delete().eq('id', id)
    if (srcErr) throw new Error(srcErr.message)

    return NextResponse.json({ success: true, removed })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to delete passage' }, { status: 500 })
  }
}

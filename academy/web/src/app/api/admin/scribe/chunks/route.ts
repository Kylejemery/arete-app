import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/chunks?table=rag_corpus|scribe_source_chunks&id=…
// Returns the underlying chunk for the citation hover-card — the review
// feature: see exactly what a citation is standing on.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const table = req.nextUrl.searchParams.get('table')
  const id = req.nextUrl.searchParams.get('id')
  if (!id || (table !== 'rag_corpus' && table !== 'scribe_source_chunks')) {
    return NextResponse.json({ error: 'Pass table=rag_corpus|scribe_source_chunks and id' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (table === 'rag_corpus') {
    const { data, error } = await admin
      .from('rag_corpus')
      .select('id, chunk_text, author, work, section_label, translator, text_type')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({
      chunk: {
        content: data.chunk_text,
        source: `${data.author}, ${data.work}${data.section_label ? ` (${data.section_label})` : ''}`,
        translator: data.translator,
        text_type: data.text_type,
      },
    })
  }

  const { data, error } = await admin
    .from('scribe_source_chunks')
    .select('id, content, page_hint, section_hint, source_id')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: src } = await admin
    .from('scribe_sources')
    .select('citation_key, title')
    .eq('id', data.source_id)
    .single()

  return NextResponse.json({
    chunk: {
      content: data.content,
      source: src ? `[${src.citation_key}] ${src.title}` : 'Unknown source',
      page_hint: data.page_hint,
      section_hint: data.section_hint,
    },
  })
}

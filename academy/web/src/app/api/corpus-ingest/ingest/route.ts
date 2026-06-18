import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ingestText, authorChunkCount, type IngestMeta } from '@/lib/corpus/ingest'

export const dynamic = 'force-dynamic'

// POST /api/corpus-ingest/ingest — chunk → embed → upsert the (summary or
// verbatim) text into rag_corpus. Verbatim requires explicit public-domain
// confirmation. Admin-gated. Never throws unhandled.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      text,
      mode,
      publicDomainConfirmed,
      author,
      work,
      section,
      pages,
      language,
      courseRelevance,
      difficulty,
    } = body

    if (typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json({ error: 'Text must be at least 50 characters.' }, { status: 400 })
    }
    if (!author?.trim() || !work?.trim()) {
      return NextResponse.json({ error: 'Author and Work are required.' }, { status: 400 })
    }
    if (mode !== 'summary' && mode !== 'verbatim') {
      return NextResponse.json({ error: 'mode must be "summary" or "verbatim".' }, { status: 400 })
    }
    if (mode === 'verbatim' && publicDomainConfirmed !== true) {
      return NextResponse.json(
        { error: 'Public domain confirmation required for verbatim ingestion' },
        { status: 400 }
      )
    }

    const meta: IngestMeta = {
      author: author.trim(),
      work: work.trim(),
      // Fold an optional page reference into section_label (e.g. "Chapter 3, pp. 81–84").
      section_label: [section?.trim(), pages?.trim()].filter(Boolean).join(', ') || null,
      language: language || 'en',
      course_relevance: courseRelevance?.trim() || null,
      difficulty: difficulty?.trim() || null,
      text_type: mode === 'summary' ? 'summary' : 'public_domain',
    }

    const { chunksCreated, wordCount } = await ingestText(text, meta)
    const chunks = await authorChunkCount(meta.author)

    return NextResponse.json({
      success: true,
      chunksCreated,
      wordCount,
      author: meta.author,
      work: meta.work,
      authorChunkCount: chunks,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ingestion failed' },
      { status: 500 }
    )
  }
}

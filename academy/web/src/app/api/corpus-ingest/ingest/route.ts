import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ingestText, authorChunkCount, type IngestMeta } from '@/lib/corpus/ingest'

export const dynamic = 'force-dynamic'
// Whole works (PDF ingestion from the Gap tab) embed hundreds of chunks in one
// request — allow the full five minutes rather than the platform default.
export const maxDuration = 300

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
      sourceText,
      mode,
      textType,
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

    // Which flavour of summary this is. 'summary' shelves the work in the
    // Reading Room like any other; 'paper_summary' keeps it off the shelf while
    // staying retrievable and listed in the counselor source catalog — the
    // posture for modern in-copyright works. Defaults to 'summary' so existing
    // callers are unaffected. Rejected outright on verbatim rather than ignored,
    // so a caller that sends both surfaces its own bug instead of silently
    // publishing a copyrighted work to the shelf.
    if (textType !== undefined) {
      if (mode !== 'summary') {
        return NextResponse.json(
          { error: 'textType only applies to mode "summary".' },
          { status: 400 }
        )
      }
      if (textType !== 'summary' && textType !== 'paper_summary') {
        return NextResponse.json(
          { error: 'textType must be "summary" or "paper_summary".' },
          { status: 400 }
        )
      }
    }

    const meta: IngestMeta = {
      author: author.trim(),
      work: work.trim(),
      // Fold an optional page reference into section_label (e.g. "Chapter 3, pp. 81–84").
      section_label: [section?.trim(), pages?.trim()].filter(Boolean).join(', ') || null,
      language: language || 'en',
      course_relevance: courseRelevance?.trim() || null,
      difficulty: difficulty?.trim() || null,
      text_type: mode === 'summary' ? (textType || 'summary') : 'public_domain',
    }

    const { chunksCreated, wordCount, chunkIds } = await ingestText(text, meta)
    const chunks = await authorChunkCount(meta.author)

    // Record the source-of-record for this passage (original text + summary +
    // the chunk ids it produced) so it can be re-opened, edited, or removed from
    // the Manage Works view. Admin-only table; never read by the Reading Room.
    // Best-effort: a failure here must not lose the (already-committed) ingest.
    let sourceWarning: string | undefined
    try {
      const admin = createAdminClient()
      const { error: srcErr } = await admin.from('corpus_sources').insert({
        author: meta.author,
        work: meta.work,
        section_label: meta.section_label,
        language: meta.language,
        course_relevance: meta.course_relevance,
        difficulty: meta.difficulty,
        mode,
        text_type: meta.text_type,
        source_text: typeof sourceText === 'string' && sourceText.trim() ? sourceText : text,
        summary_text: text,
        rag_chunk_ids: chunkIds,
      })
      if (srcErr) sourceWarning = srcErr.message
    } catch (e) {
      sourceWarning = e instanceof Error ? e.message : 'source record failed'
    }

    return NextResponse.json({
      success: true,
      chunksCreated,
      wordCount,
      author: meta.author,
      work: meta.work,
      authorChunkCount: chunks,
      ...(sourceWarning ? { sourceWarning } : {}),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ingestion failed' },
      { status: 500 }
    )
  }
}

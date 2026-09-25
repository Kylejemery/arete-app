import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { countWords, splitChapters, type ChapterDraft, type SplitStrategy } from '@/lib/scribe/book-draft'
import { createChapter, loadBook, nextPosition, proposeShape, reindexChapter } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'
// Shaping reads the whole paste in one model call; embedding a whole book's
// chunks happens here too, in batches.
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

const STRATEGIES = new Set<SplitStrategy | 'shape'>(['auto', 'headings', 'markers', 'size', 'shape'])

// POST /api/admin/scribe/books/[id]/import
//   { text, strategy? }                → preview: the split, nothing stored.
//                                         'shape' asks Scribe to propose the
//                                         structure of a stream of
//                                         consciousness paste: what it is
//                                         (book, essay, chapter, pieces), the
//                                         parts, each part's thesis and what
//                                         it lacks, paragraphs regrouped and
//                                         reordered but never rewritten.
//   { chapters: [{ title, text }] }    → commit: one entry and chapter per
//                                         item, in order, appended after the
//                                         book's last chapter, then indexed
// Summaries are not written here; the book view's refresh does that a few
// chapters at a time.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  try {
    const loaded = await loadBook(admin, id)
    if (!loaded) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    if (typeof body.text === 'string') {
      if (!body.text.trim()) return NextResponse.json({ error: 'Paste the draft first' }, { status: 400 })
      const strategy: SplitStrategy | 'shape' = STRATEGIES.has(body.strategy) ? body.strategy : 'auto'
      if (strategy === 'shape') {
        const shaped = await proposeShape(body.text)
        return NextResponse.json({
          preview: { strategy: 'shape', chapters: shaped.chapters },
          proposal: shaped.proposal,
          totalWords: countWords(body.text),
        })
      }
      const result = splitChapters(body.text, strategy)
      return NextResponse.json({ preview: result, totalWords: countWords(body.text) })
    }

    if (Array.isArray(body.chapters)) {
      const drafts: ChapterDraft[] = body.chapters
        .filter((c: unknown): c is { title?: unknown; text?: unknown } => !!c && typeof c === 'object')
        .map((c: { title?: unknown; text?: unknown }) => {
          const text = String(c.text ?? '').replace(/\r\n?/g, '\n').trim()
          return { title: String(c.title ?? '').trim() || 'Untitled', text, words: countWords(text) }
        })
        .filter((c: ChapterDraft) => c.words > 0)
      if (!drafts.length) return NextResponse.json({ error: 'No chapters with text to import' }, { status: 400 })

      let position = await nextPosition(admin, id)
      const created = []
      for (const d of drafts) {
        const chapter = await createChapter(admin, id, d, position++)
        await reindexChapter(admin, chapter, d.text)
        created.push(chapter)
      }
      return NextResponse.json({ chapters: created })
    }

    return NextResponse.json({ error: 'Send text to preview a split, or chapters to import' }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Import failed'
    console.error('[scribe/books/import]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

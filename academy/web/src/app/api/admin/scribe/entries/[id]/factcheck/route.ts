import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { chapterForEntry, runFactCheck, workingDraftForEntry } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'
// Extraction, one retrieval pass per claim, then judging in batches.
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/entries/[id]/factcheck — { draft_text? }. Checks
// every claim about Stoic figures, texts, dates and doctrines in the draft
// against the corpus and the private paper chunks, and stores one finding per
// claim. A verdict only stands when its excerpt is really in the cited
// passage; the rest come back unverifiable and say so. Works for a chapter
// or a standalone essay.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data: entry, error } = await admin.from('scribe_entries').select('id, title').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const draft = typeof body.draft_text === 'string' && body.draft_text.trim()
    ? body.draft_text
    : await workingDraftForEntry(admin, id)
  if (!draft) return NextResponse.json({ error: 'There is no draft to check yet' }, { status: 400 })

  try {
    const found = await chapterForEntry(admin, id)
    const report = await runFactCheck(
      admin,
      { entryId: id, bookId: found?.book.id ?? null, chapterId: found?.chapter.id ?? null },
      draft,
      found?.chapter.title ?? (entry.title as string | null)
    )
    return NextResponse.json(report)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Fact check failed'
    console.error('[scribe/factcheck]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

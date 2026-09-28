import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { countWords } from '@/lib/scribe/book-draft'
import { attachEntryAsChapter, createChapter, loadBook, nextPosition, reindexChapter, reorderChapters, workingDraftForEntry } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/books/[id]/chapters — { title, text? }: one new
// chapter at the end. With text it is indexed; without, it is a blank
// chapter Kyle types into from the chat.
// { entry_id, title? } instead makes an existing conversation the chapter at
// the end (the chat's "Add to book", and a confirmed Scribe proposal).
export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  if (typeof body.entry_id === 'string' && body.entry_id) {
    try {
      const admin = createAdminClient()
      if (!(await loadBook(admin, id))) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      const chapter = await attachEntryAsChapter(admin, id, body.entry_id, title || undefined)
      // Index now so search_book finds it on the next turn; the summary waits
      // for the book view's refresh. A failed index only leaves it stale.
      const draft = await workingDraftForEntry(admin, body.entry_id)
      if (draft) {
        await reindexChapter(admin, chapter, draft).catch(e =>
          console.warn('[scribe/books/chapters] index after attach failed:', e instanceof Error ? e.message : e)
        )
      }
      return NextResponse.json({ chapter })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add the conversation'
      return NextResponse.json({ error: message }, { status: /already chapter/.test(message) ? 409 : 500 })
    }
  }
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  const text = typeof body.text === 'string' ? body.text.replace(/\r\n?/g, '\n').trim() : ''
  try {
    const admin = createAdminClient()
    if (!(await loadBook(admin, id))) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    const chapter = await createChapter(admin, id, { title, text: text || `# ${title}\n\n[YOUR TURN: the first draft of this chapter]`, words: countWords(text) }, await nextPosition(admin, id))
    if (text) await reindexChapter(admin, chapter, text)
    return NextResponse.json({ chapter })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to add the chapter' }, { status: 500 })
  }
}

// PATCH /api/admin/scribe/books/[id]/chapters — { order: [chapterId, ...] }.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body.order) || !body.order.every((x: unknown) => typeof x === 'string')) {
    return NextResponse.json({ error: 'Missing order' }, { status: 400 })
  }
  try {
    const admin = createAdminClient()
    await reorderChapters(admin, id, body.order)
    const loaded = await loadBook(admin, id)
    return NextResponse.json({ chapters: loaded?.chapters ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Reorder failed' }, { status: 500 })
  }
}

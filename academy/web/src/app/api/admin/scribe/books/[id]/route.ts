import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { listFindings, loadBook } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/admin/scribe/books/[id] — the book, its chapters in order, and
// every finding on it or on any of its chapters.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  try {
    const admin = createAdminClient()
    const loaded = await loadBook(admin, id)
    if (!loaded) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    const findings = await listFindings(admin, { bookId: id })
    return NextResponse.json({ ...loaded, findings })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load the book' }, { status: 500 })
  }
}

// PATCH /api/admin/scribe/books/[id] — { title?, status?, summary?, argument? }.
// A summary edited here by hand is stored as given; the next refresh rebuilds
// it only from chapter summaries, which is what a hand edit is for.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 200)
  if (['drafting', 'revising', 'settled', 'archived'].includes(body.status)) patch.status = body.status
  if (typeof body.summary === 'string') patch.summary = body.summary.trim() || null
  if (body.argument && typeof body.argument === 'object') patch.argument = body.argument
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  patch.updated_at = new Date().toISOString()
  const { data, error } = await createAdminClient().from('scribe_books').update(patch).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ book: data })
}

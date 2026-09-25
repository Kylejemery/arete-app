import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { refreshBook } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'
// A few chapters' embeddings and summaries per call.
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/books/[id]/refresh — { limit? }. Reindexes and
// resummarises up to `limit` stale chapters and reports how many remain; the
// book view calls it until remaining is 0, at which point the book summary
// has been rebuilt too.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const limit = Number.isInteger(body.limit) && body.limit > 0 ? Math.min(body.limit, 10) : 3
  try {
    const result = await refreshBook(createAdminClient(), id, limit)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Refresh failed'
    console.error('[scribe/books/refresh]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
